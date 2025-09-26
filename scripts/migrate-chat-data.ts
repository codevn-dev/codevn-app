import { getDb } from '../src/server/database';
import { conversations, conversationsMessages, hiddenConversations } from '../src/server/database/schema';

async function migrateChatData() {
  const db = getDb();
  
  try {
    console.log('Starting chat data migration...');
    
    // Check if old messages table exists
    const oldMessagesExist = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `);
    
    if (!oldMessagesExist[0]?.exists) {
      console.log('Old messages table does not exist, skipping migration');
      return;
    }
    
    // Get all messages from old table
    const oldMessages = await db.execute(`
      SELECT 
        chat_id,
        from_user_id,
        to_user_id,
        text,
        iv,
        tag,
        type,
        seen,
        seen_at,
        created_at,
        updated_at
      FROM messages
      ORDER BY created_at ASC
    `);
    
    console.log(`Found ${oldMessages.length} messages to migrate`);
    
    // Group messages by chat_id to create conversations
    const conversationMap = new Map();
    
    for (const message of oldMessages) {
      const chatId = String(message.chat_id);
      
      if (!conversationMap.has(chatId)) {
        conversationMap.set(chatId, {
          id: chatId,
          fromUserId: String(message.from_user_id),
          toUserId: String(message.to_user_id),
          type: String(message.type || 'message'),
          createdAt: new Date(String(message.created_at)),
          updatedAt: new Date(String(message.updated_at || message.created_at)),
        });
      }
    }
    
    // Insert conversations
    console.log(`Creating ${conversationMap.size} conversations...`);
    for (const [chatId, conversation] of conversationMap) {
      try {
        await db.insert(conversations).values(conversation).onConflictDoNothing();
      } catch (error) {
        console.error(`Error creating conversation ${chatId}:`, error);
      }
    }
    
    // Insert messages
    console.log(`Migrating ${oldMessages.length} messages...`);
    for (const message of oldMessages) {
      try {
        await db.insert(conversationsMessages).values({
          id: crypto.randomUUID(),
          conversationId: String(message.chat_id),
          fromUserId: String(message.from_user_id),
          toUserId: String(message.to_user_id),
          text: String(message.text),
          iv: String(message.iv),
          tag: String(message.tag),
          seen: Boolean(message.seen),
          seenAt: message.seen_at ? new Date(String(message.seen_at)) : null,
          createdAt: new Date(String(message.created_at)),
          updatedAt: new Date(String(message.updated_at || message.created_at)),
        });
      } catch (error) {
        console.error(`Error migrating message:`, error);
      }
    }
    
    console.log('Chat data migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
migrateChatData().then(() => {
  console.log('Migration script finished');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
