require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await pool.query("ALTER TYPE app.user_type ADD VALUE IF NOT EXISTS 'service_center';");
        await pool.query("UPDATE app.tbl_user SET user_type = 'service_center' WHERE user_type = 'front_office';");
        console.log("Enum updated successfully.");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
