import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://devops_user:devops_password@localhost:5432/devops_forum';

// Create a singleton client to avoid too many connections
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getDb = () => {
  if (!client) {
    client = postgres(connectionString, {
      max: 100, // Maximum number of connections
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout
    });
    db = drizzle(client, { schema });
  }
  return db!;
};

// For backward compatibility
export { getDb as db };
