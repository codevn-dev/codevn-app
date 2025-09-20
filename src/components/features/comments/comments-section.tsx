'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CommentItem } from './comment-item';
import { CommentForm } from './comment-form';
import { useAuth } from '@/hooks/use-auth';
import { usePolling } from '@/hooks/use-polling';
import { useUIStore } from '@/stores';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  replies?: Comment[];
  replyCount?: number;
  parent?: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
  };
}

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
    const { isAuthenticated } = useAuth();
    const { setAuthModalOpen, setAuthMode } = useUIStore();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [isLoading, setIsLoading] = useState(false);
    const [_isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastCommentId, setLastCommentId] = useState<string | null>(null);
    const lastCommentIdRef = useRef<string | null>(null);
    const commentFormRef = useRef<HTMLDivElement>(null);
    const [visibleTopCount, setVisibleTopCount] = useState(5);
    const fetchCommentsRef = useRef<typeof fetchComments | null>(null);

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
        if (showLoading) setIsLoading(true);
        else if (page > 1) setLoadingMore(true);
        else setIsRefreshing(true);

        setError('');

        try {
          const response = await fetch(
            `/api/articles/${articleId}/comments?sortOrder=asc&page=${page}&limit=5`
          );

          if (response.ok) {
            const data = await response.json();
            if (append) {
              setComments((prev) => [...prev, ...(data.comments || [])]);
            } else {
              setComments(data.comments || []);
              setVisibleTopCount(5);
              // Update last comment ID for polling (use the first comment as it's the most recent)
              if (data.comments && data.comments.length > 0) {
                const newLastCommentId = data.comments[0].id;
                setLastCommentId(newLastCommentId);
                lastCommentIdRef.current = newLastCommentId;
              }
            }
            setHasMoreComments(data.pagination.hasNextPage);
            setCurrentPage(page);
          } else {
            setError('Failed to load comments');
          }
        } catch {
          setError('Failed to load comments');
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          setLoadingMore(false);
        }
      },
      [articleId]
    );

    // Update ref when fetchComments changes
    useEffect(() => {
      fetchCommentsRef.current = fetchComments;
    }, [fetchComments]);

    // Function to check for new comments
    const checkForNewComments = useCallback(async () => {
      try {
        const response = await fetch(`/api/articles/${articleId}/comments?sortOrder=desc&limit=1`);

        if (response.ok) {
          const data = await response.json();
          if (data.comments && data.comments.length > 0) {
            const latestComment = data.comments[0];
            // Check if this is a new comment by comparing with our last known comment
            if (!lastCommentIdRef.current || latestComment.id !== lastCommentIdRef.current) {
              // New comments found, refresh the entire list
              fetchCommentsRef.current?.(false, 1, false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new comments:', error);
      }
    }, [articleId]);

    const handleCommentAdded = (_newComment: Comment) => {
      // Auto refresh comments to get the latest data
      fetchComments(false, 1, false);
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
      setComments((prev) =>
        prev.map((comment) => (comment.id === updatedComment.id ? updatedComment : comment))
      );
    };

    const handleCommentDeleted = (commentId: string) => {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    };

    const handleReplyAdded = (reply: Comment) => {
      // Find the parent comment and add the reply to its replies array
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === reply.parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), reply],
              replyCount: (comment.replyCount || 0) + 1,
            };
          }
          return comment;
        })
      );
    };

    // Set up polling for new comments
    usePolling({
      enabled: isAuthenticated && lastCommentId !== null,
      interval: 3000, // Poll every 3 seconds
      onPoll: checkForNewComments,
    });

    // Load comments on mount if not provided initially
    useEffect(() => {
      if (initialComments.length === 0) {
        fetchComments(true, 1, false);
      } else {
        // Set last comment ID from initial comments (use first comment as it's most recent)
        if (initialComments.length > 0) {
          const newLastCommentId = initialComments[0].id;
          setLastCommentId(newLastCommentId);
          lastCommentIdRef.current = newLastCommentId;
        }
      }
    }, [articleId, fetchComments]);

    // Only show top-level comments (parentId is null)
    const topLevelComments = comments.filter((comment) => comment.parentId === null);

    return (
      <div className="space-y-6">
        <div data-comments-header className="mb-6 flex items-center space-x-2 pt-4">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({commentCount || comments.length})
          </h3>
        </div>

        {/* Always show comment form for authenticated users */}
        {isAuthenticated && (
          <div ref={commentFormRef} className="mb-6">
            <CommentForm
              articleId={articleId}
              onCommentAdded={handleCommentAdded}
              placeholder="Write a comment..."
            />
          </div>
        )}

        {!isAuthenticated && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
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

        {!isLoading && !error && topLevelComments.length === 0 && isAuthenticated && (
          <div className="py-8 text-center text-gray-500">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}

        {!isLoading && !error && topLevelComments.length > 0 && (
          <div className="space-y-3">
            {topLevelComments.slice(0, visibleTopCount).map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                articleId={articleId}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
                onReplyAdded={handleReplyAdded}
              />
            ))}

            {/* Load More Button */}
            {(visibleTopCount < topLevelComments.length || hasMoreComments) && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (visibleTopCount < topLevelComments.length) {
                      setVisibleTopCount((c) => c + 5);
                    } else if (hasMoreComments && !loadingMore) {
                      await fetchComments(false, currentPage + 1, true);
                      setVisibleTopCount((c) => c + 5);
                    }
                  }}
                  disabled={loadingMore}
                  className="rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  {loadingMore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? 'Loading...' : 'Load more comments'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

CommentsSection.displayName = 'CommentsSection';
