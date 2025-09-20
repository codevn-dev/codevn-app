import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { messageRepository } from '@/lib/database/repository';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
    }

    // Mark messages as seen
    const updatedMessages = await messageRepository.markAsSeen(chatId, session.user.id);

    return NextResponse.json({
      success: true,
      updatedCount: updatedMessages.length,
    });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
    }

    // Get unread count for this chat
    const unreadCount = await messageRepository.getUnreadCountForChat(chatId, session.user.id);

    return NextResponse.json({
      unreadCount,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
