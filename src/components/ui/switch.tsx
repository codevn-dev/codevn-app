'use client';

import * as React from 'react';
import { clsx } from 'clsx';

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  labels?: { on: string; off: string };
  variant?: 'toggle' | 'pill';
}

export function Switch({
  checked,
  onCheckedChange,
  size = 'md',
  labels,
  className,
  variant = 'toggle',
  ...props
}: SwitchProps) {
  const width = size === 'sm' ? 'w-12' : 'w-14';
  const height = size === 'sm' ? 'h-6' : 'h-7';
  const knob = size === 'sm' ? 'h-5 w-6' : 'h-6 w-7';
  const labelTextClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={clsx(
        'bg-brand relative inline-flex shrink-0 cursor-pointer touch-none items-center justify-center rounded-full border-0 text-white outline-none select-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
        width,
        height,
        'px-2',
        className
      )}
      {...props}
    >
      {labels && variant === 'pill' ? (
        <span
          className={clsx(
            'pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-white'
          )}
        >
          {checked ? labels.on : labels.off}
        </span>
      ) : null}
      {variant === 'toggle' ? (
        <span
          className={clsx(
            'pointer-events-none absolute inline-flex items-center justify-center rounded-full bg-white shadow',
            'top-0.5',
            knob,
            checked ? 'right-1' : 'left-1'
          )}
        >
          {labels ? (
            <span className={clsx('text-brand leading-none font-semibold', labelTextClass)}>
              {checked ? labels.on : labels.off}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
