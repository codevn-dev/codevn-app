'use client';

import { X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const colorMap = {
  success: 'bg-green-50 border-2 border-green-300 text-green-800 shadow-lg shadow-green-200/50',
  error: 'bg-red-50 border-2 border-red-300 text-red-800 shadow-lg shadow-red-200/50',
  warning: 'bg-yellow-50 border-2 border-yellow-300 text-yellow-800 shadow-lg shadow-yellow-200/50',
  info: 'bg-white border-2 border-brand text-gray-800 shadow-lg shadow-brand/30',
};

export function Notification() {
  const { notifications, removeNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[120] space-y-2">
      {notifications.map((notification) => {
        return (
          <Card
            key={notification.id}
            className={`animate-slide-in w-60 ${colorMap[notification.type]} ${
              notification.action
                ? 'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl'
                : ''
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
