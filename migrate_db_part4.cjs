require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://servicecenter_user:service_center@13.232.223.104:5432/ServiceCentreDb"
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log("Starting Phase 4 DB Migration: Multi-Tenancy (CMS)...");
        await client.query("BEGIN");

        // 0. Ensure app.tbl_user has a primary key on id
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'app.tbl_user'::regclass AND contype = 'p') THEN
                    ALTER TABLE app.tbl_user ADD PRIMARY KEY (id);
                END IF;
            END $$;
        `);

        // 1. Add service_center_id to tbl_jobcard
        await client.query(`
            ALTER TABLE app.tbl_jobcard 
            ADD COLUMN IF NOT EXISTS service_center_id INT;
        `);
        // Backfill with ID 1 (Admin)
        await client.query(`UPDATE app.tbl_jobcard SET service_center_id = 1 WHERE service_center_id IS NULL;`);

        // 2. Add service_center_id to tbl_part
        await client.query(`
            ALTER TABLE inv.tbl_part 
            ADD COLUMN IF NOT EXISTS service_center_id INT;
        `);
        await client.query(`UPDATE inv.tbl_part SET service_center_id = 1 WHERE service_center_id IS NULL;`);

        // 3. Add service_center_id to tbl_receipt
        await client.query(`
            ALTER TABLE inv.tbl_receipt 
            ADD COLUMN IF NOT EXISTS service_center_id INT;
        `);
        await client.query(`UPDATE inv.tbl_receipt SET service_center_id = 1 WHERE service_center_id IS NULL;`);

        // 4. Add service_center_id to tbl_bill
        await client.query(`
            ALTER TABLE app.tbl_bill 
            ADD COLUMN IF NOT EXISTS service_center_id INT;
        `);
        await client.query(`UPDATE app.tbl_bill SET service_center_id = 1 WHERE service_center_id IS NULL;`);

        await client.query("COMMIT");
        console.log("Migration successful: Added multi-tenancy columns to core tables.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
