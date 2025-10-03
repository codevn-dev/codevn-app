'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onContainerClick?: () => void;
}

export function AvatarWithDropdown({
  user,
  size = 'md',
  showName = false,
  className = '',
  onContainerClick,
}: AvatarWithDropdownProps) {
  const { user: currentUser, isAuthenticated } = useAuthState();
  const { handleStartChat } = useChat();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

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

  // Close dropdown when clicking outside (respect portal content)
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideTrigger = dropdownRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);
      if (clickedInsideTrigger || clickedInsideMenu) return;
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  // Expose toggle function to parent
  useEffect(() => {
    if (onContainerClick) {
      onContainerClick();
    }
  }, [onContainerClick]);

  // Compute dropdown position relative to viewport to avoid stacking context issues
  const updatePosition = () => {
    const el = dropdownRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + 8; // gap 8px
    let left = rect.left;
    // Prevent overflow right side (assumes ~160-200px menu width)
    const menuWidth = 200;
    const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 0) - menuWidth - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    setDropdownPos({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  const handleChat = () => {
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setIsOpen(false);
      return;
    }
    handleStartChat(user.id, user.name || 'Unknown', user.avatar);
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
          className="h-auto p-0 select-none hover:bg-transparent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-white">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {showName && (
              <span className={`font-medium ${textSizeClasses[size]}`}>
                {user.name || 'Unknown'}
              </span>
            )}
          </div>
        </Button>

        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                zIndex: 9999,
              }}
              className="shadow-brand/40 mt-2 w-40 rounded-2xl bg-white/95 shadow-2xl drop-shadow-2xl backdrop-blur-md"
            >
              <div className="py-1">
                {/* View Profile button for current user */}
                <div className="py-1">
                  <button
                    onClick={handleViewProfile}
                    className="hover:bg-brand/10 flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 transition-colors"
                  >
                    <UserIcon className="h-4 w-4 text-gray-900" />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        className="h-auto p-0 select-none hover:bg-transparent"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {showName && (
            <span className={`font-medium ${textSizeClasses[size]}`}>{user.name || 'Unknown'}</span>
          )}
        </div>
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
            }}
            className="shadow-brand/40 mt-2 w-40 rounded-2xl bg-white/95 shadow-2xl drop-shadow-2xl backdrop-blur-md"
          >
            <div className="py-1">
              {/* View Profile button */}
              <div className="py-1">
                <button
                  onClick={handleViewProfile}
                  className="hover:bg-brand/10 flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-gray-900" />
                  <span>View Profile</span>
                </button>
              </div>
              {/* Chat button */}
              <div className="py-1">
                <button
                  onClick={handleChat}
                  className="hover:bg-brand/10 flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-gray-900" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
