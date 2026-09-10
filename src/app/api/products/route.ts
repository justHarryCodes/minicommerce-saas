import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne, withTransaction, rowsToCamel, toCamel } from '@/lib/db'
import { cacheDelPattern } from '@/lib/redis'
import { ensureUncategorized } from '@/lib/categories'
import { slugify } from '@/lib/utils'
import { getEffectivePlan } from '@/lib/plan'
import { z } from 'zod'

const SizeSchema = z.object({
  label:         z.string().min(1).max(50),
  stockQuantity: z.number().int().min(0).default(0),
})

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
  sizes:            z.array(SizeSchema).optional(),
})

export async function GET(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
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
  const store = await getUserStore(user.firebaseUid)
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

  // Fall back to Uncategorized when no category is provided
  const categoryId = d.categoryId || await ensureUncategorized(store.id)

  // Sizes drive stock, not the other way around, whenever they're present —
  // product.stock_quantity stays the SUM so every existing consumer of that
  // column (search, discover, reels, bookmarks…) keeps working unmodified.
  const sizes = (d.sizes ?? []).filter((s) => s.label.trim().length > 0)
  const hasSizes = sizes.length > 0
  const stockQuantity = hasSizes
    ? sizes.reduce((sum, s) => sum + s.stockQuantity, 0)
    : d.stockQuantity

  const product = await withTransaction(async (client) => {
    const rows = await client.query(`
      INSERT INTO products (
        store_id, category_id, subcategory_id, name, slug, description, short_description,
        price, compare_price, stock_quantity, image_url, images, is_active, is_featured, has_sizes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [
      store.id, categoryId, d.subcategoryId || null, d.name, slug,
      d.description || null, d.shortDescription || null, d.price, d.comparePrice || null,
      stockQuantity, imageUrl, d.images, d.isActive, d.isFeatured, hasSizes
    ])
    const row = rows.rows[0]

    for (let i = 0; i < sizes.length; i++) {
      await client.query(
        `INSERT INTO product_sizes (product_id, label, stock_quantity, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [row.id, sizes[i].label, sizes[i].stockQuantity, i]
      )
    }

    return row
  })

  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ data: toCamel(product as Record<string, unknown>) }, { status: 201 })
}
