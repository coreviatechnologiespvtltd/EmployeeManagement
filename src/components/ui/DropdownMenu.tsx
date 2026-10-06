"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

/** `mt-2`, matching the previous absolute offset. */
const GAP = 8;
/** Keep the menu this far from the viewport edge. */
const EDGE = 8;

const INITIAL_STYLE: CSSProperties = { top: 0, left: 0, visibility: "hidden" };

/**
 * The panel is portalled to `body` and positioned `fixed` against the
 * trigger's rect, because every row-action menu lives inside an
 * `overflow-x-auto` scroll container inside an `overflow-hidden` card — an
 * absolutely positioned child there is clipped and cannot reach past the card
 * edge. Portal + fixed positioning also lets the menu flip above the trigger
 * when the viewport has no room below.
 *
 * Positioning is applied imperatively to the panel element rather than through
 * state, so a parent re-render that resets the inline style heals itself on
 * the next layout pass.
 */
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuHeight = menuEl.offsetHeight;
    const menuWidth = menuEl.offsetWidth;

    const below = rect.bottom + GAP;
    const flip = below + menuHeight > window.innerHeight - EDGE && rect.top - GAP - menuHeight >= EDGE;
    const top = flip ? rect.top - GAP - menuHeight : below;

    const preferred = align === "right" ? rect.right - menuWidth : rect.left;
    const left = Math.min(Math.max(preferred, EDGE), Math.max(EDGE, window.innerWidth - menuWidth - EDGE));

    menuEl.style.top = `${Math.round(top)}px`;
    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.visibility = "visible";
  }, [align]);

  // Runs after every commit (no deps), measuring in a layout phase so the
  // corrected coordinates are in place before the browser paints — the menu
  // never flashes at 0,0, and a parent re-render that resets the inline style
  // is re-anchored on the very next pass.
  useLayoutEffect(() => {
    if (open) measure();
  });

  // Re-anchored rather than closed, so scrolling a table sideways or scrolling
  // the page keeps the menu attached to its trigger.
  useEffect(() => {
    if (!open) return;
    const reposition = () => measure();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target) ?? false;
      // The panel is portalled outside the trigger container, so it has to be
      // checked separately or a click on an item would unmount it first.
      const insideMenu = menuRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideMenu) setOpen(false);
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
        ref={triggerRef}
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

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={INITIAL_STYLE}
            className="fixed z-40 min-w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-popover"
          >
            {items.map((item) => {
              const shared =
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
              const tone = item.danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-700 hover:bg-surface-subtle";

              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    role="menuitem"
                    className={cn(shared, tone)}
                    onClick={() => setOpen(false)}
                  >
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
          </div>,
          document.body,
        )}
    </div>
  );
}