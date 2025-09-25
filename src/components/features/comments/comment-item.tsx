'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { listItemFadeSlide } from '@/components/layout/motion-presets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reply, Edit, Trash2, MoreVertical, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { CommentForm } from './comment-form';
import { CodeHighlighter } from '../articles/code-highlighter';
import { formatDate } from '@/lib/utils';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { useClientOnly } from '@/hooks/use-client-only';
import { Comment, CommentListResponse, SuccessResponse } from '@/types/shared';
import { apiDelete, apiGet, apiPost } from '@/lib/utils/api-client';
import { ReactionRequest } from '@/types/shared/article';
import { useI18n } from '@/components/providers';

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  depth?: number;
  onRequestParentReply?: (comment: Comment) => void;
  highlightCommentId?: string;
  onHighlightTarget?: (id: string | null) => void;
}

export function CommentItem({
  comment,
  articleId,
  onCommentUpdated,
  onCommentDeleted,
  onReplyAdded,
  depth = 0,
  onRequestParentReply,
  highlightCommentId,
  onHighlightTarget,
}: CommentItemProps) {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuthState();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  // Removed inline reply state; reply is handled via the persistent bottom textbox
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(5);
  const repliesLoadedRef = useRef(false);
  const repliesRef = useRef<Comment[]>([]);
  const [childReplyingTo, setChildReplyingTo] = useState<Comment | null>(null);
  const [childReplyPrefill, setChildReplyPrefill] = useState<string>('');
  const [replyFocusTick, setReplyFocusTick] = useState(0);
  const [shouldFocusReply, setShouldFocusReply] = useState(false);
  const bottomReplyRef = useRef<HTMLDivElement | null>(null);
  const [isLiked, setIsLiked] = useState(comment.userHasLiked || false);
  const [isUnliked, setIsUnliked] = useState(comment.userHasUnliked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [unlikeCount, setUnlikeCount] = useState(comment.unlikeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isUnliking, setIsUnliking] = useState(false);
  const isHighlighted = (highlightCommentId && highlightCommentId === comment.id) || false;

  const isAuthor = user?.id === comment.author.id;
  const canEdit = isAuthor;
  const canDelete = isAuthor || user?.role === 'admin';
  const maxDepth = 1; // Only allow one level of replies

  // Removed auto-show replies logic - users should manually click to show replies
  const isClient = useClientOnly();

  // Sync state with prop changes
  useEffect(() => {
    setIsLiked(comment.userHasLiked || false);
    setIsUnliked(comment.userHasUnliked || false);
    setLikeCount(comment.likeCount || 0);
    setUnlikeCount(comment.unlikeCount || 0);
  }, [comment.userHasLiked, comment.userHasUnliked, comment.likeCount, comment.unlikeCount]);

  // Sync replies state with comment prop changes (for websocket updates)
  // Only sync if we haven't loaded replies yet, to avoid overwriting local state
  useEffect(() => {
    if (comment.replies && comment.replies.length > 0 && !repliesLoadedRef.current) {
      setReplies(comment.replies);
      repliesLoadedRef.current = true;
    }
  }, [comment.replies]);

  // Update ref when replies change
  useEffect(() => {
    repliesRef.current = replies;
  }, [replies]);

  // Helper: robust scroll to reply box with small retries to handle async layout
  const scrollToReplyBox = () => {
    const doScroll = () => {
      bottomReplyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    // Immediate, next frame, and delayed attempts
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 80);
    setTimeout(doScroll, 160);
  };

  // Ensure we scroll to the bottom reply textbox when requested, even after async loads
  useEffect(() => {
    if (showReplies && shouldFocusReply) {
      setTimeout(() => {
        scrollToReplyBox();
      }, 0);
    }
  }, [showReplies, replies.length, replyFocusTick, shouldFocusReply]);

  // Handle new replies from websocket - merge with existing local state
  useEffect(() => {
    if (comment.replies && comment.replies.length > 0 && repliesLoadedRef.current) {
      setReplies((prev) => {
        const merged = [...prev];
        for (const incoming of comment.replies!) {
          const existingIndex = merged.findIndex((r) => r.id === incoming.id);
          if (existingIndex !== -1) {
            // Already present by real ID; ensure latest data
            merged[existingIndex] = incoming;
            continue;
          }
          // Try to replace an optimistic temp reply by content+author match
          const optimisticIndex = merged.findIndex(
            (r) =>
              r.id.startsWith('temp-') &&
              r.content === incoming.content &&
              r.author.id === incoming.author.id
          );
          if (optimisticIndex !== -1) {
            merged[optimisticIndex] = incoming;
            continue;
          }
          // Otherwise append
          merged.push(incoming);
        }
        // Auto-expand visible count to show new replies
        setVisibleRepliesCount((currentVisible) => Math.max(currentVisible, merged.length));
        return merged;
      });
    }
  }, [comment.replies]);

  const handleEdit = async (updatedComment: any) => {
    onCommentUpdated(updatedComment);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeleting(true);
    try {
      const _res = await apiDelete<SuccessResponse>(`/api/comments/${comment.id}`);
      onCommentDeleted(comment.id);
    } catch {
      // Error handled silently
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (action: 'like' | 'unlike') => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    if (action === 'like') {
      setIsLiking(true);
    } else {
      setIsUnliking(true);
    }

    try {
      const shouldDelete = (action === 'like' && isLiked) || (action === 'unlike' && isUnliked);

      if (shouldDelete) {
        await apiDelete<SuccessResponse>(`/api/comments/${comment.id}/reaction`);
      } else {
        await apiPost<SuccessResponse>(`/api/comments/${comment.id}/reaction`, {
          action,
        } as ReactionRequest);
      }

      if (action === 'like') {
        if (isLiked) {
          // Remove like
          setIsLiked(false);
          setLikeCount((prev) => prev - 1);
        } else {
          // Add like, remove unlike if exists
          if (isUnliked) {
            setIsUnliked(false);
            setUnlikeCount((prev) => prev - 1);
          }
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      } else if (action === 'unlike') {
        if (isUnliked) {
          // Remove unlike
          setIsUnliked(false);
          setUnlikeCount((prev) => prev - 1);
        } else {
          // Add unlike, remove like if exists
          if (isLiked) {
            setIsLiked(false);
            setLikeCount((prev) => prev - 1);
          }
          setIsUnliked(true);
          setUnlikeCount((prev) => prev + 1);
        }
      }
    } catch {
      // Error handled silently
    } finally {
      if (action === 'like') {
        setIsLiking(false);
      } else {
        setIsUnliking(false);
      }
    }
  };

  const handleLike = () => handleReaction('like');
  const handleUnlike = () => handleReaction('unlike');

  const loadReplies = async (page = 1, append = false) => {
    setLoadingReplies(true);
    try {
      const data = await apiGet<CommentListResponse>(
        `/api/articles/${articleId}/comments?parentId=${comment.id}&page=${page}&limit=5&sortOrder=asc`
      );
      if (append) {
        setReplies((prev) => [...prev, ...(data.comments || [])]);
      } else {
        setReplies(data.comments || []);
        setVisibleRepliesCount(5);
        repliesLoadedRef.current = true;
      }
      setHasMoreReplies(page < (data.pagination?.totalPages ?? page));
      setRepliesPage(page);
    } catch {
      // Error handled silently
    } finally {
      setLoadingReplies(false);
    }
  };

  const emphasizeMentions = (text: string) => text;

  return (
    <motion.div
      className={`${depth > 0 ? 'pl-0 sm:pl-2' : ''}`}
      variants={listItemFadeSlide}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
    >
      <div className={`${isDeleting ? 'opacity-50' : ''}`}>
        <div className="flex items-start space-x-0.5 sm:space-x-1">
          <AvatarWithDropdown
            user={{
              id: comment.author.id,
              name: comment.author.name,
              email: '',
              avatar: comment.author.avatar || undefined,
              role: 'user' as const,
              createdAt: new Date().toISOString(),
            }}
            size={'lg'}
            className={`${depth > 0 ? '-ml-1 sm:-ml-1' : ''} mt-0.5 shrink-0 scale-[0.8] sm:scale-100`}
          />
          <div className="w-full">
            <div
              className={`inline-block max-w-full rounded-2xl px-2.5 py-2 transition-colors sm:px-3 ${
                isHighlighted ? 'border border-blue-300 bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
                <span className="text-[11px] text-gray-500">
                  {isClient ? formatDate(comment.createdAt) : ''}
                </span>
                {comment.updatedAt && (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    edited
                  </Badge>
                )}
                {(canEdit || canDelete) && (
                  <div className="relative ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="h-6 w-6 p-0"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                    {showDropdown && (
                      <div className="border-brand/20 absolute top-7 right-0 z-10 min-w-[120px] rounded-md border bg-white shadow-lg">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowDropdown(false);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-brand hover:bg-brand/10"
                          >
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              handleDelete();
                              setShowDropdown(false);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <CommentForm
                  articleId={articleId}
                  parentId={comment.parent?.id || null}
                  onCommentAdded={handleEdit}
                  onCancel={() => setIsEditing(false)}
                  placeholder="Edit your comment..."
                  initialContent={comment.content}
                  isEditing={true}
                  commentId={comment.id}
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <CodeHighlighter
                    content={emphasizeMentions(comment.content)}
                    className="text-sm text-gray-800"
                  />
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="mt-1 flex items-center space-x-1.5 pl-1 sm:space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`h-6 px-2 transition-colors duration-200 ${
                    isLiked
                      ? 'bg-green-50 text-green-600 hover:bg-green-50 hover:text-green-700'
                      : 'text-gray-600 hover:bg-green-50 hover:text-green-600'
                  }`}
                  title={isLiked ? 'Remove like' : 'Like this comment'}
                >
                  <ThumbsUp
                    className={`mr-1 h-3 w-3 transition-colors duration-200 ${
                      isLiked ? 'fill-current text-green-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-xs font-medium">{likeCount}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlike}
                  disabled={isUnliking}
                  className={`h-6 px-2 transition-colors duration-200 ${
                    isUnliked
                      ? 'bg-red-50 text-red-600 hover:bg-red-50 hover:text-red-700'
                      : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                  }`}
                  title={isUnliked ? 'Remove unlike' : 'Unlike this comment'}
                >
                  <ThumbsDown
                    className={`mr-1 h-3 w-3 transition-colors duration-200 ${
                      isUnliked ? 'fill-current text-red-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-xs font-medium">{unlikeCount}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthMode('signin');
                      setAuthModalOpen(true);
                      return;
                    }
                    const isAtOrBeyondMax = depth >= maxDepth;
                    if (isAtOrBeyondMax && onRequestParentReply) {
                      onHighlightTarget?.(comment.id);
                      onRequestParentReply(comment);
                      return;
                    }
                    if (!showReplies) {
                      setShowReplies(true);
                      if (!repliesLoadedRef.current) {
                        void loadReplies(1, false);
                      }
                    }
                    onHighlightTarget?.(comment.id);
                    setChildReplyingTo(comment);
                    setChildReplyPrefill('');
                    setReplyFocusTick((t) => t + 1);
                    setShouldFocusReply(true);
                    setTimeout(() => {
                      scrollToReplyBox();
                    }, 0);
                  }}
                  className="h-6 rounded-md px-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Reply className="mr-1 h-3 w-3" />
                  <span className="text-xs">{t('comments.reply')}</span>
                </Button>
              </div>
            )}

            {Number(comment.replyCount) > 0 && depth === 0 && !showReplies && (
              <div className="mt-1 pl-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplies(true);
                    loadReplies(1, false);
                  }}
                  disabled={loadingReplies}
                  className="h-6 rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  {loadingReplies ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  {t('comments.showReplies')} ({comment.replyCount})
                </Button>
              </div>
            )}

            {showReplies && depth === 0 && (
              <div className="relative mt-2 pl-0 sm:pl-2">
                {/* Vertical connector line from parent avatar downward */}
                <div className="pointer-events-none absolute top-0 bottom-6 -left-6 w-px bg-gray-200 sm:-left-7" />
                {replies.slice(0, visibleRepliesCount).map((reply) => (
                  <motion.div
                    key={`${reply.id}-${reply.createdAt}`}
                    variants={listItemFadeSlide}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -60px 0px' }}
                    className="relative"
                  >
                    {/* Curved elbow connector into the reply bubble */}
                    <div className="pointer-events-none absolute top-4 -left-6 h-5 w-6 sm:-left-7 sm:h-6 sm:w-7">
                      <div className="absolute top-0 left-0 h-full w-full rounded-tl-full border-t border-l border-gray-200" />
                    </div>
                    <CommentItem
                      key={`${reply.id}-${reply.createdAt}`}
                      comment={reply}
                      articleId={articleId}
                      onCommentUpdated={onCommentUpdated}
                      onCommentDeleted={onCommentDeleted}
                      onReplyAdded={onReplyAdded}
                      depth={depth + 1}
                      highlightCommentId={highlightCommentId}
                      onHighlightTarget={onHighlightTarget}
                      onRequestParentReply={(c) => {
                        if (!showReplies) {
                          setShowReplies(true);
                          if (!repliesLoadedRef.current) {
                            void loadReplies(1, false);
                          }
                        }
                        onHighlightTarget?.(c.id);
                        setChildReplyingTo(c);
                        setChildReplyPrefill(`@${c.author.name} `);
                        setReplyFocusTick((t) => t + 1);
                        setShouldFocusReply(true);
                        setTimeout(() => {
                          bottomReplyRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, 0);
                      }}
                    />
                  </motion.div>
                ))}

                {(visibleRepliesCount < replies.length || hasMoreReplies) && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (visibleRepliesCount < replies.length) {
                          setVisibleRepliesCount((c) => c + 5);
                        } else if (hasMoreReplies) {
                          await loadReplies(repliesPage + 1, true);
                          setVisibleRepliesCount((c) => c + 5);
                        }
                        setReplyFocusTick((t) => t + 1);
                        setShouldFocusReply(true);
                        setTimeout(() => {
                          bottomReplyRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, 0);
                      }}
                      disabled={loadingReplies}
                      className="h-6 rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {loadingReplies ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      {loadingReplies ? t('common.loading') : t('comments.loadMoreReplies')}
                    </Button>
                  </div>
                )}

                {isAuthenticated && (
                  <div ref={bottomReplyRef} className="mt-2">
                    <CommentForm
                      articleId={articleId}
                      parentId={comment.id}
                      onCommentAdded={(newReply: any) => {
                        onReplyAdded(newReply);
                        setReplies((prev) => {
                          const newRepliesList = [...prev, newReply];
                          setVisibleRepliesCount((currentVisible) =>
                            Math.max(currentVisible, newRepliesList.length)
                          );
                          return newRepliesList;
                        });
                        repliesLoadedRef.current = true;
                        setChildReplyingTo(null);
                        setChildReplyPrefill('');
                      }}
                      placeholder={
                        childReplyingTo
                          ? `Reply to ${childReplyingTo.author.name}...`
                          : t('comments.writeReply')
                      }
                      initialContent={childReplyPrefill}
                      autoFocus={shouldFocusReply}
                      focusTrigger={replyFocusTick}
                      onReady={() => {
                        setTimeout(() => {
                          bottomReplyRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, 0);
                        setShouldFocusReply(false);
                      }}
                      suppressAuthPrompt={true}
                      onFocusInput={() => {
                        if (!highlightCommentId || highlightCommentId !== comment.id) {
                          onHighlightTarget?.(null);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
