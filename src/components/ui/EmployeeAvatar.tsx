import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
} as const;

const PALETTE = [
  "bg-brand-100 text-brand-700",
  "bg-success-50 text-success-700",
  "bg-orange-50 text-orange-700",
  "bg-indigo-soft text-indigo-700",
  "bg-ink-100 text-ink-700",
  "bg-warning-50 text-warning-700",
] as const;

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash] ?? PALETTE[0]!;
}

export function EmployeeAvatar({
  name,
  src,
  size = "sm",
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- user-supplied avatar URLs cannot go through next/image */
      <img
        src={src}
        alt={`${name} profile`}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-ink-100", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5",
        paletteFor(name),
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
