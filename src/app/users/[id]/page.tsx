'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { User, Mail, Calendar, Shield, ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly } from '@/components/layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChat } from '@/components/features/chat/chat-context';
import { formatDate } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: string;
  createdAt: string;
}

function UserProfileContent() {
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
        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found');
          } else {
            setError('Failed to load user profile');
          }
          return;
        }

        const data = await response.json();
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardBody className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">User Not Found</h2>
            <p className="mb-6 text-gray-600">{error}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar || undefined} alt={profile.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-2xl text-white">
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-6">
              <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
              <p className="mt-2 text-gray-600">{isOwnProfile ? 'Your Profile' : 'User Profile'}</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <div className="py-2 pl-10 text-gray-900">{profile.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <div className="py-2 pl-10 text-gray-900">{profile.email}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-blue-200 bg-blue-50">
                <CardBody className="flex flex-row items-center p-4">
                  <Shield className="mr-3 h-5 w-5 text-blue-500" />
                  <div>
                    <Badge className="mb-1">
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </Badge>
                    <p className="text-sm text-blue-700">Access level</p>
                  </div>
                </CardBody>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardBody className="flex flex-row items-center p-4">
                  <Calendar className="mr-3 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-800">{formatDate(profile.createdAt)}</p>
                    <p className="text-sm text-green-700">Member since</p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {!isOwnProfile && (
              <div className="flex justify-end border-t border-gray-200 pt-6">
                <Button onClick={handleMessage} size="lg">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
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
