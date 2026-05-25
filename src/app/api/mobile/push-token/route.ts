import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query } from '@/lib/db'

async function ensurePushTokensTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_push_tokens (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id     UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      firebase_uid TEXT        NOT NULL UNIQUE,
      token        TEXT        NOT NULL,
      platform     TEXT        NOT NULL DEFAULT 'android',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vendor_push_tokens_store
      ON vendor_push_tokens(store_id);
  `);
}

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { token, platform } = await req.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  await ensurePushTokensTable();

  await query(
    `INSERT INTO vendor_push_tokens (store_id, firebase_uid, token, platform, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (firebase_uid) DO UPDATE
       SET token = EXCLUDED.token, platform = EXCLUDED.platform, updated_at = NOW()`,
    [store.id, user.firebaseUid, token, platform ?? 'android']
  )

  return NextResponse.json({ ok: true })
}
