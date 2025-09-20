import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL || 'postgresql://codevn_user:codevn_password@localhost:5432/codevn',
  },
} satisfies Config;
