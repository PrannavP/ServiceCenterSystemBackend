const { Pool } = require('pg');

const pool = new Pool({
  host: '13.232.223.104',
  port: 5432,
  database: 'ServiceCentreDb',
  user: 'servicecenter_user',
  password: 'service_center',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function migrateDb() {
  try {
    const client = await pool.connect();
    console.log('Connected to postgres database.');

    await client.query(`
      ALTER TABLE app.tbl_user
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);
    
    console.log('Migration successful: Added reset_token and reset_token_expires to app.tbl_user.');
    
    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrateDb();
