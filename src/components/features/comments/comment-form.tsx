'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores';

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
  const { isAuthenticated } = useAuth();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<
    Array<{ id: string; name: string; avatar?: string | null }>
  >([]);
  const [showMentions, setShowMentions] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when initialContent changes (e.g., prefill mentions)
  useEffect(() => {
    setContent(initialContent);
    if (autoFocus) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [initialContent, autoFocus]);

  // Fetch mentions
  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      if (!showMentions || mentionQuery.trim().length === 0) return;
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(mentionQuery)}&limit=8`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setMentionResults(data.users || []);
          setActiveMentionIndex(0);
        }
      } catch {}
    };
    const t = setTimeout(fetchUsers, 150);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [mentionQuery, showMentions]);

  const insertMention = (user: { id: string; name: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || content.length;
    const uptoCursor = content.slice(0, start);
    const afterCursor = content.slice(start);
    const atIndex = uptoCursor.lastIndexOf('@');
    if (atIndex === -1) return;
    const before = uptoCursor.slice(0, atIndex);
    const mentionText = `@${user.name}`;
    const nextContent = `${before}${mentionText} ${afterCursor}`;
    setContent(nextContent);
    setShowMentions(false);
    setMentionQuery('');
    // Move caret to after inserted mention + space
    const caretPos = (before + mentionText + ' ').length;
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = caretPos;
      textarea.focus();
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
        const response = await fetch(`/api/comments/${commentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: content.trim() }),
        });

        if (response.ok) {
          const updatedComment = await response.json();
          onCommentAdded(updatedComment);
          if (onCancel) onCancel();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to update comment');
        }
      } else {
        const response = await fetch(`/api/articles/${articleId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content.trim(),
            parentId,
          }),
        });

        if (response.ok) {
          const comment = await response.json();
          onCommentAdded(comment);
          setContent('');
          if (onCancel) onCancel();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to post comment');
        }
      }
    } catch {
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mentions navigation
    if (showMentions && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentionResults[activeMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      if (!isSubmitting && content.trim()) {
        handleSubmit(e as any);
      }
    }
    // Alt+Enter will create a new line (default behavior)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const cursor = e.target.selectionStart || value.length;
    const uptoCursor = value.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const afterAt = uptoCursor.slice(atIndex + 1);
      // Stop mention if contains whitespace or newline
      if (/\s/.test(afterAt)) {
        setShowMentions(false);
        setMentionQuery('');
      } else {
        setShowMentions(true);
        setMentionQuery(afterAt);
      }
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
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
            className="min-h-[80px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            maxLength={1000}
            ref={textareaRef}
            autoFocus={autoFocus}
          />
          {showMentions && mentionResults.length > 0 && (
            <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
              {mentionResults.map((u, idx) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(u);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left hover:bg-gray-50 ${idx === activeMentionIndex ? 'bg-gray-50' : ''}`}
                >
                  <div className="mr-2 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="h-6 w-6 object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{u.name}</span>
                </button>
              ))}
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
