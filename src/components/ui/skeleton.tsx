'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: string;
  className?: string;
}

export function Skeleton({ rounded = 'rounded-md', className = '', ...rest }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 ${rounded} ${className}`} {...rest}>
      <div className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.2s_linear_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
