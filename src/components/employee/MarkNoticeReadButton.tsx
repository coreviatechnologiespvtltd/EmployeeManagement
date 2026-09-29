"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { markNoticeReadAction } from "@/app/employee/actions";
import { CheckCheck } from "lucide-react";

export function MarkNoticeReadButton({ noticeId }: { noticeId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      isLoading={pending}
      loadingText="Marking…"
      onClick={() =>
        startTransition(async () => {
          const result = await markNoticeReadAction(noticeId);
          toast(result.message, result.success ? "success" : "error");
          router.refresh();
        })
      }
    >
      <CheckCheck aria-hidden className="h-4 w-4" />
      Mark as read
    </Button>
  );
}
