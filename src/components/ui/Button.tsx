import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-ink-100 text-ink-800 hover:bg-ink-200 active:bg-ink-300 disabled:text-ink-400",
  outline:
    "border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
  ghost: "text-ink-600 hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200",
  danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700 active:bg-danger-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9 justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    loadingText,
    disabled,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
});
