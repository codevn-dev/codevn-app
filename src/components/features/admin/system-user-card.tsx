import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Trash2, Settings } from 'lucide-react';
import { useI18n } from '@/components/providers';
import { SystemUserResponse } from '@/types/shared/auth';

interface SystemUserCardProps {
  systemUser: SystemUserResponse;
  onEdit: (systemUser: SystemUserResponse) => void;
  onDelete: (systemUser: SystemUserResponse) => void;
  onAction: (systemUser: SystemUserResponse) => void;
}

export function SystemUserCard({ systemUser, onEdit, onDelete, onAction }: SystemUserCardProps) {
  const { t } = useI18n();

  return (
    <Card className="transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={systemUser.avatar} alt={systemUser.name} />
              <AvatarFallback className="text-sm font-bold">
                {systemUser.name?.charAt(0).toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1 sm:ml-4">
              <div className="mb-2 flex items-center gap-2 sm:gap-3">
                <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
                  {systemUser.name}
                </h3>
                <span className="text-xs font-medium text-blue-600">{t('common.role.system')}</span>
              </div>
              <div className="text-xs text-gray-500 sm:text-sm">
                <span>{systemUser.email}</span>
              </div>
            </div>
          </div>
          <div className="ml-0 flex space-x-2 sm:ml-4">
            <Button variant="primary" size="sm" onClick={() => onAction(systemUser)}>
              <Settings className="mr-1 h-4 w-4" />
              {t('common.action')}
            </Button>
            <Button variant="back" size="sm" onClick={() => onEdit(systemUser)}>
              <Edit className="mr-1 h-4 w-4" />
              {t('common.edit')}
            </Button>
            <Button
              variant="back"
              size="sm"
              onClick={() => onDelete(systemUser)}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
