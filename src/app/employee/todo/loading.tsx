import { ListPageSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return <ListPageSkeleton rows={4} columns={4} stats={4} />;
}
