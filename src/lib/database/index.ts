import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://codevn_user:codevn_password@localhost:5432/codevn';

// Create a singleton client to avoid too many connections
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getDb = () => {
  if (!client) {
    try {
      client = postgres(connectionString, {
        max: 50, // 50% of PostgreSQL max_connections=100 for safety
        idle_timeout: 5, // Close idle connections after 5 seconds
        connect_timeout: 3, // Connection timeout
        max_lifetime: 60 * 10, // Close connections after 10 minutes
        prepare: false, // Disable prepared statements to reduce connection usage
        transform: {
          undefined: null, // Transform undefined to null
        },
        onnotice: (notice) => {
          console.log('Database notice:', notice);
        },
      });
      db = drizzle(client, { schema });
    } catch (error) {
      console.error('Failed to create database connection:', error);
      // Reset client on error to force reconnection
      client = null;
      db = null;
      throw error;
    }
  }
  return db!;
};

// Function to close database connections
export const closeDb = async () => {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
};

// Function to reset database connection
export const resetDb = () => {
  client = null;
  db = null;
};

// Wrapper function with retry logic for database operations
export const withDbRetry = async <T>(
  operation: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  maxRetries = 3
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = getDb();
      return await operation(db);
    } catch (error) {
      lastError = error as Error;
      console.error(`Database operation attempt ${attempt} failed:`, error);

      // If it's a connection error, reset the client
      if (
        error instanceof Error &&
        (error.message.includes('too many clients') ||
          error.message.includes('connection') ||
          error.message.includes('timeout'))
      ) {
        resetDb();
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  throw lastError || new Error('Database operation failed after all retries');
};

// For backward compatibility
export { getDb as db };
