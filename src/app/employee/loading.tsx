import { SkeletonStats, SkeletonTable } from "@/components/ui/Skeleton";

export default function EmployeeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-ink-100" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-ink-100" />
      </div>
      <SkeletonStats />
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}
