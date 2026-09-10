import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne, queryMany, withTransaction, toCamel, rowsToCamel } from '@/lib/db'
import { cacheDelPattern } from '@/lib/redis'
import { z } from 'zod'

type Params = { params: Promise<{ productId: string }> }

const SizeSchema = z.object({
  label:         z.string().min(1).max(50),
  stockQuantity: z.number().int().min(0).default(0),
})

export async function GET(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
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
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  const body = await req.json()

  // Sizes are handled separately from the generic column-patch below since
  // they live in their own table — replace-all semantics on every PATCH
  // that includes a `sizes` key, keeping has_sizes/stock_quantity in sync.
  let sizesPatch: z.infer<typeof SizeSchema>[] | undefined
  if ('sizes' in body) {
    const parsed = z.array(SizeSchema).safeParse(body.sizes)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid sizes' }, { status: 422 })
    sizesPatch = parsed.data.filter((s) => s.label.trim().length > 0)
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
    'is_featured', 'sort_order', 'has_sizes']
  const sets: string[] = []; const vals: unknown[] = []; let i = 1

  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`)
    if (allowed.includes(col)) { sets.push(`${col}=$${i++}`); vals.push(val) }
  }
  if (!sets.length && !sizesPatch) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

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
        await client.query(
          `INSERT INTO product_sizes (product_id, label, stock_quantity, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [productId, sizesPatch[idx].label, sizesPatch[idx].stockQuantity, idx]
        )
      }
    }

    return row
  })

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ data: toCamel(product) })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  await query('DELETE FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ ok: true })
}
