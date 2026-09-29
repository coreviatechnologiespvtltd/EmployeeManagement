import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime, formatHours } from "@/lib/format";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import type { AttendanceRecord } from "@/types/attendance";

export function AttendanceTable({
  records,
  showEmployee = false,
}: {
  records: AttendanceRecord[];
  showEmployee?: boolean;
}) {
  return (
    <DataTable
      rows={records}
      getRowKey={(row) => row.id}
      className="shadow-none"
      caption="Attendance history"
      columns={[
        ...(showEmployee
          ? [
              {
                key: "employee",
                header: "Employee",
                render: (row: AttendanceRecord) => (
                  <span className="font-medium whitespace-nowrap text-ink-800">{row.employeeName}</span>
                ),
              },
            ]
          : []),
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
