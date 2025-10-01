'use client';

import { Monitor, Smartphone, Tablet, Terminal } from 'lucide-react';

export function getDeviceIcon(deviceType?: string) {
  switch (deviceType) {
    case 'Mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'Tablet':
      return <Tablet className="h-5 w-5" />;
    case 'Desktop':
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

export function getOSIcon(os?: string) {
  if (!os) return <Terminal className="h-4 w-4" />;
  switch (os.toLowerCase()) {
    case 'windows':
      return <Monitor className="h-4 w-4" />;
    case 'macos':
    case 'mac':
      return <Monitor className="h-4 w-4" />;
    case 'linux':
      return <Terminal className="h-4 w-4" />;
    case 'android':
      return <Smartphone className="h-4 w-4" />;
    case 'ios':
      return <Smartphone className="h-4 w-4" />;
    default:
      return <Terminal className="h-4 w-4" />;
  }
}

export function formatRelativeTime(dateString?: string) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}
