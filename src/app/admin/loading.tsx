import { SkeletonStats, SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-ink-100" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-ink-100" />
      </div>
      <SkeletonStats count={6} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonTable rows={5} columns={4} />
        <SkeletonTable rows={5} columns={3} />
      </div>
    </div>
  );
}
