"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  className,
  triggerClassName,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center rounded-lg transition-colors duration-150",
          triggerClassName ?? "hover:bg-ink-50",
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-2 min-w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-popover",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const shared =
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
            const tone = item.danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-700 hover:bg-surface-subtle";

            if (item.href) {
              return (
                <a key={item.label} href={item.href} role="menuitem" className={cn(shared, tone)} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(shared, tone)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
