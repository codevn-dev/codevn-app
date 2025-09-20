'use client';

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

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
        const Icon = iconMap[notification.type];
        return (
          <Card
            key={notification.id}
            className={`animate-slide-in max-w-sm ${colorMap[notification.type]} ${
              notification.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
            }`}
            onClick={notification.action ? notification.action.onClick : undefined}
          >
            <CardBody className="p-3">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                  <p className="text-xs text-gray-600 truncate">{notification.message}</p>
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
