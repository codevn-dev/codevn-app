import { RoleLevel } from '@/types/shared';
import { pgTable, text, timestamp, uuid, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';

export const userRoleEnum = pgEnum('user_role', [
  RoleLevel.member,
  RoleLevel.admin,
  RoleLevel.system,
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  role: userRoleEnum('role').notNull().default(RoleLevel.member),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull().default('#3B82F6'), // Default blue color
  parentId: uuid('parent_id'),
  order: text('order').notNull().default('0'), // Order for sorting categories
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
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const articleCategories = pgTable('article_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

// Conversations table
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: text('from_user_id').notNull(),
    toUserId: text('to_user_id').notNull(),
    type: text('type', { enum: ['message', RoleLevel.system] })
      .notNull()
      .default('message'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to prevent duplicate conversations between same users
    uniqueConversation: unique('unique_conversation').on(table.fromUserId, table.toUserId),
  })
);

// Hidden conversations table
export const hiddenConversations = pgTable(
  'hidden_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    conversationId: text('conversation_id').notNull(),
    hidden: boolean('hidden').notNull().default(true),
    hiddenAt: timestamp('hidden_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to prevent duplicate hidden conversation records
    uniqueHiddenConversation: unique('unique_hidden_conversation').on(
      table.userId,
      table.conversationId
    ),
  })
);

// Conversation messages table (renamed from messages)
export const conversationsMessages = pgTable('conversations_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: text('conversation_id').notNull(),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  text: text('text').notNull(), // Encrypted message content
  iv: text('iv').notNull(), // Initialization Vector for AES-GCM
  tag: text('tag').notNull(), // Authentication tag for AES-GCM
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
  conversations: many(conversations),
  hiddenConversations: many(hiddenConversations),
  conversationsMessages: many(conversationsMessages),
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
  articleCategories: many(articleCategories),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  articleCategories: many(articleCategories),
  comments: many(comments),
  reactions: many(reactions),
}));

export const articleCategoriesRelations = relations(articleCategories, ({ one }) => ({
  article: one(articles, {
    fields: [articleCategories.articleId],
    references: [articles.id],
  }),
  category: one(categories, {
    fields: [articleCategories.categoryId],
    references: [categories.id],
  }),
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

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  fromUser: one(users, {
    fields: [conversations.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [conversations.toUserId],
    references: [users.id],
  }),
  messages: many(conversationsMessages),
  hiddenConversations: many(hiddenConversations),
}));

export const hiddenConversationsRelations = relations(hiddenConversations, ({ one }) => ({
  user: one(users, {
    fields: [hiddenConversations.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [hiddenConversations.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationsMessagesRelations = relations(conversationsMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationsMessages.conversationId],
    references: [conversations.id],
  }),
  fromUser: one(users, {
    fields: [conversationsMessages.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [conversationsMessages.toUserId],
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
