'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CommentItem } from './comment-item';
import { CommentForm } from './comment-form';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { useCommentWebSocketContext } from './websocket-context';
import { Comment, CommentListResponse } from '@/types/shared';
import { apiGet } from '@/lib/utils/api-client';

interface CommentsSectionProps {
  articleId: string;
  initialComments?: Comment[];
  commentCount?: number;
}

export interface CommentsSectionRef {
  scrollToCommentForm: () => void;
}

export const CommentsSection = forwardRef<CommentsSectionRef, CommentsSectionProps>(
  ({ articleId, initialComments = [], commentCount = 0 }, ref) => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthState();
    const { setAuthModalOpen, setAuthMode } = useUIStore();
    const { addOnNewCommentCallback, addOnNewReplyCallback } = useCommentWebSocketContext();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [isLoading, setIsLoading] = useState(false);
    const [_isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [_lastCommentId, setLastCommentId] = useState<string | null>(null);
    const lastCommentIdRef = useRef<string | null>(null);
    const commentFormRef = useRef<HTMLDivElement>(null);
    const [visibleTopCount, setVisibleTopCount] = useState(5);
    const fetchCommentsRef = useRef<typeof fetchComments | null>(null);
    const articleIdRef = useRef(articleId);
    const _hasLoadedRef = useRef(false);
    const isFetchingRef = useRef(false);
    const lastFetchKeyRef = useRef<string | null>(null);

    // Expose scroll function to parent component
    useImperativeHandle(ref, () => ({
      scrollToCommentForm: () => {
        // If user is authenticated, scroll to comment form
        if (isAuthenticated && commentFormRef.current) {
          commentFormRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        } else {
          // If user is not authenticated, scroll to comments section header
          const commentsHeader = document.querySelector('[data-comments-header]');
          if (commentsHeader) {
            commentsHeader.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }
      },
    }));

    const fetchComments = useCallback(
      async (showLoading = true, page = 1, append = false) => {
        const fetchKey = `${articleId}|${page}|${append ? '1' : '0'}`;
        if (isFetchingRef.current && lastFetchKeyRef.current === fetchKey) return;
        if (lastFetchKeyRef.current === fetchKey && comments.length > 0 && page === currentPage)
          return;

        isFetchingRef.current = true;
        lastFetchKeyRef.current = fetchKey;

        if (showLoading) setIsLoading(true);
        else if (page > 1) setLoadingMore(true);
        else setIsRefreshing(true);

        setError('');

        try {
          const data = await apiGet<CommentListResponse>(
            `/api/articles/${articleId}/comments?sortOrder=asc&page=${page}&limit=5`
          );
          if (append) {
            setComments((prev) => [...prev, ...(data.comments || [])]);
          } else {
            setComments(data.comments || []);
            setVisibleTopCount(5);
            // Update last comment ID (use the first comment as it's the most recent)
            if (data.comments && data.comments.length > 0) {
              const newLastCommentId = data.comments[0].id;
              setLastCommentId(newLastCommentId);
              lastCommentIdRef.current = newLastCommentId;
            }
          }
          setHasMoreComments(page < (data.pagination?.totalPages ?? page));
          setCurrentPage(page);
        } catch {
          setError('Failed to load comments');
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          setLoadingMore(false);
          isFetchingRef.current = false;
        }
      },
      [articleId, comments.length, currentPage] // Keep dependencies minimal and stable
    );

    // Update refs when they change
    useEffect(() => {
      fetchCommentsRef.current = fetchComments;
      articleIdRef.current = articleId;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]); // fetchComments is intentionally excluded to prevent infinite loop

    const handleCommentAdded = (newComment: Comment) => {
      if (newComment.parentId) {
        // This is a reply - add it to the parent comment's replies
        handleReplyAdded(newComment);
      } else {
        // This is a new comment - add it to the bottom of the list (latest at bottom)
        setComments((prev) => {
          // Check if comment already exists (for websocket updates)
          const exists = prev.some((c) => c.id === newComment.id);
          if (exists) return prev;

          // Always add to the end for latest-first display
          return [...prev, newComment];
        });
        // Auto-expand visible count to show new comment
        setVisibleTopCount((c) => c + 1);
      }
      // Update last comment ID immediately
      lastCommentIdRef.current = newComment.id;
      setLastCommentId(newComment.id);
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
      setComments((prev) =>
        prev.map((comment) => (comment.id === updatedComment.id ? updatedComment : comment))
      );
    };

    const handleCommentDeleted = (commentId: string) => {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    };

    const handleReplyAdded = useCallback((reply: Comment) => {
      // Find the parent comment and add the reply to its replies array
      setComments((prev) => {
        const updated = prev.map((comment) => {
          // Check if this comment is the parent by ID
          const isParent = comment.id === reply.parentId;

          if (isParent) {
            // Check if this is replacing an optimistic reply (same content, different ID)
            const optimisticIndex = comment.replies?.findIndex(
              (r) =>
                r.id.startsWith('temp-') &&
                r.content === reply.content &&
                r.authorId === reply.authorId
            );

            if (optimisticIndex !== -1 && optimisticIndex !== undefined && comment.replies) {
              // Replace optimistic reply with real reply at the same position
              const newReplies = [...comment.replies];
              newReplies[optimisticIndex] = reply;
              return {
                ...comment,
                replies: newReplies,
                replyCount: comment.replyCount || 0,
              };
            }

            // Check if reply already exists to avoid duplicates
            const replyExists = comment.replies?.some((r) => r.id === reply.id);
            if (replyExists) {
              return comment;
            }

            return {
              ...comment,
              replies: [...(comment.replies || []), reply],
              replyCount: (comment.replyCount || 0) + 1,
            };
          }
          return comment;
        });
        return updated;
      });
    }, []);

    // WebSocket event handlers
    const handleNewComment = useCallback(
      (comment: Comment) => {
        // Only add if it's for this article
        if (comment.articleId === articleId) {
          setComments((prev) => {
            // Check if comment already exists to avoid duplicates
            const exists = prev.some((c) => c.id === comment.id);
            if (exists) return prev;

            // Check if this is replacing an optimistic comment (same content, different ID)
            const optimisticIndex = prev.findIndex(
              (c) =>
                c.id.startsWith('temp-') &&
                c.content === comment.content &&
                c.authorId === comment.authorId
            );

            if (optimisticIndex !== -1) {
              // Replace optimistic comment with real comment at the same position
              const newComments = [...prev];
              newComments[optimisticIndex] = comment;
              return newComments;
            }

            // Add new comment to the end
            return [...prev, comment];
          });
          // Auto-expand visible count to show new comment
          setVisibleTopCount((c) => c + 1);
        }
      },
      [articleId]
    );

    const handleNewReply = useCallback(
      (reply: Comment) => {
        // Only add if it's for this article
        if (reply.articleId === articleId) {
          handleReplyAdded(reply);
        }
      },
      [articleId, handleReplyAdded]
    );

    // Load comments on mount if not provided initially
    useEffect(() => {
      if (initialComments.length === 0) {
        if (!_hasLoadedRef.current) {
          _hasLoadedRef.current = true; // prevent Strict Mode double fetch
          fetchComments(true, 1, false);
        }
      } else {
        // Set last comment ID from initial comments (use first comment as it's most recent)
        if (initialComments.length > 0) {
          const newLastCommentId = initialComments[0].id;
          setLastCommentId(newLastCommentId);
          lastCommentIdRef.current = newLastCommentId;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId, initialComments.length]); // fetchComments is intentionally excluded to prevent infinite loop

    // Reset comments when articleId changes
    useEffect(() => {
      setComments([]);
      setLastCommentId(null);
      lastCommentIdRef.current = null;
      setCurrentPage(1);
      setHasMoreComments(true);
      setVisibleTopCount(5);
      _hasLoadedRef.current = false;
      lastFetchKeyRef.current = null;
      isFetchingRef.current = false;
    }, [articleId]);

    // Register WebSocket callbacks
    useEffect(() => {
      const unsubscribeNewComment = addOnNewCommentCallback(handleNewComment);
      const unsubscribeNewReply = addOnNewReplyCallback(handleNewReply);

      return () => {
        unsubscribeNewComment();
        unsubscribeNewReply();
      };
    }, [addOnNewCommentCallback, addOnNewReplyCallback]); // eslint-disable-line react-hooks/exhaustive-deps

    // Only show top-level comments (parentId is null) and ensure unique IDs
    const topLevelComments = comments.reduce<Comment[]>((acc, c) => {
      if (c.parentId === null && !acc.some((x) => x.id === c.id)) acc.push(c);
      return acc;
    }, []);

    return (
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading comments...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchComments()} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading &&
          !error &&
          topLevelComments.length === 0 &&
          isAuthenticated &&
          !isAuthLoading && (
            <div className="py-8 text-center text-gray-500">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}

        {!isLoading && !error && topLevelComments.length > 0 && (
          <div className="space-y-3">
            {topLevelComments.slice(0, visibleTopCount).map((comment) => (
              <CommentItem
                key={`${comment.id}-${comment.createdAt}`}
                comment={comment}
                articleId={articleId}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
                onReplyAdded={handleReplyAdded}
              />
            ))}

            {/* Load More Button - only show if there are older comments to load */}
            {hasMoreComments && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (hasMoreComments && !loadingMore) {
                      await fetchComments(false, currentPage + 1, true);
                      setVisibleTopCount((c) => c + 5);
                    }
                  }}
                  disabled={loadingMore}
                  className="rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  {loadingMore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? 'Thinking...' : 'Load older comments'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Comment form moved to bottom for better UX */}
        {isAuthenticated && !isAuthLoading && (
          <div ref={commentFormRef} className="mt-6">
            <CommentForm
              articleId={articleId}
              onCommentAdded={handleCommentAdded}
              placeholder="Write a comment..."
            />
          </div>
        )}

        {!isAuthLoading && !isAuthenticated && (
          <div className="border-brand/20 mt-6 rounded-lg border bg-gray-50 p-6 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
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
              to post comments.
            </p>
          </div>
        )}
      </div>
    );
  }
);

CommentsSection.displayName = 'CommentsSection';
