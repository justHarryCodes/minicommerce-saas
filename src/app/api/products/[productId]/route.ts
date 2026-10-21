import { NextRequest, NextResponse } from 'next/server'
import { requireFeature } from '@/lib/plan'
import { foreignCategory } from '@/lib/tenant'
import { verifySession } from '@/lib/auth'
import { getStoreFor } from "@/lib/access";
import { query, queryOne, queryMany, withTransaction, toCamel, rowsToCamel } from '@/lib/db'
import { cacheDelPattern } from '@/lib/redis'
import { z } from 'zod'
import { normalizeVariants, optionNamesSchema, variantInputSchema, type NormalizedVariant } from '@/lib/variants'
import { recordMovements } from '@/lib/inventory'
import { notifyBackInStock } from '@/lib/stock-alerts'
import { SERVICE_STOCK } from '@/lib/booking'
import { lagosParts } from '@/lib/hours'
import { parseSizeGuide } from '@/lib/size-guide'

type Params = { params: Promise<{ productId: string }> }

const SizeSchema = variantInputSchema

export async function GET(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStoreFor(user, "products")
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  const row = await queryOne('SELECT * FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sizes = await queryMany(
    'SELECT * FROM product_sizes WHERE product_id=$1 ORDER BY sort_order, created_at',
    [productId]
  )
  return NextResponse.json({
    data: {
      ...toCamel<Record<string, unknown>>(row as Record<string, unknown>),
      sizes: rowsToCamel(sizes as Record<string, unknown>[]),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStoreFor(user, "products")
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  const body = await req.json()

  // Sizes/variants are handled separately from the generic column-patch
  // below since they live in their own table — replace-all semantics on
  // every PATCH that includes a `sizes` key, keeping has_sizes/stock in sync.
  let sizesPatch: NormalizedVariant[] | undefined
  if ('optionNames' in body) {
    const names = optionNamesSchema.safeParse(body.optionNames ?? [])
    if (!names.success) return NextResponse.json({ error: 'Invalid option names' }, { status: 422 })
    body.optionNames = names.data
  }
  // A product may only sit in this store's own categories
  if ('categoryId' in body || 'subcategoryId' in body) {
    const badCategory = await foreignCategory(store.id, body.categoryId, body.subcategoryId)
    if (badCategory) return NextResponse.json({ error: badCategory }, { status: 400 })
  }
  // Services: no variants, and stock pinned so they never "sell out"
  if ('isBookable' in body) {
    body.isBookable = body.isBookable === true
    if (body.isBookable) {
      const denied = await requireFeature(store.id, 'bookings')
      if (denied) return denied
      body.sizes = []
      body.optionNames = []
      body.stockQuantity = SERVICE_STOCK
      body.durationMinutes = Math.min(1440, Math.max(5, Math.round(Number(body.durationMinutes) || 60)))
    } else {
      body.durationMinutes = null
    }
  } else if ('durationMinutes' in body) {
    body.durationMinutes = body.durationMinutes == null ? null : Math.min(1440, Math.max(5, Math.round(Number(body.durationMinutes) || 60)))
  }
  // "Sold out today" — the dashboard sends 'today' or null
  if ('soldOutUntil' in body) {
    body.soldOutUntil = body.soldOutUntil === 'today' ? lagosParts(new Date()).date : null
  }
  if ('sizeGuide' in body) {
    const g = parseSizeGuide(body.sizeGuide)
    body.sizeGuide = g ? JSON.stringify(g) : null
  }
  if ('lowStockThreshold' in body) {
    const t = body.lowStockThreshold
    body.lowStockThreshold = t === null || t === '' || t === undefined ? null : Math.max(0, Math.round(Number(t) || 0))
  }
  if ('sizes' in body) {
    const parsed = z.array(SizeSchema).max(100).safeParse(body.sizes)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid sizes' }, { status: 422 })
    const normalized = normalizeVariants(Array.isArray(body.optionNames) ? body.optionNames : [], parsed.data)
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 422 })
    sizesPatch = normalized.variants
    if (!sizesPatch.length) body.optionNames = []
    delete body.sizes
    delete body.hasSizes
    delete body.has_sizes
    body.hasSizes = sizesPatch.length > 0
    // Sizes drive stock only while they're actually in use — turning sizes
    // off falls back to whatever plain stockQuantity the client sent (its
    // own field stays editable in that case), rather than zeroing stock out.
    if (sizesPatch.length > 0) {
      delete body.stockQuantity
      delete body.stock_quantity
      body.stockQuantity = sizesPatch.reduce((sum, s) => sum + s.stockQuantity, 0)
    }
  }

  const allowed = ['name', 'description', 'short_description', 'price', 'compare_price',
    'stock_quantity', 'category_id', 'subcategory_id', 'image_url', 'images', 'is_active',
    'is_featured', 'sort_order', 'has_sizes', 'option_names', 'low_stock_threshold',
    'is_bookable', 'duration_minutes', 'sold_out_until', 'size_guide', 'brand', 'gtin', 'google_category']

  // Catalog fields (Sales channels): short plain strings, GTIN digits only
  for (const [key, max] of [['brand', 70], ['googleCategory', 200]] as const) {
    if (key in body) body[key] = typeof body[key] === 'string' && body[key].trim() ? String(body[key]).trim().slice(0, max) : null
  }
  if ('gtin' in body) {
    const g = typeof body.gtin === 'string' ? body.gtin.replace(/D/g, '') : ''
    body.gtin = /^d{8,14}$/.test(g) ? g : null
  }

  // Stock before the edit, to log what changed in the inventory history
  const beforeProduct = await queryOne<{ name: string; stock_quantity: number; has_sizes: boolean; is_bookable?: boolean }>(
    'SELECT name, stock_quantity, has_sizes, is_bookable FROM products WHERE id=$1 AND store_id=$2',
    [productId, store.id]
  )
  if (!beforeProduct) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const beforeSizes = new Map(
    (await queryMany<{ label: string; stock_quantity: number }>(
      'SELECT label, stock_quantity FROM product_sizes WHERE product_id=$1', [productId]
    )).map((s) => [s.label, s.stock_quantity])
  )
  const sets: string[] = []; const vals: unknown[] = []; let i = 1

  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`)
    if (allowed.includes(col)) { sets.push(`${col}=$${i++}`); vals.push(val) }
  }
  if (!sets.length && !sizesPatch) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const restocked: { variantLabel: string | null; stockAfter: number | null; change: number }[] = []
  const product = await withTransaction(async (client) => {
    let row: Record<string, unknown> | undefined

    if (sets.length) {
      sets.push(`updated_at = NOW()`)
      const rows = await client.query(
        `UPDATE products SET ${sets.join(',')} WHERE id=$${i++} AND store_id=$${i} RETURNING *`,
        [...vals, productId, store.id]
      )
      row = rows.rows[0]
    } else {
      const rows = await client.query('SELECT * FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
      row = rows.rows[0]
    }
    if (!row) return null

    if (sizesPatch) {
      await client.query('DELETE FROM product_sizes WHERE product_id=$1', [productId])
      for (let idx = 0; idx < sizesPatch.length; idx++) {
        const s = sizesPatch[idx]
        await client.query(
          `INSERT INTO product_sizes (product_id, label, stock_quantity, sort_order, options, price, image_url, sku)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
          [productId, s.label, s.stockQuantity, idx, JSON.stringify(s.options), s.price, s.imageUrl, s.sku]
        )
      }
    }

    // Inventory history: what the merchant changed by hand
    const name = String(row.name ?? beforeProduct.name)
    const changes = sizesPatch
      ? sizesPatch.length
        ? sizesPatch.map((s) => ({
            productId, productName: name, variantLabel: s.label,
            change: s.stockQuantity - (beforeSizes.get(s.label) ?? 0), stockAfter: s.stockQuantity,
          }))
        : [{ productId, productName: name, variantLabel: null,
            change: Number(row.stock_quantity) - (beforeProduct.has_sizes ? [...beforeSizes.values()].reduce((a, b) => a + b, 0) : beforeProduct.stock_quantity),
            stockAfter: Number(row.stock_quantity) }]
      : !beforeProduct.has_sizes && row.stock_quantity !== undefined
        ? [{ productId, productName: name, variantLabel: null, change: Number(row.stock_quantity) - beforeProduct.stock_quantity, stockAfter: Number(row.stock_quantity) }]
        : []
    // Services have no real stock — nothing to log
    if (!row.is_bookable && !beforeProduct.is_bookable) {
      await recordMovements(client, store.id, 'manual', changes)
      // Back from zero → tell the shoppers who asked to be notified
      restocked.push(...changes.filter((c) => (c.stockAfter ?? 0) > 0 && (c.stockAfter ?? 0) - c.change <= 0))
    }

    return row
  })

  for (const r of restocked) void notifyBackInStock(store.id, productId, r.variantLabel)

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ data: toCamel(product) })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStoreFor(user, "products")
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  await query('DELETE FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ ok: true })
}
