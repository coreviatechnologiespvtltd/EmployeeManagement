import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "brand",
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "brand" | "success" | "warning" | "danger";
  showValue?: boolean;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = {
    brand: "bg-brand-600",
    success: "bg-success-600",
    warning: "bg-warning-500",
    danger: "bg-danger-600",
  }[tone];

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-ink-600">{label}</span>}
          {showValue && <span className="font-medium text-ink-700">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div className={cn("h-full rounded-full transition-all duration-300", fill)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
