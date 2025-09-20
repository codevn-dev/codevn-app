'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { Search, Users, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ClientOnly } from '@/components/layout';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt: string;
}

function UsersPageContent() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch users
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/users');
        
        if (!response.ok) {
          setError('Failed to load users');
          return;
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated, isLoading, router]);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Users</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
        <p className="text-gray-600">Discover and connect with other users in the community</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card className="shadow-lg">
          <CardBody className="py-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {searchTerm ? 'No users found' : 'No users available'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Users will appear here once they register'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center space-x-4">
                  <AvatarWithDropdown
                    user={{
                      id: user.id,
                      name: user.name,
                      avatar: user.avatar || undefined,
                      role: user.role,
                    }}
                    size="lg"
                    showName={false}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        <button
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {user.name}
                        </button>
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading users..." size="lg" variant="default" />}
    >
      <UsersPageContent />
    </ClientOnly>
  );
}
