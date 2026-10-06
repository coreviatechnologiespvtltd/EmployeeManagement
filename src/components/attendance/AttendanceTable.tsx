import { DataTable, FLUSH_IN_CARD } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime, formatHours } from "@/lib/format";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import type { AttendanceRecord } from "@/types/attendance";

/**
 * One person's own attendance history: date, check-in, check-out, working
 * duration and status. Shared by the employee and admin attendance pages, which
 * are the same view for whoever is signed in.
 */
export function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <DataTable
      rows={records}
      getRowKey={(row) => row.id}
      className={FLUSH_IN_CARD}
      caption="Attendance history"
      columns={[
        {
          key: "date",
          header: "Date",
          render: (row: AttendanceRecord) => (
            <span className="font-medium whitespace-nowrap text-ink-800">{formatDate(row.date)}</span>
          ),
        },
        {
          key: "in",
          header: "Check In",
          render: (row: AttendanceRecord) => <span className="whitespace-nowrap">{formatTime(row.checkIn)}</span>,
        },
        {
          key: "out",
          header: "Check Out",
          render: (row: AttendanceRecord) => <span className="whitespace-nowrap">{formatTime(row.checkOut)}</span>,
        },
        {
          key: "hours",
          header: "Hours",
          render: (row: AttendanceRecord) => <span className="whitespace-nowrap">{formatHours(row.workingHours)}</span>,
        },
        {
          key: "status",
          header: "Status",
          render: (row: AttendanceRecord) => {
            const meta = ATTENDANCE_STATUS_META[row.status];
            return (
              <Badge tone={meta.tone} icon={meta.icon}>
                {meta.label}
              </Badge>
            );
          },
        },
        {
          key: "remarks",
          header: "Remarks",
          hideBelow: "lg",
          render: (row: AttendanceRecord) => <span className="text-xs text-ink-500">{row.remarks ?? "—"}</span>,
        },
      ]}
    />
  );
}