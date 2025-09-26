-- Add encryption fields to messages table
ALTER TABLE "messages" ADD COLUMN "iv" text, ADD COLUMN "tag" text;

-- Make the fields NOT NULL after setting default values
ALTER TABLE "messages" ALTER COLUMN "iv" SET NOT NULL, ALTER COLUMN "tag" SET NOT NULL;
