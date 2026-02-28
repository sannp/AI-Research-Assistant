import { Pool } from 'pg';
import dotenv from 'dotenv';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

dotenv.config();

// Require DATABASE_URL for checkpointer
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for LangGraph checkpointer');
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Recommended settings for serverless connections
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout 
});

// Test the connection on startup
pool.query('SELECT 1')
    .then(() => console.log('[Database] Successfully connected to PostgreSQL'))
    .catch(err => {
        console.error('[Database] Connection error:', err.message);
        if (err.message.includes('ENOTFOUND')) {
            console.error('[Database] DNS Hint: If you are on a network that restricts IPv6, try using the Supabase Connection Pooler hostname instead of the direct address.');
        }
    });

// Create and export the checkpointer instance
export const checkpointer = new PostgresSaver(pool);
