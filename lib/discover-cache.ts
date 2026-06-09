import * as SQLite from 'expo-sqlite';
import type { DiscoverReel, DiscoverVendor } from '@/types/discover';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('discover.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS reels (
        id   TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        pos  INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vendors (
        id   TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        pos  INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return db;
}

export function getCachedReels(): DiscoverReel[] {
  try {
    const rows = getDb().getAllSync<{ data: string }>(
      'SELECT data FROM reels ORDER BY pos ASC'
    );
    return rows.map(r => JSON.parse(r.data) as DiscoverReel);
  } catch {
    return [];
  }
}

export function setCachedReels(reels: DiscoverReel[]): void {
  try {
    const database = getDb();
    database.withTransactionSync(() => {
      database.runSync('DELETE FROM reels');
      reels.forEach((reel, i) => {
        database.runSync(
          'INSERT INTO reels (id, data, pos) VALUES (?, ?, ?)',
          reel.id,
          JSON.stringify(reel),
          i
        );
      });
      database.runSync(
        'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
        'last_fetched',
        String(Date.now())
      );
    });
  } catch {
    // cache write failure is non-fatal
  }
}

export function isCacheStale(): boolean {
  try {
    const row = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'last_fetched'"
    );
    if (!row) return true;
    return Date.now() - Number(row.value) > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

export function clearDiscoverCache(): void {
  try {
    const database = getDb();
    database.withTransactionSync(() => {
      database.runSync('DELETE FROM reels');
      database.runSync('DELETE FROM vendors');
      database.runSync('DELETE FROM meta');
    });
  } catch {
    // ignore
  }
}

export function getCachedVendors(): DiscoverVendor[] {
  try {
    const rows = getDb().getAllSync<{ data: string }>(
      'SELECT data FROM vendors ORDER BY pos ASC'
    );
    return rows.map(r => JSON.parse(r.data) as DiscoverVendor);
  } catch {
    return [];
  }
}

export function setCachedVendors(vendors: DiscoverVendor[]): void {
  try {
    const database = getDb();
    database.withTransactionSync(() => {
      database.runSync('DELETE FROM vendors');
      vendors.forEach((vendor, i) => {
        database.runSync(
          'INSERT INTO vendors (id, data, pos) VALUES (?, ?, ?)',
          vendor.store_id,
          JSON.stringify(vendor),
          i
        );
      });
      database.runSync(
        'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
        'vendors_last_fetched',
        String(Date.now())
      );
    });
  } catch {
    // cache write failure is non-fatal
  }
}

export function isVendorCacheStale(): boolean {
  try {
    const row = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'vendors_last_fetched'"
    );
    if (!row) return true;
    return Date.now() - Number(row.value) > CACHE_TTL_MS;
  } catch {
    return true;
  }
}
