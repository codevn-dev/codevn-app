'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Smile } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { useCommentWebSocketContext } from './websocket-context';
import { apiPut } from '@/lib/utils/api-client';
import { UpdateCommentRequest, Comment } from '@/types/shared/comment';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

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
  focusTrigger?: number;
  onReady?: () => void;
  suppressAuthPrompt?: boolean;
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
  focusTrigger,
  onReady,
  suppressAuthPrompt = false,
}: CommentFormProps) {
  const { isAuthenticated, user } = useAuthState();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const { sendComment, sendReply } = useCommentWebSocketContext();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPopoverRef = useRef<HTMLDivElement>(null);

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
    if (autoFocus) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          if (onReady) onReady();
        }
      });
    }
  }, [initialContent, autoFocus, focusTrigger, onReady]);

  // Always scroll to the textarea when it is focused (programmatically or by user)
  useEffect(() => {
    if (autoFocus || focusTrigger !== undefined) {
      // After focus has been attempted above, ensure it's in view
      requestAnimationFrame(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [autoFocus, focusTrigger]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showEmoji) return;
      const target = e.target as Node;
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(target) &&
        target !== textareaRef.current
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showEmoji]);

  const insertAtCursor = (emoji: string) => {
    const input = textareaRef.current;
    if (!input) {
      setContent((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newValue = input.value.slice(0, start) + emoji + input.value.slice(end);
    setContent(newValue);
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

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
        } else {
          // This is a new comment
          sendComment(articleId, content.trim());
        }

        onCommentAdded(optimisticComment);

        // Clear the form immediately for better UX
        setContent('');
        if (onCancel) onCancel();
        // Keep the textbox in view after sending
        requestAnimationFrame(() => {
          textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
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
    // Ensure the textarea remains visible as the user types
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const effectiveAuthenticated = isAuthenticated || suppressAuthPrompt;

  if (!effectiveAuthenticated) {
    return (
      <div className="border-brand/20 rounded-lg border bg-gray-50 p-4 text-center">
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
          <button
            type="button"
            aria-label="Emoji"
            className={`absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 ${
              showEmoji ? 'text-gray-700' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji((v) => !v);
            }}
          >
            <Smile className="h-5 w-5" />
          </button>
          <Textarea
            value={content}
            onChange={handleChange}
            onFocus={() => {
              // Ensure the focused textarea is brought into view on any focus event
              textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              e.stopPropagation();
              textareaRef.current?.focus();
              setShowEmoji(false);
            }}
            placeholder={placeholder}
            className="border-brand/20 focus:border-brand focus:ring-brand min-h-[80px] resize-none border bg-white shadow-sm placeholder:text-gray-500"
            maxLength={1000}
            ref={textareaRef}
            autoFocus={autoFocus}
          />
          {showEmoji && (
            <div
              ref={emojiPopoverRef}
              className="border-brand/20 absolute right-0 bottom-12 z-[120] rounded-lg border bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => {
                  insertAtCursor(emoji.native || emoji.shortcodes || '');
                }}
                theme="light"
                previewPosition="none"
              />
            </div>
          )}
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
          className="flex items-center space-x-2 border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
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
