'use client';

import { Card, CardBody } from '@/components/ui/card';
import { MotionContainer } from '@/components/layout';
import { Calendar, FileText, MessageSquare, ThumbsDown, ThumbsUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers';

interface ProfileStatistics {
  totalArticles?: number;
  publishedArticles?: number;
  totalComments?: number;
  totalLikes?: number;
  totalDislikes?: number;
  totalViews?: number;
}

interface ProfileStatsGridProps {
  statistics?: ProfileStatistics | null;
  className?: string;
}

export function ProfileStatsGrid({ statistics, className }: ProfileStatsGridProps) {
  const { t } = useI18n();

  if (!statistics) return null;

  return (
    <div className={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5', className)}>
      <MotionContainer>
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="flex flex-row items-center p-4">
            <FileText className="text-brand mr-3 h-5 w-5" />
            <div>
              <p className="text-brand-600 text-2xl font-bold">
                {statistics.publishedArticles ?? statistics.totalArticles ?? 0}
              </p>
              <p className="text-brand-600 text-sm">{t('profile.totalArticles')}</p>
            </div>
          </CardBody>
        </Card>
      </MotionContainer>

      <MotionContainer>
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="flex flex-row items-center p-4">
            <Eye className="text-brand mr-3 h-5 w-5" />
            <div>
              <p className="text-brand-600 text-2xl font-bold">{statistics.totalViews ?? 0}</p>
              <p className="text-brand-600 text-sm">{t('profile.totalViews') || 'Total Views'}</p>
            </div>
          </CardBody>
        </Card>
      </MotionContainer>

      <MotionContainer>
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="flex flex-row items-center p-4">
            <ThumbsUp className="text-brand mr-3 h-5 w-5" />
            <div>
              <p className="text-brand-600 text-2xl font-bold">{statistics.totalLikes ?? 0}</p>
              <p className="text-brand-600 text-sm">{t('profile.totalLikes') || 'Total Likes'}</p>
            </div>
          </CardBody>
        </Card>
      </MotionContainer>

      <MotionContainer>
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="flex flex-row items-center p-4">
            <ThumbsDown className="text-brand mr-3 h-5 w-5" />
            <div>
              <p className="text-brand-600 text-2xl font-bold">{statistics.totalDislikes ?? 0}</p>
              <p className="text-brand-600 text-sm">
                {t('profile.totalDislikes') || 'Total Dislikes'}
              </p>
            </div>
          </CardBody>
        </Card>
      </MotionContainer>

      <MotionContainer>
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="flex flex-row items-center p-4">
            <MessageSquare className="text-brand mr-3 h-5 w-5" />
            <div>
              <p className="text-brand-600 text-2xl font-bold">{statistics.totalComments ?? 0}</p>
              <p className="text-brand-600 text-sm">
                {t('profile.totalComments') || 'Total Comments'}
              </p>
            </div>
          </CardBody>
        </Card>
      </MotionContainer>
    </div>
  );
}

export default ProfileStatsGrid;