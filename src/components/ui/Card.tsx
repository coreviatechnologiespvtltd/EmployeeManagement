import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
}

export function Card({ className, interactive, padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-100 bg-white shadow-card",
        padded && "p-5",
        interactive &&
          "transition-shadow duration-150 hover:border-brand-200 hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-sm font-semibold text-ink-900", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-xs text-ink-500", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-card border border-ink-100 bg-white shadow-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
