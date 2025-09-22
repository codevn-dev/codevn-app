'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageSquare, Calendar, ArrowLeft, Eye } from 'lucide-react';
import { CodeHighlighter } from '@/features/articles';
import { CommentsSection } from '@/features/comments';
import type { CommentsSectionRef } from '@/features/comments';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { Article } from '@/types/shared';
import { apiDelete, apiPost } from '@/lib/utils/api-client';
import { SuccessResponse } from '@/types/shared/common';
import { ReactionRequest } from '@/types/shared/article';

interface ArticleContentProps {
  article: Article;
  isPreview?: boolean;
}

export function ArticleContent({ article, isPreview = false }: ArticleContentProps) {
  const { isAuthenticated } = useAuthState();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const [isLiked, setIsLiked] = useState((isAuthenticated && article.userHasLiked) || false);
  const [isUnliked, setIsUnliked] = useState((isAuthenticated && article.userHasUnliked) || false);
  const [likeCount, setLikeCount] = useState(article._count.likes);
  const [unlikeCount, setUnlikeCount] = useState(article._count.unlikes || 0);
  const commentsSectionRef = useRef<CommentsSectionRef>(null);

  // Derive effective UI states that never show as active when logged out
  const likedEffective = isAuthenticated ? isLiked : false;
  const unlikedEffective = isAuthenticated ? isUnliked : false;

  // Sync reaction state with auth status: if logged out, we cannot know per-user state -> reset to false
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLiked(false);
      setIsUnliked(false);
    } else {
      setIsLiked(!!article.userHasLiked);
      setIsUnliked(!!article.userHasUnliked);
    }
  }, [isAuthenticated, article.userHasLiked, article.userHasUnliked]);

  const handleReaction = async (action: 'like' | 'unlike') => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    try {
      const shouldDelete = (action === 'like' && isLiked) || (action === 'unlike' && isUnliked);

      if (shouldDelete) {
        await apiDelete<SuccessResponse>(`/api/articles/${article.id}/reaction`);
      } else {
        await apiPost<SuccessResponse>(`/api/articles/${article.id}/reaction`, {
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
    }
  };

  const handleLike = () => handleReaction('like');
  const handleUnlike = () => handleReaction('unlike');

  const handleCommentClick = () => {
    commentsSectionRef.current?.scrollToCommentForm();
  };

  return (
    <Card className="shadow-lg">
      {isPreview && (
        <div className="border-b border-yellow-200 bg-yellow-100 px-6 py-3">
          <div className="flex items-center text-sm font-medium text-yellow-800">
            <Eye className="mr-2 h-4 w-4" />
            Preview Mode - This article is not published yet
          </div>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="mb-4 flex items-center text-sm text-gray-500">
          <Link href="/" className="flex items-center hover:text-gray-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="mb-4">
          <Badge className="text-white" style={{ backgroundColor: article.category.color }}>
            {article.category.name}
          </Badge>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl">
          {article.title}
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-start space-x-2">
              <AvatarWithDropdown
                user={{
                  id: article.author.id,
                  name: article.author.name,
                  email: article.author.email,
                  avatar: article.author.avatar || undefined,
                  role: 'user' as const,
                  createdAt: new Date().toISOString(),
                }}
                size="lg"
                className="mt-0.5"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{article.author.name}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date(article.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {typeof article.views === 'number' && (
              <span className="flex items-center text-sm text-gray-600">
                <svg
                  className="mr-1 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {article.views}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={`transition-colors duration-200 ${
                likedEffective
                  ? 'border-green-600 text-green-600 hover:border-green-700 hover:bg-green-50'
                  : 'hover:border-green-600 hover:text-green-600'
              }`}
            >
              <ThumbsUp
                className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                  likedEffective ? 'fill-current text-green-600' : 'text-gray-500'
                }`}
              />
              {likeCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlike}
              className={`transition-colors duration-200 ${
                unlikedEffective
                  ? 'border-red-600 text-red-600 hover:border-red-700 hover:bg-red-50'
                  : 'hover:border-red-600 hover:text-red-600'
              }`}
            >
              <ThumbsDown
                className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                  unlikedEffective ? 'fill-current text-red-600' : 'text-gray-500'
                }`}
              />
              {unlikeCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCommentClick}
              className="cursor-pointer hover:border-blue-300 hover:bg-blue-50"
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              {article._count.comments}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        <CodeHighlighter content={article.content} className="leading-relaxed text-gray-700" />
      </CardBody>

      <CardBody className="border-t border-gray-200 pt-0">
        <CommentsSection
          ref={commentsSectionRef}
          articleId={article.id}
          commentCount={article._count.comments}
        />
      </CardBody>
    </Card>
  );
}
