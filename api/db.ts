// api/db.ts - Simplified to use DATABASE_URL directly

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
// Ensure schema import uses the .js extension
import * as schema from './db/schema.js'; 

// Verify DATABASE_URL is set in the environment
if (!process.env.DATABASE_URL) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
  // Throwing an error here will prevent the function from starting improperly
  throw new Error("DATABASE_URL environment variable is not set"); 
}

// Create the connection pool using the DATABASE_URL connection string
// SSL configuration is typically handled within the connection string provided by Neon
const pool = new pg.Pool({
  connectionString: "postgres://neondb_owner:npg_zuHosQyVC8Y4@ep-square-river-a8lg22xl.eastus2.azure.neon.tech/neondb?sslmode=require", 
  // You might consider slightly increasing the connection timeout if needed
  connectionTimeoutMillis: 15000, // e.g., 15 seconds 

  // Standard pool settings (adjust as needed based on expected load)
  max: 10, // Max connections per instance (consider Vercel function concurrency)
  idleTimeoutMillis: 30000, // 30 seconds
  allowExitOnIdle: true // Allows pool to close idle clients to potentially save resources
});

// Add an error handler for the connection pool
pool.on('error', (err) => {
  console.error('Database Pool Error:', err);
  // Log the error, but don't necessarily exit in production serverless environment
});

// Export the Drizzle instance for use in other modules
export const db = drizzle(pool, { schema });

console.log('Database pool initialized using DATABASE_URL.'); // Log successful initialization

// --- Optional Health Check ---
// This function can be called manually if needed, but the periodic check below might be less useful in serverless
export async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect(); // Attempt to get a client from the pool
    await client.query('SELECT 1'); // Simple query to test connection
    console.log('Database connection check successful.');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release(); // Always release the client back to the pool
    }
  }
}

// --- Periodic Health Check (Consider if truly needed in Serverless) ---
// This setInterval will run within a specific function instance.
// Multiple instances might run this concurrently. It might not prevent
// connection issues on *new* invocations if the underlying problem exists.
// Commenting out for now, focus on initial connection first. If connection
// drops during the lifetime of a warm function, this *might* help log it.

/*
let isCheckRunning = false; // Simple flag to avoid overlapping checks
const healthCheckInterval = 60000; // Check every 60 seconds

setInterval(async () => {
  if (isCheckRunning) return; // Prevent overlap
  isCheckRunning = true;
  console.log('Performing periodic database health check...');
  await checkDatabaseConnection();
  isCheckRunning = false; 
}, healthCheckInterval);
*/

// Perform an initial connection check when the module loads (optional)
// This helps catch configuration errors early during cold starts.
checkDatabaseConnection().catch(err => {
  console.error("Initial database connection check failed on module load:", err);
  // Depending on severity, you might want to handle this more drastically,
  // but often letting requests fail might be acceptable if it's transient.
});
