// Load environment variables FIRST before any other imports
import { config as loadEnv } from 'dotenv';
loadEnv();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { articles, categories, users, articleCategories } from '../src/server/database/schema';

type Db = ReturnType<
  typeof drizzle<{
    articles: typeof articles;
    categories: typeof categories;
    users: typeof users;
    articleCategories: typeof articleCategories;
  }>
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
  const baseCategories = [
    {
      name: 'JavaScript',
      color: '#f59e0b',
      subCategories: ['ES6+', 'Node.js', 'DOM Manipulation', 'Async Programming', 'Frameworks'],
    },
    {
      name: 'TypeScript',
      color: '#2563eb',
      subCategories: ['Advanced Types', 'Generics', 'Decorators', 'Modules', 'Tooling'],
    },
    {
      name: 'React',
      color: '#22c55e',
      subCategories: ['Hooks', 'State Management', 'Performance', 'Testing', 'Next.js'],
    },
    {
      name: 'Backend',
      color: '#9333ea',
      subCategories: ['API Design', 'Database', 'Authentication', 'Microservices', 'Caching'],
    },
    {
      name: 'DevOps',
      color: '#ef4444',
      subCategories: ['Docker', 'Kubernetes', 'CI/CD', 'Monitoring', 'Infrastructure'],
    },
  ];

  // Create parent categories
  const parentRows = baseCategories.map((c) => ({
    id: randomUUID(),
    name: c.name,
    slug: slugify(c.name),
    color: c.color,
    parentId: null,
    createdById: pick(authorIds),
  }));

  await (db as any)
    .insert(categories)
    .values(parentRows)
    .onConflictDoNothing({ target: categories.slug });

  // Get parent category IDs
  const allCategories = await (db as any)
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories);

  const parentResults = allCategories.filter((c: any) => !c.parentId);

  // Create sub categories
  const subCategoryRows: any[] = [];

  for (const parent of parentResults) {
    const parentData = baseCategories.find((c) => c.name === parent.name);
    if (parentData && parentData.subCategories) {
      for (const subName of parentData.subCategories) {
        subCategoryRows.push({
          id: randomUUID(),
          name: subName,
          slug: slugify(`${parent.name}-${subName}`),
          color: parentData.color,
          parentId: parent.id,
          createdById: pick(authorIds),
        });
      }
    }
  }

  if (subCategoryRows.length > 0) {
    await (db as any)
      .insert(categories)
      .values(subCategoryRows)
      .onConflictDoNothing({ target: categories.slug });
  }
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
  console.log('Creating categories and sub categories...');
  await ensureCategories(db, authorIds);
  console.log('Categories created successfully!');

  const totalArg = process.argv.find((arg) => /^--total=/.test(arg));
  const total = totalArg ? parseInt(totalArg.split('=')[1], 10) : 2000;

  // Fetch category ids (both parent and sub categories)
  const categoryResults = await (db as any)
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  const categoryIds: string[] = categoryResults.map((c: any) => c.id);

  // Log category structure
  const parentCategories = categoryResults.filter((c: any) => !c.parentId);
  const subCategories = categoryResults.filter((c: any) => c.parentId);
  console.log(
    `Created ${parentCategories.length} parent categories and ${subCategories.length} sub categories`
  );

  const shuffledAuthors = shuffle([...authorIds]);

  const records = Array.from({ length: total }).map((_, i) => {
    const idx = i + 1;
    const title = generateTitle(idx);
    const slug = `${slugify(title)}-${randomUUID().slice(0, 8)}`;
    const content = generateContent();
    const authorId = shuffledAuthors[i % shuffledAuthors.length];

    // Randomly choose between sub categories and parent categories
    let categoryId: string;
    if (Math.random() < 0.5 && subCategories.length > 0) {
      // 50% chance: choose from sub categories
      categoryId = (pick(subCategories) as any).id;
    } else {
      // 50% chance: choose from all categories (including parent categories)
      categoryId = pick(categoryIds);
    }

    const published = Math.random() < 0.8;
    const createdAt = randomDateWithin(365);
    return {
      article: {
        title,
        content,
        slug,
        thumbnail: null,
        authorId,
        published,
        createdAt,
      },
      categoryId,
    };
  });

  const chunkSize = 200;
  let inserted = 0;
  const articleCategoryRecords: Array<{ articleId: string; categoryId: string }> = [];

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const articleRecords = chunk.map((r) => r.article);

    // Insert articles and get their IDs
    const insertedArticles = await (db as any)
      .insert(articles)
      .values(articleRecords)
      .onConflictDoNothing({ target: articles.slug })
      .returning({ id: articles.id, slug: articles.slug });

    // Create articleCategories records for the inserted articles
    for (let j = 0; j < insertedArticles.length; j++) {
      const insertedArticle = insertedArticles[j];
      const originalRecord = chunk.find((r) => r.article.slug === insertedArticle.slug);
      if (originalRecord && insertedArticle.id) {
        articleCategoryRecords.push({
          articleId: insertedArticle.id,
          categoryId: originalRecord.categoryId,
        });
      }
    }

    inserted += chunk.length;
    // eslint-disable-next-line no-console
    console.log(`Inserted ${Math.min(inserted, records.length)} / ${records.length} articles`);
  }

  // Insert article-category relationships
  if (articleCategoryRecords.length > 0) {
    console.log(`Creating ${articleCategoryRecords.length} article-category relationships...`);
    const categoryChunkSize = 500;
    for (let i = 0; i < articleCategoryRecords.length; i += categoryChunkSize) {
      const chunk = articleCategoryRecords.slice(i, i + categoryChunkSize);
      await (db as any).insert(articleCategories).values(chunk).onConflictDoNothing();
      console.log(
        `Inserted ${Math.min(i + categoryChunkSize, articleCategoryRecords.length)} / ${articleCategoryRecords.length} relationships`
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Seeded up to ${records.length} articles with category relationships.`);
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
