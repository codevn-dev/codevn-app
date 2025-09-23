'use client';

import { Card, CardBody } from '@/components/ui/card';
import { MotionContainer } from '@/components/layout';
import { Calendar, FileText, MessageSquare, Shield, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers';

interface ProfileStatistics {
  totalArticles?: number;
  totalComments?: number;
  totalLikes?: number;
  totalDislikes?: number;
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
  const { t } = useI18n();
  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MotionContainer>
          <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
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
          <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
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

      {statistics && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MotionContainer>
            <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
              <CardBody className="flex flex-row items-center p-4">
                <FileText className="text-brand mr-3 h-5 w-5" />
                <div>
                  <p className="text-brand-600 text-2xl font-bold">
                    {statistics.totalArticles ?? 0}
                  </p>
                  <p className="text-brand-600 text-sm">{t('profile.totalArticles')}</p>
                </div>
              </CardBody>
            </Card>
          </MotionContainer>

          <MotionContainer>
            <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
              <CardBody className="flex flex-row items-center p-4">
                <MessageSquare className="text-brand mr-3 h-5 w-5" />
                <div>
                  <p className="text-brand-600 text-2xl font-bold">
                    {statistics.totalComments ?? 0}
                  </p>
                  <p className="text-brand-600 text-sm">
                    {t('profile.totalComments') || 'Total Comments'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </MotionContainer>

          <MotionContainer>
            <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
              <CardBody className="flex flex-row items-center p-4">
                <ThumbsUp className="text-brand mr-3 h-5 w-5" />
                <div>
                  <p className="text-brand-600 text-2xl font-bold">{statistics.totalLikes ?? 0}</p>
                  <p className="text-brand-600 text-sm">
                    {t('profile.totalLikes') || 'Total Likes'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </MotionContainer>

          <MotionContainer>
            <Card className="rounded-2xl bg-white shadow-2xl shadow-gray-400/80">
              <CardBody className="flex flex-row items-center p-4">
                <ThumbsDown className="text-brand mr-3 h-5 w-5" />
                <div>
                  <p className="text-brand-600 text-2xl font-bold">
                    {statistics.totalDislikes ?? 0}
                  </p>
                  <p className="text-brand-600 text-sm">
                    {t('profile.totalDislikes') || 'Total Dislikes'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </MotionContainer>
        </div>
      )}
    </div>
  );
}
