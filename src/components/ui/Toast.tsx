"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: "border-success-500/30 bg-success-50 text-success-700",
    icon: <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-success-600" />,
  },
  error: {
    wrap: "border-danger-500/30 bg-danger-50 text-danger-700",
    icon: <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-danger-600" />,
  },
  info: {
    wrap: "border-brand-500/30 bg-brand-50 text-brand-700",
    icon: <Info aria-hidden className="h-4 w-4 shrink-0 text-brand-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-popover",
              toneStyles[item.tone].wrap,
            )}
          >
            {toneStyles[item.tone].icon}
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
