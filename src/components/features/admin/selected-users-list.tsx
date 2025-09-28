import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/components/providers';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SelectedUsersListProps {
  selectedUsers: User[];
  selectedUserIds: string[];
  onRemoveUser: (userId: string) => void;
  onClearAll: () => void;
}

export function SelectedUsersList({
  selectedUsers,
  selectedUserIds,
  onRemoveUser,
  onClearAll,
}: SelectedUsersListProps) {
  const { t } = useI18n();

  if (selectedUserIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {t('common.selectedUsers')} ({selectedUserIds.length})
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-destructive hover:text-destructive/80 text-xs"
        >
          {t('common.clearAll')}
        </Button>
      </div>
      <div className="max-h-32 space-y-2 overflow-y-auto">
        {selectedUsers.map((user) => (
          <div key={user.id} className="flex items-center space-x-3 rounded p-2 hover:bg-gray-50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
              <div className="truncate text-xs text-gray-500">{user.email}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveUser(user.id)}
              className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
