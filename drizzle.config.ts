import type { Config } from 'drizzle-kit';

// Build connection string from individual environment variables
const buildConnectionString = () => {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DB || 'codevn';
  const username = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'password';
  const ssl = process.env.POSTGRES_SSL === 'true' ? '?sslmode=require' : '';

  return `postgresql://${username}:${password}@${host}:${port}/${database}${ssl}`;
};

export default {
  schema: './src/lib/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: buildConnectionString(),
  },
} satisfies Config;
