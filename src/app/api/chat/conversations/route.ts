import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { messageRepository } from '@/lib/database/repository';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get conversations using the repository method
    const conversations = await messageRepository.getConversations(session.user.id);

    // Transform to the format expected by the frontend
    const formattedConversations = conversations.map((conv) => ({
      userId: conv.otherUserId,
      userName: conv.otherUserName || `User ${conv.otherUserId.substring(0, 8)}`,
      userAvatar: conv.otherUserAvatar,
      lastMessage: {
        text: conv.lastMessage,
        createdAt: conv.lastMessageTime,
        fromUserId: conv.lastMessageFromUserId || conv.otherUserId,
        seen: conv.lastMessageSeen || false,
      },
    }));

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
