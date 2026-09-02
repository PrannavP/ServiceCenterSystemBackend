const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '13.232.223.104',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ServiceCentreDb',
    user: process.env.DB_USER || 'servicecenter_user',
    password: process.env.DB_PASSWORD || 'service_center',
    ssl: { rejectUnauthorized: false }
});

const migrate = async () => {
    try {
        console.log("Adding force_password_change column to app.tbl_user...");
        await pool.query(`
            ALTER TABLE app.tbl_user 
            ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
        `);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
};

migrate();
