import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Parse connection details from environment variables
const connectionConfig = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === 'require',
};

const pool = new pg.Pool({
  ...connectionConfig,
  // Optimized production connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500

});

// Add connection error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Export the drizzle instance with the node-postgres adapter
export const db = drizzle(pool, { schema });

// Add connection health check
export async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Add periodic health check
setInterval(async () => {
  const isHealthy = await checkDatabaseConnection();
  if (!isHealthy && process.env.NODE_ENV === 'production') {
    console.error('Database connection unhealthy, attempting to reconnect...');
  }
}, 30000);