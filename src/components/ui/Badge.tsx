import { cn } from "@/lib/cn";
import { toneClasses, type Tone } from "@/lib/status";
import type { LucideIcon } from "lucide-react";

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  dot?: boolean;
}

const dotClasses: Record<Tone, string> = {
  success: "bg-success-600",
  warning: "bg-warning-500",
  danger: "bg-danger-600",
  info: "bg-brand-600",
  neutral: "bg-ink-400",
  orange: "bg-orange-500",
  indigo: "bg-indigo-500",
};

export function Badge({ tone = "neutral", className, children, icon: Icon, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {Icon && !dot && <Icon aria-hidden className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export type BadgeMeta = { label: string; tone: Tone };

export function StatusBadge({
  meta,
  showIcon = true,
  className,
}: {
  meta: BadgeMeta;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <Badge tone={meta.tone} className={className} dot={!showIcon}>
      {meta.label}
    </Badge>
  );
}
