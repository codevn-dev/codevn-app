import * as React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse';
  color?: 'primary' | 'muted' | 'current';
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', variant = 'default', color = 'primary', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    const colorClasses = {
      primary: 'border-primary border-t-transparent',
      muted: 'border-muted-foreground border-t-transparent',
      current: 'border-current border-t-transparent',
    };

    if (variant === 'dots') {
      return (
        <div ref={ref} className={cn('flex space-x-1', className)} {...props}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'animate-pulse rounded-full',
                color === 'primary'
                  ? 'bg-primary'
                  : color === 'muted'
                    ? 'bg-muted-foreground'
                    : 'bg-current',
                size === 'xs'
                  ? 'h-1 w-1'
                  : size === 'sm'
                    ? 'h-1.5 w-1.5'
                    : size === 'md'
                      ? 'h-2 w-2'
                      : size === 'lg'
                        ? 'h-2.5 w-2.5'
                        : 'h-3 w-3'
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          className={cn(
            'animate-pulse rounded-full',
            color === 'primary'
              ? 'bg-primary'
              : color === 'muted'
                ? 'bg-muted-foreground'
                : 'bg-current',
            sizeClasses[size],
            className
          )}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2',
          colorClasses[color],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner };
