'use client';

import { X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-white border-gray-200 text-gray-800 shadow-lg',
};

export function Notification() {
  const { notifications, removeNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => {
        return (
          <Card
            key={notification.id}
            className={`animate-slide-in max-w-sm ${colorMap[notification.type]} ${
              notification.action ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
            }`}
            onClick={notification.action ? notification.action.onClick : undefined}
          >
            <CardBody className="p-3">
              <div className="flex items-center">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium">{notification.title}</h4>
                  <p className="truncate text-xs text-gray-600">{notification.message}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="ml-2 h-6 w-6 flex-shrink-0 p-0 hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
