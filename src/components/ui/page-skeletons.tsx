import { Skeleton } from "@/components/ui/Skeleton";

export function ListPageSkeleton({ rows = 6, columns = 5, stats = 0 }: { rows?: number; columns?: number; stats?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {stats > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
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
      )}

      <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="divide-y divide-ink-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <Skeleton key={colIndex} className={colIndex === 0 ? "h-4 w-44" : "h-3.5 flex-1"} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <Skeleton className="h-4 w-40" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className={index % 3 === 2 ? "h-3 w-3/4" : "h-3 w-full"} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
