import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/components/providers';

// Simple checkbox component
const Checkbox = ({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
  />
);

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserSearchDropdownProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  candidateUsers: User[];
  selectedUserIds: string[];
  onUserSelection: (userId: string, checked: boolean) => void;
  userSearchLoading: boolean;
  userPagination: { page: number; hasMore: boolean };
  onLoadMore: () => void;
}

export function UserSearchDropdown({
  searchTerm,
  onSearchChange,
  candidateUsers,
  selectedUserIds,
  onUserSelection,
  userSearchLoading,
  userPagination,
  onLoadMore,
}: UserSearchDropdownProps) {
  const { t } = useI18n();

  const filteredUsers = candidateUsers.filter((user) => !selectedUserIds.includes(user.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder={t('common.searchUsersPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-8"
        />
        {userSearchLoading && (
          <div className="absolute top-1/2 right-2 -translate-y-1/2 transform">
            <div className="border-t-primary h-4 w-4 animate-spin rounded-full border-2 border-gray-300" />
          </div>
        )}
      </div>

      {searchTerm.trim() && (
        <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredUsers.length === 0 && !userSearchLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">
              <div className="mb-2">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              {t('common.noUsersFound')}
            </div>
          ) : (
            <>
              <div className="sticky top-0 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
                Found {filteredUsers.length} users
              </div>
              <div className="p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked: boolean) => onUserSelection(user.id, checked)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label htmlFor={`user-${user.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {userPagination.hasMore && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={userSearchLoading}
                    className="text-primary hover:text-primary/80 w-full"
                  >
                    {userSearchLoading ? (
                      <>
                        <div className="border-t-primary mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
