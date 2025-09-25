// Load environment variables FIRST before any other imports
import { config as loadEnv } from 'dotenv';
loadEnv();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { articles, categories, users } from '../src/server/database/schema';

type Db = ReturnType<
  typeof drizzle<{ articles: typeof articles; categories: typeof categories; users: typeof users }>
>;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomDateWithin(days: number): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(past);
}

function generateTitle(i: number): string {
  const topics = [
    'JavaScript',
    'TypeScript',
    'React',
    'Next.js',
    'Node.js',
    'PostgreSQL',
    'Redis',
    'DevOps',
    'Docker',
    'Kubernetes',
    'CSS',
    'Tailwind',
    'Testing',
    'Performance',
    'Security',
  ];
  const verbs = [
    'Mastering',
    'Understanding',
    'A Practical Guide to',
    'Advanced',
    'Introduction to',
    'Hands-on with',
    'Best Practices for',
    'Scaling',
    'Optimizing',
  ];
  return `${pick(verbs)} ${pick(topics)} #${i}`;
}

function generateContent(): string {
  const paragraphs = [
    'In this article, we explore core concepts with real-world examples and actionable insights.',
    'This guide provides a step-by-step approach that you can apply immediately in your projects.',
    'We will also cover common pitfalls and performance considerations for production systems.',
    'Finally, we conclude with resources and patterns used by experienced engineers day-to-day.',
  ];
  return paragraphs.map((p) => `<p>${p}</p>`).join('\n');
}

let client: postgres.Sql | null = null;

async function getDb(): Promise<Db> {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DB || 'codevn';
  const username = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'password';
  const ssl = process.env.POSTGRES_SSL === 'true' ? '?sslmode=require' : '';
  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}${ssl}`;
  // eslint-disable-next-line no-console
  console.log('Connecting to:', connectionString.replace(/:\/\/.*@/, '://***:***@'));
  client = postgres(connectionString);
  return drizzle(client, { schema: { articles, categories, users } }) as unknown as Db;
}

async function ensureCategories(db: Db, authorIds: string[]) {
  const base = [
    { name: 'JavaScript', color: '#f59e0b' },
    { name: 'TypeScript', color: '#2563eb' },
    { name: 'React', color: '#22c55e' },
    { name: 'Backend', color: '#9333ea' },
    { name: 'DevOps', color: '#ef4444' },
  ];
  const rows = base.map((c) => ({
    id: randomUUID(),
    name: c.name,
    description: `${c.name} articles`,
    slug: slugify(c.name),
    color: c.color,
    parentId: null,
    createdById: pick(authorIds),
  }));

  await (db as any)
    .insert(categories)
    .values(rows)
    .onConflictDoNothing({ target: categories.slug });
}

async function main() {
  const db = await getDb();

  // Get some authors
  const authorResults = await (db as any).select({ id: users.id }).from(users).limit(500);
  const authorIds: string[] = authorResults.map((r: any) => r.id);
  if (authorIds.length === 0) {
    throw new Error('No users found. Seed users first.');
  }

  // Ensure base categories exist
  await ensureCategories(db, authorIds);

  const totalArg = process.argv.find((arg) => /^--total=/.test(arg));
  const total = totalArg ? parseInt(totalArg.split('=')[1], 10) : 2000;

  // Fetch category ids
  const categoryResults = await (db as any).select({ id: categories.id }).from(categories);
  const categoryIds: string[] = categoryResults.map((c: any) => c.id);

  const shuffledAuthors = shuffle([...authorIds]);

  const records = Array.from({ length: total }).map((_, i) => {
    const idx = i + 1;
    const title = generateTitle(idx);
    const slug = `${slugify(title)}-${randomUUID().slice(0, 8)}`;
    const content = generateContent();
    const authorId = shuffledAuthors[i % shuffledAuthors.length];
    const categoryId = pick(categoryIds);
    const published = Math.random() < 0.8;
    const createdAt = randomDateWithin(365);
    return {
      title,
      content,
      slug,
      thumbnail: null,
      categoryId,
      authorId,
      published,
      createdAt,
    };
  });

  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await (db as any).insert(articles).values(chunk).onConflictDoNothing({ target: articles.slug });
    inserted += chunk.length;
    // eslint-disable-next-line no-console
    console.log(`Inserted ${Math.min(inserted, records.length)} / ${records.length}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Seeded up to ${records.length} articles (skipped existing by slug).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    if (client) client.end();
  });
