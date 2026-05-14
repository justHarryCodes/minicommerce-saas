import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { query, queryOne, toCamel } from '@/lib/db'
import { z } from 'zod'

const CreateStoreSchema = z.object({
  name:             z.string().min(2).max(100),
  slug:             z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description:      z.string().max(500).optional(),
  logoUrl:          z.string().optional().or(z.literal('')),
  phone:            z.string().max(20).optional(),
  whatsapp:         z.string().max(20).optional(),
  primaryCategory:  z.string().optional(),
  // Accept either paymentMethods array (legacy) or paymentPreference string
  paymentMethods:   z.array(z.string()).optional(),
  paymentPreference:z.enum(['paystack', 'bank_transfer', 'both']).optional(),
  bankName:         z.string().optional(),
  accountNumber:    z.string().optional(),  // legacy key
  accountName:      z.string().optional(),  // legacy key
  bankAccountNumber:z.string().optional(),
  bankAccountName:  z.string().optional(),
  referralCode:     z.string().max(20).optional().nullable(),
})

function derivePaymentPreference(
  methods?: string[],
  preference?: string
): 'paystack' | 'bank_transfer' | 'both' {
  if (preference && ['paystack', 'bank_transfer', 'both'].includes(preference)) {
    return preference as 'paystack' | 'bank_transfer' | 'both'
  }
  if (!methods || methods.length === 0) return 'both'
  const hasPaystack = methods.includes('paystack')
  const hasTransfer = methods.includes('transfer') || methods.includes('bank_transfer')
  if (hasPaystack && hasTransfer) return 'both'
  if (hasPaystack) return 'paystack'
  if (hasTransfer) return 'bank_transfer'
  return 'both'
}

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await queryOne('SELECT id FROM stores WHERE owner_id = $1', [user.firebaseUid])
  if (existing) return NextResponse.json({ error: 'Store already exists' }, { status: 409 })

  const body = await req.json()
  const parsed = CreateStoreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  const slugConflict = await queryOne('SELECT id FROM stores WHERE slug = $1', [d.slug])
  if (slugConflict) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  const paymentPreference = derivePaymentPreference(d.paymentMethods, d.paymentPreference)
  const bankAccountNumber = d.bankAccountNumber || d.accountNumber || null
  const bankAccountName = d.bankAccountName || d.accountName || null

  // Resolve referral code → referrer store id
  let referredByStoreId: string | null = null
  if (d.referralCode) {
    const referrer = await queryOne<{ id: string }>(
      'SELECT id FROM stores WHERE referral_code = $1',
      [d.referralCode.toUpperCase()]
    )
    if (referrer) referredByStoreId = referrer.id
  }

  const rows = await query(`
    INSERT INTO stores (
      owner_id, name, slug, description, logo_url, phone, whatsapp,
      primary_category, payment_preference, bank_name, bank_account_number, bank_account_name,
      referred_by_store_id,
      referral_code
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
      UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 8))
    )
    RETURNING *
  `, [
    user.firebaseUid, d.name, d.slug, d.description || null,
    d.logoUrl || null, d.phone || null, d.whatsapp || null,
    d.primaryCategory || 'other', paymentPreference,
    d.bankName || null, bankAccountNumber, bankAccountName,
    referredByStoreId,
  ])

  const newStore = rows[0] as Record<string, unknown>

  // Record referral signup (rewarded later when setup fee is paid)
  if (referredByStoreId) {
    await query(
      `INSERT INTO referrals (referrer_store_id, referred_store_id, status)
       VALUES ($1, $2, 'signed_up')
       ON CONFLICT DO NOTHING`,
      [referredByStoreId, newStore.id]
    )
  }

  return NextResponse.json({ data: toCamel(newStore) }, { status: 201 })
}

export async function GET() {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await queryOne('SELECT * FROM stores WHERE owner_id = $1', [user.firebaseUid])
  if (!row) return NextResponse.json({ data: null })
  return NextResponse.json({ data: toCamel(row as Record<string, unknown>) })
}
