'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { useCommentWebSocketContext } from './websocket-context';
import { apiPut } from '@/lib/utils/api-client';
import { UpdateCommentRequest, Comment } from '@/types/shared/comment';

interface CommentFormProps {
  articleId: string;
  parentId?: string | null;
  onCommentAdded: (comment: any) => void;
  onCancel?: () => void;
  placeholder?: string;
  initialContent?: string;
  isEditing?: boolean;
  commentId?: string;
  autoFocus?: boolean;
}

export function CommentForm({
  articleId,
  parentId = null,
  onCommentAdded,
  onCancel,
  placeholder = 'Write a comment...',
  initialContent = '',
  isEditing = false,
  commentId,
  autoFocus = false,
}: CommentFormProps) {
  const { isAuthenticated, user } = useAuthState();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const { sendComment, sendReply } = useCommentWebSocketContext();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
    if (autoFocus) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [initialContent, autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError('You must be logged in to comment');
      return;
    }

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (content.length > 1000) {
      setError('Comment is too long (max 1000 characters)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing && commentId) {
        const payload: Omit<UpdateCommentRequest, 'id'> = { content: content.trim() };
        const updated = await apiPut<Comment>(`/api/comments/${commentId}`, payload);
        onCommentAdded(updated);
        if (onCancel) onCancel();
      } else {
        // Create optimistic comment/reply for immediate UI update
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          content: content.trim(),
          articleId,
          authorId: user?.id || '',
          parentId: parentId || null,
          createdAt: new Date(),
          updatedAt: null,
          author: {
            id: user?.id || '',
            name: user?.name || 'You',
            email: user?.email || '',
            avatar: user?.avatar || null,
          },
          replyCount: 0,
          likeCount: 0,
          unlikeCount: 0,
          userHasLiked: false,
          userHasUnliked: false,
          _count: {
            replies: 0,
            likes: 0,
          },
        };

        // Use WebSocket for new comments and replies
        if (parentId) {
          // This is a reply
          sendReply(articleId, content.trim(), parentId);
          // Add optimistic reply to UI immediately
          onCommentAdded(optimisticComment);
        } else {
          // This is a new comment
          sendComment(articleId, content.trim());
          // Add optimistic comment to UI immediately (like replies)
          onCommentAdded(optimisticComment);
        }

        // Clear the form immediately for better UX
        setContent('');
        if (onCancel) onCancel();
      }
    } catch {
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNow = () => {
    if (!isSubmitting && content.trim()) {
      // Create a synthetic event that matches React.FormEvent signature
      const event = { preventDefault: () => {} } as unknown as React.FormEvent;
      void handleSubmit(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      submitNow();
    }
    // Alt+Enter will create a new line (default behavior)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-gray-600">
          Please{' '}
          <button
            onClick={() => {
              setAuthMode('signin');
              setAuthModalOpen(true);
            }}
            className="cursor-pointer font-medium text-blue-600 underline hover:text-blue-800"
          >
            sign in
          </button>{' '}
          to leave a comment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <div className="relative">
          <Textarea
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] resize-none border-gray-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
            maxLength={1000}
            ref={textareaRef}
            autoFocus={autoFocus}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-500">{content.length}/1000 characters</span>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center space-x-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span>{parentId ? 'Reply' : 'Comment'}</span>
        </Button>
      </div>
    </form>
  );
}
