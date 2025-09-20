'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Reply,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores';
import { CommentForm } from './comment-form';
import { CodeHighlighter } from '../articles/code-highlighter';
import { formatRelativeTime } from '@/lib/utils';

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
  likeCount?: number;
  unlikeCount?: number;
  userHasLiked?: boolean;
  userHasUnliked?: boolean;
  parent?: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
  };
}

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  depth?: number;
  onRequestParentReply?: (comment: Comment) => void;
}

export function CommentItem({
  comment,
  articleId,
  onCommentUpdated,
  onCommentDeleted,
  onReplyAdded,
  depth = 0,
  onRequestParentReply,
}: CommentItemProps) {
  const { user, isAuthenticated } = useAuth();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(5);
  const [childReplyingTo, setChildReplyingTo] = useState<Comment | null>(null);
  const [childReplyPrefill, setChildReplyPrefill] = useState<string>('');
  const [isLiked, setIsLiked] = useState(comment.userHasLiked || false);
  const [isUnliked, setIsUnliked] = useState(comment.userHasUnliked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [unlikeCount, setUnlikeCount] = useState(comment.unlikeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isUnliking, setIsUnliking] = useState(false);

  const isAuthor = user?.id === comment.author.id;
  const canEdit = isAuthor;
  const canDelete = isAuthor || user?.role === 'admin';
  const maxDepth = 1; // Only allow one level of replies

  // Sync state with prop changes
  useEffect(() => {
    setIsLiked(comment.userHasLiked || false);
    setIsUnliked(comment.userHasUnliked || false);
    setLikeCount(comment.likeCount || 0);
    setUnlikeCount(comment.unlikeCount || 0);
  }, [comment.userHasLiked, comment.userHasUnliked, comment.likeCount, comment.unlikeCount]);

  const handleEdit = async (updatedComment: any) => {
    onCommentUpdated(updatedComment);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onCommentDeleted(comment.id);
      }
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
      const method =
        (action === 'like' && isLiked) || (action === 'unlike' && isUnliked) ? 'DELETE' : 'POST';

      const response = await fetch(`/api/comments/${comment.id}/reaction`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
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

  const handleReplyAdded = (reply: Comment) => {
    onReplyAdded(reply);
    setIsReplying(false);
    // Add the reply to local state
    setReplies((prev) => [...prev, reply]);
  };

  const loadReplies = async (page = 1, append = false) => {
    setLoadingReplies(true);
    try {
      const response = await fetch(
        `/api/articles/${articleId}/comments?parentId=${comment.id}&page=${page}&limit=5&sortOrder=asc`
      );
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setReplies((prev) => [...prev, ...(data.comments || [])]);
        } else {
          setReplies(data.comments || []);
          setVisibleRepliesCount(5);
        }
        setHasMoreReplies(data.pagination.hasNextPage);
        setRepliesPage(page);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoadingReplies(false);
    }
  };


  const emphasizeMentions = (text: string) => text;

  return (
    <div className={`${depth > 0 ? 'pl-4' : ''}`}>
      <Card className={`mb-3 ${isDeleting ? 'opacity-50' : ''}`}>
        <CardBody className="p-3">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                {comment.author.avatar ? (
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  comment.author.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{comment.author.name}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  {formatRelativeTime(comment.createdAt)}
                  {comment.updatedAt && (
                    <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                      edited
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-6 w-6 p-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>

                {showDropdown && (
                  <div className="absolute top-8 right-0 z-10 min-w-[120px] rounded-md border border-gray-200 bg-white shadow-lg">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50"
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
                className="text-sm text-gray-700"
              />
            </div>
          )}

          {!isEditing && (
            <div className="mt-2 flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking || !user}
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
                disabled={isUnliking || !user}
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
              {depth < maxDepth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthMode('signin');
                      setAuthModalOpen(true);
                      return;
                    }
                    setIsReplying(!isReplying);
                  }}
                  className="h-6 rounded-md px-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Reply className="mr-1 h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
              {depth >= maxDepth && onRequestParentReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthMode('signin');
                      setAuthModalOpen(true);
                      return;
                    }
                    onRequestParentReply(comment);
                  }}
                  className="h-6 rounded-md px-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Reply className="mr-1 h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
              {comment.replies && comment.replies.length > 0 && (
                <span className="text-sm text-gray-500">
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          )}

          {isReplying && (
            <div className="pl-4">
              <CommentForm
                articleId={articleId}
                parentId={comment.id}
                onCommentAdded={handleReplyAdded}
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to ${comment.author.name}...`}
              />
            </div>
          )}

          {/* Show replies toggle at parent (kept), without load more here */}
          {Number(comment.replyCount) > 0 && depth === 0 && !showReplies && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplies(true);
                  loadReplies(1, false);
                }}
                disabled={loadingReplies}
                className="rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              >
                {loadingReplies ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {`Show replies (${comment.replyCount})`}
              </Button>
            </div>
          )}

          {/* Render replies - only show if loaded */}
          {showReplies && replies.length > 0 && depth === 0 && (
            <div className="mt-3 space-y-3">
              {replies.slice(0, visibleRepliesCount).map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  articleId={articleId}
                  onCommentUpdated={onCommentUpdated}
                  onCommentDeleted={onCommentDeleted}
                  onReplyAdded={onReplyAdded}
                  depth={depth + 1}
                  onRequestParentReply={(c) => {
                    setShowReplies(true);
                    setChildReplyingTo(c);
                    setChildReplyPrefill(`@${c.author.name} `);
                  }}
                />
              ))}

              {/* Load More Replies Button - now above the child reply textbox */}
              {(visibleRepliesCount < replies.length || hasMoreReplies) && (
                <div className="mt-2 pl-4">
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
                    }}
                    disabled={loadingReplies}
                    className="rounded-md px-2 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {loadingReplies ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    {loadingReplies ? 'Loading...' : 'Load more replies'}
                  </Button>
                </div>
              )}

              {/* Child reply text box at the end of child comments */}
              {isAuthenticated && (
                <div className="mt-2 pl-4">
                  <CommentForm
                    articleId={articleId}
                    parentId={comment.id}
                    onCommentAdded={(newReply: any) => {
                      onReplyAdded(newReply);
                      setReplies((prev) => [...prev, newReply]);
                      setChildReplyingTo(null);
                      setChildReplyPrefill('');
                    }}
                    placeholder={
                      childReplyingTo
                        ? `Reply to ${childReplyingTo.author.name}...`
                        : 'Write a reply...'
                    }
                    initialContent={childReplyPrefill}
                    autoFocus={!!childReplyingTo}
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
