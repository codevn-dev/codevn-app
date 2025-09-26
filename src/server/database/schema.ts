import { pgTable, text, timestamp, uuid, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull().default('#3B82F6'), // Default blue color
  parentId: uuid('parent_id'),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  slug: text('slug').notNull().unique(),
  thumbnail: text('thumbnail'), // URL to thumbnail image
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  parentId: uuid('parent_id'), // For nested comments - will be set up in relations
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const reactionTypeEnum = pgEnum('reaction_type', ['like', 'unlike']);

export const reactions = pgTable('reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').references(() => articles.id),
  commentId: uuid('comment_id').references(() => comments.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: reactionTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chat messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(), // userA|userB format
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  text: text('text').notNull(), // Encrypted message content
  iv: text('iv').notNull(), // Initialization Vector for AES-GCM
  tag: text('tag').notNull(), // Authentication tag for AES-GCM
  type: text('type', { enum: ['message', 'system'] })
    .notNull()
    .default('message'),
  seen: boolean('seen').notNull().default(false),
  seenAt: timestamp('seen_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
  comments: many(comments),
  reactions: many(reactions),
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [categories.createdById],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parentChild',
  }),
  children: many(categories, {
    relationName: 'parentChild',
  }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentParent',
  }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  article: one(articles, {
    fields: [reactions.articleId],
    references: [articles.id],
  }),
  comment: one(comments, {
    fields: [reactions.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
  }),
}));

// Article views table for analytics and unique view tracking
export const articleViews = pgTable('articles_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  countryCode: text('country_code'),
  device: text('device'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const articleViewsRelations = relations(articleViews, ({ one }) => ({
  article: one(articles, {
    fields: [articleViews.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [articleViews.userId],
    references: [users.id],
  }),
}));
