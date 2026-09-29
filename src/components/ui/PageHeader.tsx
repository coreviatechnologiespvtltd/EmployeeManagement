import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: Route }>;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight aria-hidden className="h-3 w-3 text-ink-300" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-brand-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-ink-700">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
