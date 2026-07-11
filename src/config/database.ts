import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize the reusable connection pool using environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// similar to Dao.Query()
// Helper function to execute query commands with explicit types
export const db = {
    query: <T extends pg.QueryResultRow = any>(
        text: string, 
        params?: any[]
    ): Promise<pg.QueryResult<T>> => {
        return pool.query<T>(text, params);
    }
};