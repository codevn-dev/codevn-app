-- Add unique constraint to prevent duplicate conversations
ALTER TABLE "conversations" ADD CONSTRAINT "unique_conversation" UNIQUE ("from_user_id", "to_user_id");
