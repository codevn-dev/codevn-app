// Load environment variables FIRST before any other imports
import { config as loadEnv } from 'dotenv';
loadEnv();

import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/server/database/schema';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(index: number): string {
  const firstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Casey',
    'Morgan',
    'Riley',
    'Avery',
    'Quinn',
    'Blake',
    'Cameron',
    'Drew',
    'Emery',
    'Finley',
    'Hayden',
    'Jamie',
    'Kendall',
    'Logan',
    'Parker',
    'Reese',
    'Sage',
    'Skyler',
    'Sydney',
    'Tatum',
    'River',
    'Phoenix',
    'Rowan',
    'Sage',
    'Aspen',
    'Cedar',
    'Willow',
    'Brook',
    'Dale',
    'Lane',
    'Meadow',
    'Forest',
    'Ocean',
    'Sky',
    'Storm',
    'Rain',
    'Sunny',
    'Autumn',
    'Winter',
    'Spring',
    'Summer',
    'Dawn',
    'Dusk',
    'Midnight',
    'Noon',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Perez',
    'Thompson',
    'White',
    'Harris',
    'Sanchez',
    'Clark',
    'Ramirez',
    'Lewis',
    'Robinson',
    'Walker',
    'Young',
    'Allen',
    'King',
    'Wright',
    'Scott',
    'Torres',
    'Nguyen',
    'Hill',
    'Flores',
    'Green',
    'Adams',
    'Nelson',
    'Baker',
    'Hall',
    'Rivera',
    'Campbell',
    'Mitchell',
  ];
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

let client: postgres.Sql | null = null;

async function main() {
  // Build connection string with loaded environment variables
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DB || 'codevn';
  const username = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'password';
  const ssl = process.env.POSTGRES_SSL === 'true' ? '?sslmode=require' : '';

  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}${ssl}`;

  console.log('Connecting to:', connectionString.replace(/:\/\/.*@/, '://***:***@'));

  client = postgres(connectionString);
  const db = drizzle(client, { schema: { users } });

  const totalArg = process.argv.find((arg) => /^--total=/.test(arg));
  const total = totalArg ? parseInt(totalArg.split('=')[1], 10) : 1000;
  const passwordPlain = 'Password123!';
  const hashed = await bcrypt.hash(passwordPlain, 10);

  const records = Array.from({ length: total }).map((_, i) => {
    const idx = i + 1;
    const name = generateName(idx);
    const email = `mock_${idx}@codevn.dev`;

    return {
      email,
      name,
      password: hashed,
      role: 'member' as const,
      avatar: null,
    };
  });

  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    // Use on conflict do nothing to allow reruns without failing on unique constraints
    // drizzle-orm postgres-js supports .onConflictDoNothing({ target: users.email })
    // but type helpers can vary; fallback to raw if needed.
    await db.insert(users).values(chunk).onConflictDoNothing({ target: users.email });
    inserted += chunk.length;
    // eslint-disable-next-line no-console
    console.log(`Inserted ${Math.min(inserted, records.length)} / ${records.length}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Seeded up to ${records.length} mock users (skipped existing by email).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    // Close database connection
    if (client) {
      client.end();
    }
  });
