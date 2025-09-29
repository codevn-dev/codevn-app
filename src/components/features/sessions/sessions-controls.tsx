'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers';

type ViewMode = 'all' | 'current' | 'other';

interface SessionsControlsProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function SessionsControls({ viewMode, onChange }: SessionsControlsProps) {
  const { t } = useI18n();
  return (
    <div className="sticky top-16 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
      <div className="flex gap-1 sm:gap-2">
        {[
          { key: 'all', label: t('sessions.allSessions') },
          { key: 'current', label: t('sessions.current') },
          { key: 'other', label: t('sessions.otherDevices') },
        ].map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={viewMode === (key as ViewMode) ? 'default' : 'back'}
            onClick={() => onChange(key as ViewMode)}
            className={`flex-1 px-2 py-1.5 text-xs transition-all sm:flex-none sm:px-3 ${
              viewMode === key ? 'bg-brand text-white shadow-md' : 'hover:bg-gray-100'
            }`}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
