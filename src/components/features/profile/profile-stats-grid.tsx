'use client';

import { Card, CardBody } from '@/components/ui/card';
import { MotionContainer } from '@/components/layout';
import { FileText, MessageSquare, ThumbsDown, ThumbsUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers';
import type { ComponentType } from 'react';

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

interface StatItem {
  Icon: ComponentType<any>;
  value: number;
  label: string;
}

export function ProfileStatsGrid({ statistics, className }: ProfileStatsGridProps) {
  const { t } = useI18n();

  if (!statistics) return null;

  const items: StatItem[] = [
    {
      Icon: FileText,
      value: statistics.publishedArticles ?? statistics.totalArticles ?? 0,
      label: t('profile.totalArticles'),
    },
    {
      Icon: Eye,
      value: statistics.totalViews ?? 0,
      label: t('profile.totalViews'),
    },
    {
      Icon: ThumbsUp,
      value: statistics.totalLikes ?? 0,
      label: t('profile.totalLikes'),
    },
    {
      Icon: ThumbsDown,
      value: statistics.totalDislikes ?? 0,
      label: t('profile.totalDislikes'),
    },
    {
      Icon: MessageSquare,
      value: statistics.totalComments ?? 0,
      label: t('profile.totalComments'),
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5', className)}>
      {items.map(({ Icon, value, label }, idx) => (
        <MotionContainer key={idx}>
          <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
            <CardBody className="flex flex-row items-center p-4">
              <Icon className="text-brand mr-3 h-5 w-5" />
              <div>
                <p className="text-brand-600 text-2xl font-bold">{value}</p>
                <p className="text-brand-600 text-sm">{label}</p>
              </div>
            </CardBody>
          </Card>
        </MotionContainer>
      ))}
    </div>
  );
}

export default ProfileStatsGrid;