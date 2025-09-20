'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChat } from '@/components/features/chat/chat-context';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

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
  className = '' 
}: AvatarWithDropdownProps) {
  const { user: currentUser } = useAuth();
  const { handleStartChat } = useChat();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't show dropdown for current user
  const isCurrentUser = currentUser?.id === user.id;
  
  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
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
    handleStartChat(user.id, user.name, user.avatar);
    setIsOpen(false);
  };

  const handleViewProfile = () => {
    router.push(`/users/${user.id}`);
    setIsOpen(false);
  };

  if (isCurrentUser) {
    // Show avatar with dropdown for current user (only View Profile option)
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <Button
          variant="ghost"
          className="p-0 h-auto hover:bg-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {showName && (
              <span className={`font-medium ${textSizeClasses[size]}`}>
                {user.name}
              </span>
            )}
          </div>
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50">
            <div className="py-1">
              {/* View Profile button for current user */}
              <div className="py-1">
                <button
                  onClick={handleViewProfile}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="h-4 w-4 text-green-600" />
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
        className="p-0 h-auto hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showName && (
            <span className={`font-medium ${textSizeClasses[size]}`}>
              {user.name}
            </span>
          )}
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {/* View Profile button */}
            <div className="py-1">
              <button
                onClick={handleViewProfile}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 text-green-600" />
                <span>View Profile</span>
              </button>
            </div>
            {/* Chat button */}
            <div className="py-1">
              <button
                onClick={handleChat}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
