'use client';

import { Card, CardBody } from '@/components/ui/card';
import { MotionContainer } from '@/components/layout';
import { Calendar, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileStatsGrid from '@/components/features/profile/profile-stats-grid';

interface ProfileStatistics {
  totalArticles?: number;
  publishedArticles?: number;
  totalComments?: number;
  totalLikes?: number;
  totalDislikes?: number;
  totalViews?: number;
}

interface ProfileInfoStatsProps {
  roleLabel: string;
  createdAtLabel: string;
  role: string;
  createdAtFormatted: string;
  statistics?: ProfileStatistics | null;
  className?: string;
}

export function ProfileInfoStats({
  roleLabel,
  createdAtLabel,
  role,
  createdAtFormatted,
  statistics,
  className,
}: ProfileInfoStatsProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MotionContainer>
          <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
            <CardBody className="flex flex-row items-center p-4">
              <Shield className="text-brand mr-3 h-5 w-5" />
              <div>
                <p className="text-brand-600 mb-1 font-semibold">{role}</p>
                <p className="text-brand-600 text-sm">{roleLabel}</p>
              </div>
            </CardBody>
          </Card>
        </MotionContainer>

        <MotionContainer>
          <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
            <CardBody className="flex flex-row items-center p-4">
              <Calendar className="text-brand mr-3 h-5 w-5" />
              <div>
                <p className="text-brand-600 font-semibold">{createdAtFormatted}</p>
                <p className="text-brand-600 text-sm">{createdAtLabel}</p>
              </div>
            </CardBody>
          </Card>
        </MotionContainer>
      </div>

      {statistics && <ProfileStatsGrid statistics={statistics} />}
    </div>
  );
}
