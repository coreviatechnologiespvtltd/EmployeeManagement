"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/EmptyState";

export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-8">
      <ErrorState
        title="We could not load this page"
        description="Something went wrong while fetching the data. This is usually temporary."
        onRetry={reset}
      />
    </div>
  );
}
