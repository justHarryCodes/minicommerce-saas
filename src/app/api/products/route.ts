import { NextRequest, NextResponse } from 'next/server'
import { foreignCategory } from '@/lib/tenant'
import { verifySession } from '@/lib/auth'
import { getStoreFor } from "@/lib/access";
import { query, queryOne, withTransaction, rowsToCamel, toCamel } from '@/lib/db'
import { cacheDelPattern } from '@/lib/redis'
import { ensureUncategorized } from '@/lib/categories'
import { slugify } from '@/lib/utils'
import { getEffectivePlan, requireFeature } from '@/lib/plan'
import { z } from 'zod'
import { normalizeVariants, optionNamesSchema, variantInputSchema } from '@/lib/variants'
import { recordMovements } from '@/lib/inventory'
import { SERVICE_STOCK } from '@/lib/booking'
import { parseSizeGuide } from '@/lib/size-guide'

// Variants (sizes, or Size × Colour combos) — see src/lib/variants.ts
const SizeSchema = variantInputSchema

const Schema = z.object({
  name:             z.string().min(1).max(200),
  description:      z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional(),
  price:            z.number().min(0),
  comparePrice:     z.number().min(0).optional(),
  stockQuantity:    z.number().int().min(0).default(0),
  categoryId:       z.string().uuid().optional(),
  subcategoryId:    z.string().uuid().optional(),
  images:           z.array(z.string()).default([]),
  imageUrl:         z.string().optional(),
  isActive:         z.boolean().default(true),
  isFeatured:       z.boolean().default(false),
  sizes:            z.array(SizeSchema).max(100).optional(),
  optionNames:      optionNamesSchema.optional(),
  lowStockThreshold: z.number().int().min(0).max(100000).nullable().optional(),
  isBookable:       z.boolean().optional().default(false),
  durationMinutes:  z.number().int().min(5).max(1440).nullable().optional(),
  sizeGuide:        z.unknown().optional(),
})

export async function GET(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStoreFor(user, "products")
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50))
  const search = searchParams.get('search') ?? ''
  const catId  = searchParams.get('categoryId')
  const offset = (page - 1) * limit

  let sql = `SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.store_id = $1`
  const vals: unknown[] = [store.id]
  let idx = 2

  if (search) { sql += ` AND p.name ILIKE $${idx++}`; vals.push(`%${search}%`) }
  if (catId)  { sql += ` AND p.category_id = $${idx++}`; vals.push(catId) }
  sql += ` ORDER BY p.sort_order, p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
  vals.push(limit, offset)

  const products = await query(sql, vals)
  const [{ count }] = await query('SELECT COUNT(*) FROM products WHERE store_id=$1', [store.id]) as { count: string }[]

  return NextResponse.json({
    data: rowsToCamel(products as Record<string, unknown>[]),
    total: parseInt(count),
    page, limit,
  })
}

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStoreFor(user, "products")
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const effectivePlan = await getEffectivePlan(store.id)
  const [{ count }] = await query('SELECT COUNT(*) FROM products WHERE store_id=$1', [store.id]) as { count: string }[]
  if (parseInt(count) >= effectivePlan.max_products) {
    return NextResponse.json(
      { error: `Your ${effectivePlan.name} plan allows up to ${effectivePlan.max_products} products. Upgrade to add more.` },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  let slug = slugify(d.name)
  const exists = await queryOne('SELECT id FROM products WHERE store_id=$1 AND slug=$2', [store.id, slug])
  if (exists) slug = `${slug}-${Date.now()}`

  const imageUrl = d.imageUrl || d.images[0] || null

  if (d.isBookable) {
    const denied = await requireFeature(store.id, 'bookings')
    if (denied) return denied
  }

  // A product may only sit in this store's own categories
  const badCategory = await foreignCategory(store.id, d.categoryId, d.subcategoryId)
  if (badCategory) return NextResponse.json({ error: badCategory }, { status: 400 })

  // Fall back to Uncategorized when no category is provided
  const categoryId = d.categoryId || await ensureUncategorized(store.id)

  // Sizes drive stock, not the other way around, whenever they're present —
  // product.stock_quantity stays the SUM so every existing consumer of that
  // column (search, discover, reels, bookmarks…) keeps working unmodified.
  const optionNames = d.optionNames ?? []
  // Bookable services have no variants and no stock to run out of
  const normalized = normalizeVariants(optionNames, d.isBookable ? [] : d.sizes ?? [])
  if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 422 })
  const sizes = normalized.variants
  const hasSizes = sizes.length > 0
  const stockQuantity = d.isBookable
    ? SERVICE_STOCK
    : hasSizes
      ? sizes.reduce((sum, s) => sum + s.stockQuantity, 0)
      : d.stockQuantity
  const sizeGuide = parseSizeGuide(d.sizeGuide)

  const product = await withTransaction(async (client) => {
    const rows = await client.query(`
      INSERT INTO products (
        store_id, category_id, subcategory_id, name, slug, description, short_description,
        price, compare_price, stock_quantity, image_url, images, is_active, is_featured, has_sizes,
        option_names, low_stock_threshold, is_bookable, duration_minutes, size_guide
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb) RETURNING *
    `, [
      store.id, categoryId, d.subcategoryId || null, d.name, slug,
      d.description || null, d.shortDescription || null, d.price, d.comparePrice || null,
      stockQuantity, imageUrl, d.images, d.isActive, d.isFeatured, hasSizes,
      hasSizes ? optionNames : [], d.lowStockThreshold ?? null, d.isBookable, d.isBookable ? d.durationMinutes ?? 60 : null,
      sizeGuide ? JSON.stringify(sizeGuide) : null,
    ])
    const row = rows.rows[0]

    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i]
      await client.query(
        `INSERT INTO product_sizes (product_id, label, stock_quantity, sort_order, options, price, image_url, sku)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [row.id, s.label, s.stockQuantity, i, JSON.stringify(s.options), s.price, s.imageUrl, s.sku]
      )
    }

    // Opening stock shows up as the first line of the inventory history
    if (!d.isBookable) await recordMovements(
      client,
      store.id,
      'created',
      hasSizes
        ? sizes.map((s) => ({ productId: row.id, productName: d.name, variantLabel: s.label, change: s.stockQuantity, stockAfter: s.stockQuantity }))
        : [{ productId: row.id, productName: d.name, variantLabel: null, change: stockQuantity, stockAfter: stockQuantity }]
    )

    return row
  })

  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ data: toCamel(product as Record<string, unknown>) }, { status: 201 })
}
