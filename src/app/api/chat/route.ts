import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { messageRepository } from '@/lib/database/repository';

function getChatId(userA: string, userB: string): string {
  return [userA, userB].sort().join('|');
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const peerId = searchParams.get('peerId') || '';
    const action = searchParams.get('action') || 'get';
    const since = searchParams.get('since') || '0';
    const limit = parseInt(searchParams.get('limit') || '20');
    const before = searchParams.get('before') || '';

    if (!peerId) {
      return NextResponse.json({ error: 'Missing peerId' }, { status: 400 });
    }

    const chatId = getChatId(session.user.id, peerId);

    if (action === 'get') {
      // Get messages for this chat from database
      const chatMessages = await messageRepository.findByChatId(chatId);
      
      let filteredMessages = chatMessages;
      
      // Filter messages since the given timestamp (for polling)
      const sinceTimestamp = parseInt(since);
      if (sinceTimestamp > 0) {
        filteredMessages = chatMessages.filter(msg => new Date(msg.createdAt).getTime() > sinceTimestamp);
      }
      
      // Filter messages before the given timestamp (for load more)
      const beforeTimestamp = parseInt(before);
      if (beforeTimestamp > 0) {
        filteredMessages = chatMessages.filter(msg => new Date(msg.createdAt).getTime() < beforeTimestamp);
      }
      
      // Sort by timestamp descending (newest first)
      filteredMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply limit
      const hasMore = filteredMessages.length > limit;
      const limitedMessages = filteredMessages.slice(0, limit);
      
      // Sort by timestamp ascending (oldest first) for display
      limitedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
      return NextResponse.json({ 
        messages: limitedMessages.map(msg => ({
          ...msg,
          seen: msg.seen,
          seenAt: msg.seenAt,
        })),
        hasMore: hasMore
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in chat GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { peerId, text } = body;

    if (!peerId || !text) {
      return NextResponse.json({ error: 'Missing peerId or text' }, { status: 400 });
    }

    const chatId = getChatId(session.user.id, peerId);
    // Save message to database
    const message = await messageRepository.create({
      chatId,
      fromUserId: session.user.id,
      toUserId: peerId,
      text: String(text).slice(0, 4000),
      type: 'message',
    });

    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        type: message.type,
        chatId: message.chatId,
        from: message.fromUserId,
        to: message.toUserId,
        text: message.text,
        seen: message.seen,
        seenAt: message.seenAt,
        timestamp: message.createdAt.getTime(),
      }
    });
  } catch (error) {
    console.error('Error in chat POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}