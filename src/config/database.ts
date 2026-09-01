import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    
});

export const db = {
    query: <T extends pg.QueryResultRow = any>(
        text: string, 
        params?: any[]
    ): Promise<pg.QueryResult<T>> => {
        return pool.query<T>(text, params);
    },

    transaction: async <T>(
        callback: (client: pg.PoolClient) => Promise<T>
    ): Promise<T> => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const result = await callback(client);

            await client.query('COMMIT');

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};