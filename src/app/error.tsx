"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Replace with your error reporting service in production.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md">
        <ErrorState
          title="This page could not be loaded"
          description="An unexpected error occurred. Try again, and if the problem persists contact support."
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={reset}>Reload page</Button>
        </div>
      </div>
    </div>
  );
}
