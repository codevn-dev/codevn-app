'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

interface ChatDropdownProps {
  onStartChat: (userId: string, userName: string) => void;
}

export function ChatDropdown({ onStartChat }: ChatDropdownProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 rounded-md border border-gray-200 bg-white shadow-lg"
        align="end"
        forceMount
      >
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <MessageCircle className="h-4 w-4" />
            Chat với bạn bè
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            Đang tải...
          </div>
        ) : users.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            Không có người dùng nào
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {users.map((userItem) => (
              <DropdownMenuItem
                key={userItem.id}
                className="cursor-pointer px-3 py-2 hover:bg-gray-50 focus:bg-gray-50"
                onClick={() => onStartChat(userItem.id, userItem.name || userItem.email)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userItem.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-xs">
                      {(userItem.name || userItem.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {userItem.name || userItem.email}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {userItem.email}
                    </div>
                  </div>
                  <MessageCircle className="h-4 w-4 text-gray-400" />
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <Users className="mr-2 h-4 w-4" />
          Xem tất cả bạn bè
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

