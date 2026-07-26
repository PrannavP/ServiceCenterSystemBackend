import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const db = {
    query: <T extends pg.QueryResultRow = any>(
        text: string, 
        params?: any[]
    ): Promise<pg.QueryResult<T>> => {
        return pool.query<T>(text, params);
    }
};