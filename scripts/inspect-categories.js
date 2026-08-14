const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const cols = await pool.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'categories' ORDER BY ordinal_position"
  );
  console.log('COLUMNS:');
  cols.rows.forEach(r => console.log(' ', r.column_name, r.data_type, r.is_nullable));

  const cons = await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'categories'::regclass"
  );
  console.log('\nCONSTRAINTS:');
  cons.rows.forEach(r => console.log(' ', r.conname, ':', r.def));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
