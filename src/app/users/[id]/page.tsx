'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {
  User,
  Mail,
  Calendar,
  Shield,
  ArrowLeft,
  MessageCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly } from '@/components/layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChat } from '@/components/features/chat/chat-context';
import { formatDate } from '@/lib/utils';
import { apiGet } from '@/lib/utils/api-client';

import { User as UserProfile } from '@/types/shared/auth';
import { UserResponse } from '@/types/shared/user';
import { useI18n } from '@/components/providers';

function UserProfileContent() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading } = useAuthState();
  const { handleStartChat } = useChat();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = params.id as string;

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch user profile
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError('');

        // Use the same API - it will handle role-based masking
        const data = await apiGet<UserResponse>(`/api/users/${userId}`);
        setProfile(data.user);
      } catch {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, isAuthenticated, isLoading, router]);

  const handleBack = () => {
    router.back();
  };

  const handleMessage = () => {
    if (profile) {
      handleStartChat(profile.id, profile.name, profile.avatar || undefined);
    }
  };

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
          <CardBody className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">{t('profile.notFound')}</h2>
            <p className="mb-6 text-gray-600">{error}</p>
            <Button onClick={handleBack} variant="back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back') || 'Back'}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t('profile.notFound')}</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button onClick={handleBack} variant="back" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar || undefined} alt={profile.name} />
              <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-2xl text-white">
                {profile.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-6">
              <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
              <p className="mt-2 text-gray-600">
                {isOwnProfile ? t('profile.yourProfile') : t('profile.userProfile')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('common.fullName')}</label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <div className="py-2 pl-10 text-gray-900">{profile.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('profile.emailAddress')}
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <div className="py-2 pl-10 text-gray-900">{profile.email}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                <CardBody className="flex flex-row items-center p-4">
                  <Shield className="mr-3 h-5 w-5 text-[#B8956A]" />
                  <div>
                    <p className="text-brand-600 mb-1 font-semibold">
                      {profile.role === 'admin' ? t('common.role.admin') : t('common.role.user')}
                    </p>
                    <p className="text-brand-600 text-sm">{t('profile.accessLevel')}</p>
                  </div>
                </CardBody>
              </Card>

              <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                <CardBody className="flex flex-row items-center p-4">
                  <Calendar className="mr-3 h-5 w-5 text-[#B8956A]" />
                  <div>
                    <p className="text-brand-600 font-semibold">{formatDate(profile.createdAt)}</p>
                    <p className="text-brand-600 text-sm">{t('profile.memberSince')}</p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* User Statistics */}
            {profile.statistics && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                  <CardBody className="flex flex-row items-center p-4">
                    <FileText className="mr-3 h-5 w-5 text-[#B8956A]" />
                    <div>
                      <p className="text-brand-600 text-2xl font-bold">
                        {profile.statistics.totalArticles}
                      </p>
                      <p className="text-brand-600 text-sm">{t('profile.totalArticles')}</p>
                    </div>
                  </CardBody>
                </Card>

                <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                  <CardBody className="flex flex-row items-center p-4">
                    <MessageSquare className="mr-3 h-5 w-5 text-[#B8956A]" />
                    <div>
                      <p className="text-brand-600 text-2xl font-bold">
                        {profile.statistics.totalComments}
                      </p>
                      <p className="text-brand-600 text-sm">
                        {t('profile.totalComments') || 'Total Comments'}
                      </p>
                    </div>
                  </CardBody>
                </Card>

                <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                  <CardBody className="flex flex-row items-center p-4">
                    <ThumbsUp className="mr-3 h-5 w-5 text-[#B8956A]" />
                    <div>
                      <p className="text-brand-600 text-2xl font-bold">
                        {profile.statistics.totalLikes}
                      </p>
                      <p className="text-brand-600 text-sm">
                        {t('profile.totalLikes') || 'Total Likes'}
                      </p>
                    </div>
                  </CardBody>
                </Card>

                <Card className="border-brand/30 shadow-brand/20 rounded-2xl border bg-white shadow-md">
                  <CardBody className="flex flex-row items-center p-4">
                    <ThumbsDown className="mr-3 h-5 w-5 text-[#B8956A]" />
                    <div>
                      <p className="text-brand-600 text-2xl font-bold">
                        {profile.statistics.totalDislikes}
                      </p>
                      <p className="text-brand-600 text-sm">
                        {t('profile.totalDislikes') || 'Total Dislikes'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {!isOwnProfile && (
              <div className="flex justify-end pt-6">
                <Button onClick={handleMessage} variant="primary" size="lg">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('chat.sendMessage') || 'Send Message'}
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading profile..." size="lg" variant="default" />}
    >
      <UserProfileContent />
    </ClientOnly>
  );
}
