import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="rounded-full bg-brand-50 p-3.5 text-brand-500">
        <Icon aria-hidden className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this data. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-danger-100 bg-danger-50/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="rounded-full bg-danger-100 p-3.5 text-danger-600">
        <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-600">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
