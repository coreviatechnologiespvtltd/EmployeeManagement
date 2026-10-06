"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { checkInAction, checkOutAction } from "@/app/attendance/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatHours, formatTime } from "@/lib/format";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import type { AttendanceRecord } from "@/types/attendance";

/** How often the "current time" readout refreshes. */
const TICK_MS = 30_000;

/**
 * Today's attendance and the two controls that change it.
 *
 * The buttons are disabled by what the database already knows, and the actions
 * repeat the same rules server-side, so a stale page or a double click cannot
 * record a second check-in or a checkout without a check-in. The exact instant
 * is stamped by the server, never by this component.
 */
export function AttendanceClock({
  record,
  serverNow,
}: {
  /** The caller's own record for today, or null when they have not checked in. */
  record: AttendanceRecord | null;
  /** Server-rendered "now", so the first client render matches the server HTML. */
  serverNow: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date().toISOString()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);
  const status = record ? ATTENDANCE_STATUS_META[record.status] : null;

  async function submit(action: "in" | "out") {
    setBusy(action);
    try {
      const result = action === "in" ? await checkInAction() : await checkOutAction();
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setNow(new Date().toISOString());
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Metric label="Status">
          {status ? (
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
          ) : (
            <span className="text-ink-400">Not checked in</span>
          )}
        </Metric>
        <Metric label="Check In">{formatTime(record?.checkIn)}</Metric>
        <Metric label="Check Out">{formatTime(record?.checkOut)}</Metric>
        <Metric label="Working Hours">{formatHours(record?.workingHours)}</Metric>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-800">
            <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-brand-600" />
            {hint(checkedIn, checkedOut)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Current time {formatTime(now)} · one check-in and one check-out per working day.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            onClick={() => submit("in")}
            disabled={checkedIn || busy !== null}
            isLoading={busy === "in"}
            loadingText="Recording…"
          >
            <LogIn aria-hidden className="h-4 w-4" />
            {checkedIn ? "Checked In" : "Check In"}
          </Button>
          <Button
            variant="outline"
            onClick={() => submit("out")}
            disabled={!checkedIn || checkedOut || busy !== null}
            isLoading={busy === "out"}
            loadingText="Recording…"
          >
            <LogOut aria-hidden className="h-4 w-4" />
            {checkedOut ? "Checked Out" : "Check Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function hint(checkedIn: boolean, checkedOut: boolean): string {
  if (checkedOut) return "Today's attendance is complete. Thank you!";
  if (checkedIn) return "You're checked in. Remember to check out when you leave.";
  return "You haven't checked in for today yet.";
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{children}</p>
    </div>
  );
}