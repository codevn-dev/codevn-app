'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageSquare, Calendar, ArrowLeft, Eye } from 'lucide-react';
import { CodeHighlighter } from '@/features/articles';
import { CommentsSection } from '@/features/comments';
import type { CommentsSectionRef } from '@/features/comments';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/stores';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  thumbnail?: string;
  categoryId: string;
  createdAt: Date | string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
  };
  _count: {
    comments: number;
    likes: number;
    unlikes: number;
  };
  userHasLiked?: boolean;
  userHasUnliked?: boolean;
}

interface ArticleContentProps {
  article: Article;
  isPreview?: boolean;
}

export function ArticleContent({ article, isPreview = false }: ArticleContentProps) {
  const { isAuthenticated } = useAuth();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const [isLiked, setIsLiked] = useState(article.userHasLiked || false);
  const [isUnliked, setIsUnliked] = useState(article.userHasUnliked || false);
  const [likeCount, setLikeCount] = useState(article._count.likes);
  const [unlikeCount, setUnlikeCount] = useState(article._count.unlikes || 0);
  const commentsSectionRef = useRef<CommentsSectionRef>(null);

  const handleReaction = async (action: 'like' | 'unlike') => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    try {
      const method =
        (action === 'like' && isLiked) || (action === 'unlike' && isUnliked) ? 'DELETE' : 'POST';

      const response = await fetch(`/api/articles/${article.id}/reaction`, {
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
            <div className="flex items-center">
              <AvatarWithDropdown
                user={{
                  id: article.author.id,
                  name: article.author.name,
                  avatar: article.author.avatar,
                }}
                size="md"
                showName={true}
                className="mr-2"
              />
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              {new Date(article.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {typeof (article as any).views === 'number' && (
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
                {(article as any).views}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={`transition-colors duration-200 ${
                isLiked
                  ? 'border-green-600 text-green-600 hover:border-green-700 hover:bg-green-50'
                  : 'hover:border-green-600 hover:text-green-600'
              }`}
            >
              <ThumbsUp
                className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                  isLiked ? 'fill-current text-green-600' : 'text-gray-500'
                }`}
              />
              {likeCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlike}
              className={`transition-colors duration-200 ${
                isUnliked
                  ? 'border-red-600 text-red-600 hover:border-red-700 hover:bg-red-50'
                  : 'hover:border-red-600 hover:text-red-600'
              }`}
            >
              <ThumbsDown
                className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                  isUnliked ? 'fill-current text-red-600' : 'text-gray-500'
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
