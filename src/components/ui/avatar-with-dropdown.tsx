'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, User as UserIcon } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { useChat } from '@/components/features/chat/chat-context';
import { useUIStore } from '@/stores/ui-store';
import { useRouter } from 'next/navigation';
import { User } from '@/types/shared';

interface AvatarWithDropdownProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function AvatarWithDropdown({
  user,
  size = 'md',
  showName = false,
  className = '',
}: AvatarWithDropdownProps) {
  const { user: currentUser, isAuthenticated } = useAuthState();
  const { handleStartChat } = useChat();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't show dropdown for current user
  const isCurrentUser = currentUser?.id === user.id;

  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChat = () => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setIsOpen(false);
      return;
    }
    handleStartChat(user.id, user.name, user.avatar);
    setIsOpen(false);
  };

  const handleViewProfile = () => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setIsOpen(false);
      return;
    }
    router.push(`/users/${user.id}`);
    setIsOpen(false);
  };

  if (isCurrentUser) {
    // Show avatar with dropdown for current user (only View Profile option)
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#B8956A] to-[#A6825A] text-white">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {showName && (
              <span className={`font-medium ${textSizeClasses[size]}`}>{user.name}</span>
            )}
          </div>
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="py-1">
              {/* View Profile button for current user */}
              <div className="py-1">
                <button
                  onClick={handleViewProfile}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <UserIcon className="h-4 w-4 text-green-600" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[#B8956A] to-[#A6825A] text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showName && <span className={`font-medium ${textSizeClasses[size]}`}>{user.name}</span>}
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="py-1">
            {/* View Profile button */}
            <div className="py-1">
              <button
                onClick={handleViewProfile}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <UserIcon className="h-4 w-4 text-green-600" />
                <span>View Profile</span>
              </button>
            </div>
            {/* Chat button */}
            <div className="py-1">
              <button
                onClick={handleChat}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span>Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
