import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";
import { toneClasses, type Tone } from "@/lib/status";

const iconWrapperTones: Record<Tone, string> = {
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-brand-50 text-brand-600",
  neutral: "bg-ink-50 text-ink-500",
  orange: "bg-orange-50 text-orange-600",
  indigo: "bg-indigo-soft text-indigo-600",
};

export function DashboardCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "info",
  href,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
  footer?: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</p>
        {Icon && (
          <span className={cn("rounded-lg p-2", iconWrapperTones[tone])}>
            <Icon aria-hidden className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-ink-500">{sublabel}</p>}
      {footer && <div className="mt-4 border-t border-ink-100 pt-3">{footer}</div>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          "group block rounded-card border border-ink-100 bg-white p-5 shadow-card transition-all duration-150",
          "hover:border-brand-200 hover:shadow-card-hover",
          className,
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={cn("rounded-card border border-ink-100 bg-white p-5 shadow-card", className)}>
      {content}
    </div>
  );
}

export { toneClasses };
