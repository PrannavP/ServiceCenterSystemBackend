const { Pool } = require('pg');

const pool = new Pool({
  host: '13.232.223.104',
  port: 5432,
  database: 'postgres',
  user: 'servicecenter_user',
  password: 'service_center',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function createDb() {
  try {
    const client = await pool.connect();
    console.log('Connected to postgres database.');

    const check = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'service_center_db_v2'"
    );

    if (check.rows.length > 0) {
      console.log('Database "service_center_db_v2" already exists.');
    } else {
      await client.query('CREATE DATABASE service_center_db_v2');
      console.log('Database "service_center_db_v2" created successfully!');
    }

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createDb();
