'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingArticle() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-gray-400/80">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          <div className="mb-4">
            <Skeleton className="h-6 w-28" />
          </div>

          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-2/3" />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


