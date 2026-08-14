const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  // Check the partial index exists
  const idx = await pool.query(
    "SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'uq_categories_store_slug_null_parent'"
  );
  console.log('Index:', idx.rows.length ? idx.rows[0].indexdef : 'NOT FOUND');

  // Count uncategorized categories
  const count = await pool.query(
    "SELECT COUNT(*) FROM categories WHERE slug = 'uncategorized' AND parent_id IS NULL"
  );
  console.log('Uncategorized categories:', count.rows[0].count);

  // Count active stores
  const stores = await pool.query("SELECT COUNT(*) FROM stores WHERE is_active = true");
  console.log('Active stores:', stores.rows[0].count);

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
