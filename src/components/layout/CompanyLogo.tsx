import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The company logo, used by the sign-in page, the sidebar brand and the
 * dashboard header so all three render the identical asset.
 *
 * The source is a square JPEG on a near-white (#F4F8FB) background, so it sits
 * on a white plate with a hairline ring — otherwise it disappears against the
 * white sidebar and cards. The plate clips the corners and the image fills it
 * with `object-contain`, which on a square source is an exact fit: no
 * stretching, cropping or letterboxing at any of the three sizes.
 */
const LOGO_SRC = "/Company logo (logo).jpg";

const BOX_SIZE = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
  lg: "h-12 w-12 rounded-xl",
} as const;

/** Fixed-size image, so one `sizes` entry per variant is enough. */
const SIZES_ATTR = {
  sm: "32px",
  md: "36px",
  lg: "48px",
} as const;

export interface CompanyLogoProps {
  size?: keyof typeof BOX_SIZE;
  /** Above-the-fold on the sign-in page only; elsewhere it would waste bandwidth. */
  priority?: boolean;
  className?: string;
}

export function CompanyLogo({ size = "md", priority = false, className }: CompanyLogoProps) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden bg-white ring-1 ring-ink-100",
        BOX_SIZE[size],
        className,
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="Corevia Technologies logo"
        fill
        sizes={SIZES_ATTR[size]}
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
