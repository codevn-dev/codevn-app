-- Create conversations table
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"type" text DEFAULT 'message' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create hidden_conversations table
CREATE TABLE "hidden_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"hidden" boolean DEFAULT true NOT NULL,
	"hidden_at" timestamp DEFAULT now() NOT NULL
);

-- Create conversations_messages table (renamed from messages)
CREATE TABLE "conversations_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"text" text NOT NULL,
	"iv" text NOT NULL,
	"tag" text NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Drop old messages table
DROP TABLE "messages" CASCADE;
