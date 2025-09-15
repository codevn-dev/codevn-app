import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal' | 'dots' | 'pulse';
  className?: string;
  fullScreen?: boolean;
}

const LoadingScreen = React.forwardRef<HTMLDivElement, LoadingScreenProps>(
  (
    { message = '', size = 'lg', variant = 'default', className, fullScreen = true, ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    const containerClasses = fullScreen
      ? 'flex items-center justify-center min-h-screen bg-background'
      : 'flex items-center justify-center p-8';

    const renderSpinner = () => {
      switch (variant) {
        case 'minimal':
          return (
            <div
              className={cn(
                'border-muted border-t-primary animate-spin rounded-full border-2',
                sizeClasses[size]
              )}
            />
          );

        case 'dots':
          return (
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'bg-primary animate-pulse rounded-full',
                    size === 'sm'
                      ? 'h-2 w-2'
                      : size === 'md'
                        ? 'h-3 w-3'
                        : size === 'lg'
                          ? 'h-4 w-4'
                          : 'h-5 w-5'
                  )}
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s',
                  }}
                />
              ))}
            </div>
          );

        case 'pulse':
          return <div className={cn('bg-primary animate-pulse rounded-full', sizeClasses[size])} />;

        default:
          return (
            <div className="relative">
              {/* Outer ring */}
              <div
                className={cn(
                  'border-muted border-t-primary animate-spin rounded-full border-2',
                  sizeClasses[size]
                )}
              />
              {/* Inner ring */}
              <div
                className={cn(
                  'border-primary/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform animate-spin rounded-full border border-t-transparent',
                  size === 'sm'
                    ? 'h-2 w-2'
                    : size === 'md'
                      ? 'h-3 w-3'
                      : size === 'lg'
                        ? 'h-4 w-4'
                        : 'h-6 w-6'
                )}
                style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
              />
            </div>
          );
      }
    };

    return (
      <div ref={ref} className={cn(containerClasses, className)} {...props}>
        <div className="space-y-4 text-center">
          <div className="flex justify-center">{renderSpinner()}</div>
          {message && (
            <div className="space-y-2">
              <p className="text-muted-foreground animate-pulse text-sm font-medium">{message}</p>
              {variant === 'default' && (
                <div className="flex justify-center space-x-1">
                  <div
                    className="bg-primary h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: '0s' }}
                  />
                  <div
                    className="bg-primary h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="bg-primary h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

LoadingScreen.displayName = 'LoadingScreen';

export { LoadingScreen };
