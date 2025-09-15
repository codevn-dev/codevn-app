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
  info: 'bg-blue-50 border-blue-200 text-blue-800',
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
            className={`animate-slide-in max-w-sm ${colorMap[notification.type]}`}
          >
            <CardBody className="p-4">
              <div className="flex items-start">
                <Icon className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="mt-1 text-sm">{notification.message}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeNotification(notification.id)}
                  className="ml-3 h-8 w-8 flex-shrink-0 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
