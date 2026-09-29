import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
      <div className="border-b border-ink-100 px-5 py-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-ink-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton key={colIndex} className={cn("h-3.5", colIndex === 0 ? "w-40" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <Skeleton className="h-4 w-3/4" />
          <SkeletonText lines={3} className="mt-4" />
        </div>
      ))}
    </div>
  );
}
