"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Mobile drawer used in place of the persistent sidebar on small screens. */
export function Sheet({ open, onClose, title, side = "left", children, footer, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex h-full w-[84vw] max-w-72 flex-col bg-white shadow-popover",
          side === "left" ? "left-0 border-r border-ink-100" : "ml-auto border-l border-ink-100",
          className,
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-4">
          <span className="text-sm font-semibold text-ink-900">{title}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X aria-hidden className="h-4 w-4" />
          </Button>
        </div>
        <div className="cv-scrollbar-thin flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-100 p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
