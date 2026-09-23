// ─── PostgreSQL connection pool ──────────────────────────────────
import { Pool, PoolClient } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.')
}

declare global {
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Set DATABASE_SSL=true in env if your Postgres host requires SSL (e.g. Neon, Supabase)
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Kept conservative (not the node-postgres default of 10, and well below
    // the old value of 20) because this pool is no longer guaranteed to be
    // the only one alive against the database — see the comment on
    // `export const pool` below for why serverless hosting (Vercel) can run
    // many of these concurrently, each with its own pool, against a single
    // Postgres instance that has a fixed max_connections ceiling.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
    // Without this, a NAT gateway/firewall/load balancer sitting between
    // this app and DATABASE_URL's host can silently close an idle pooled
    // connection without either side noticing — the pool still considers
    // it live, hands it out for the next query, and that query fails with
    // "Connection terminated unexpectedly" (reproduced this exact error
    // against the real DB: a single fresh connection succeeded instantly,
    // meaning the DB itself was fine — the pool was holding a connection
    // that had gone stale in the background). TCP keepalive pings the
    // connection periodically so dead ones get detected and recycled
    // instead of silently handed out.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })

  // node-postgres emits 'error' on the pool itself when an *idle* client
  // hits a background error (the exact failure mode above) — with nothing
  // listening, that's an unhandled error event, not a rejected query
  // promise, which is why it showed up as confusing duplicate
  // process-level output rather than a clean caught error. This does not
  // replace error handling on individual queries; it only stops idle
  // connection failures from going unhandled.
  p.on('error', (err) => {
    console.error('[DB] Idle client error (pool recovers automatically):', err.message)
  })

  return p
}

// Always reuse a cached pool via `global`, in every environment — this used
// to be dev-only (`NODE_ENV === 'development' ? cached : createPool()`),
// which was harmless on a traditional long-running Node server (this module
// is only ever evaluated once there) but is a real problem on serverless
// hosting (Vercel): every cold invocation re-evaluates this module and, with
// the old code, unconditionally built a brand new Pool of up to 20
// connections that was never cleaned up between invocations. Under any real
// concurrent traffic that's many pools stacking up against one Postgres
// instance's fixed max_connections, and once that's exhausted every new
// connection attempt hangs or fails — which reads exactly like "the site
// crashes under load" (confirmed live: DB-querying pages were 500ing/timing
// out in production while pages that don't touch the database were fine).
// `global` caching at least keeps a *warm* serverless instance reusing the
// same pool across its own invocations rather than opening a fresh one
// every time; it can't fully prevent multiple concurrent cold instances from
// each holding their own pool, which is why `max` above is also kept small.
export const pool: Pool = (global._pgPool ??= createPool())

// ─── Query helpers ────────────────────────────────────────────────
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now()
  const res = await pool.query(text, params)
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB]', { query: text.slice(0, 80), ms: Date.now() - start, rows: res.rowCount })
  }
  return res.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Row-to-camelCase mapper ──────────────────────────────────────
export function toCamel<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ])
  ) as T
}

export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => toCamel<T>(r))
}

export const queryMany = query
