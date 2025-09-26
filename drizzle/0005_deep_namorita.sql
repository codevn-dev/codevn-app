CREATE TABLE "hidden_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"hidden_at" timestamp DEFAULT now() NOT NULL
);
