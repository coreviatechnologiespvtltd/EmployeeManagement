"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, FLUSH_IN_CARD } from "@/components/ui/DataTable";
import { Pagination, paginate, pageCountFor } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateField, Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage } from "@/components/forms/FormActions";
import { correctAttendanceAction } from "@/app/admin/actions";
import { attendanceCorrectionSchema } from "@/lib/validations/salary";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import { lateCutoffLabel, resolveAttendanceStatus, type AttendancePolicy } from "@/lib/attendance-policy";
import { formatDate, formatHours, formatTime } from "@/lib/format";
import { Eye, Pencil } from "lucide-react";
import type { AttendancePerson, AttendanceRecord, AttendanceStatus } from "@/types/attendance";

type Values = z.infer<typeof attendanceCorrectionSchema>;
type FormValues = z.input<typeof attendanceCorrectionSchema>;

const PAGE_SIZE = 10;

export interface AttendanceRegisterFilters {
  query: string;
  from: string;
  to: string;
  employeeId: string;
  status: AttendanceStatus | "all";
}

/**
 * The admin attendance register: everyone's records over a date range.
 *
 * The filters live in the URL rather than in component state so the range is
 * server-side — the page reads them as `searchParams` and the query runs in the
 * database instead of pulling every row and filtering in the browser. That also
 * makes a filtered view shareable and survives a refresh. Pagination stays
 * client-side over the result set the server returned.
 */
export function AttendanceManagementTable({
  records,
  people,
  filters,
  totalCount,
  defaultCheckIn,
  defaultCheckOut,
  policy,
}: {
  records: AttendanceRecord[];
  people: AttendancePerson[];
  /** Filters the page applied, i.e. the values resolved from the URL. */
  filters: AttendanceRegisterFilters;
  /** Unfiltered record count for the same range, for the "x of y" line. */
  totalCount: number;
  /** Standard working day from `company_settings`, used when times are missing. */
  defaultCheckIn: string;
  defaultCheckOut: string;
  /** Current late rule, so the correction form previews what the server will store. */
  policy: AttendancePolicy;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Seeded from the URL and mirrored into it on change. The page remounts this
  // component when the filters change, so local state never drifts from the URL.
  const [query, setQuery] = useState(filters.query);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [employeeId, setEmployeeId] = useState(filters.employeeId);
  const [status, setStatus] = useState(filters.status);

  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AttendanceRecord | null>(null);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const hasFilters =
    query !== "" || from !== "" || to !== "" || employeeId !== "all" || status !== "all";

  // Guards the first run: the seeds already match the URL, so pushing there
  // would replace the page with an identical navigation and an extra round trip.
  const mounted = useRef(false);

  // Every filter change rewrites the query string; clearing all of them drops the
  // parameters entirely so the page falls back to its own defaults.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (employeeId !== "all") params.set("employee", employeeId);
    if (status !== "all") params.set("status", status);

    const search = params.toString();
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // `usePathname` is typed as a plain string, so the composed URL needs the
    // same assertion the generated route union would otherwise give us.
    router.push((search ? `${pathname}?${search}` : pathname) as Route, { scroll: false });
    setPage(1);
  }, [query, from, to, employeeId, status, pathname, router]);

  // Counted from the records the server returned, whose statuses are already
// derived from each check-in against the current cutoff — so these numbers and
// the badges in the rows below can never disagree.
const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      halfDay: records.filter((r) => r.status === "half_day").length,
      onLeave: records.filter((r) => r.status === "leave").length,
      absent: records.filter((r) => r.status === "absent").length,
    }),
    [records],
  );

  const totalPages = pageCountFor(records.length, PAGE_SIZE);
  const safePage = Math.min(page, totalPages);
  const visible = paginate(records, safePage, PAGE_SIZE);

  function clearFilters() {
    setQuery("");
    setFrom("");
    setTo("");
    setEmployeeId("all");
    setStatus("all");
  }

  return (
    <>
      <div className="mb-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name or username"
            label="Search attendance records"
          />
          <DateField
            id="attendance-from"
            label="From"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
          <DateField
            id="attendance-to"
            label="To"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
          <Select
            label="Employee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            options={[
              { value: "all", label: "All employees" },
              ...people.map((person) => ({
                value: person.id,
                label: `${person.fullName} · ${person.department}`,
              })),
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as AttendanceStatus | "all")}
            options={[
              { value: "all", label: "All statuses" },
              ...ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-500">
            <span className="font-medium text-ink-800">{records.length}</span> of {totalCount}{" "}
            records in range
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="grid grid-cols-2 gap-4 border-b border-ink-100 bg-surface-subtle px-5 py-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "On Time", value: counts.present },
            { label: "Late", value: counts.late },
            { label: "Half Day", value: counts.halfDay },
            { label: "On Leave", value: counts.onLeave },
            { label: "Absent", value: counts.absent },
            { label: "Matching", value: records.length },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-ink-500">{item.label}</p>
              <p className="text-sm font-semibold text-ink-900">{item.value}</p>
            </div>
          ))}
        </div>

        <DataTable
          className={FLUSH_IN_CARD}
          caption="Attendance register"
          rows={visible}
          getRowKey={(row) => row.id}
          emptyMessage={
            hasFilters ? "No records match these filters." : "No attendance was recorded in this range."
          }
          columns={[
            {
              key: "employee",
              header: "Employee",
              render: (row) => (
                <div className="flex items-center gap-2.5">
                  <EmployeeAvatar name={row.employeeName} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{row.employeeName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {row.employeeUsername} · {row.department}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              hideBelow: "xl",
              render: (row) => (
                <span className={row.employeeRole === "admin" ? "text-xs text-brand-600" : "text-xs"}>
                  {row.employeeRole === "admin" ? "Administrator" : "Employee"}
                </span>
              ),
            },
            {
              key: "date",
              header: "Date",
              render: (row) => (
                <span className="font-medium whitespace-nowrap text-ink-800">{formatDate(row.date)}</span>
              ),
            },
            {
              key: "in",
              header: "Check In",
              render: (row) => <span className="whitespace-nowrap">{formatTime(row.checkIn)}</span>,
            },
            {
              key: "out",
              header: "Check Out",
              render: (row) => <span className="whitespace-nowrap">{formatTime(row.checkOut)}</span>,
            },
            {
              key: "hours",
              header: "Hours",
              render: (row) => <span className="whitespace-nowrap">{formatHours(row.workingHours)}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => {
                const meta = ATTENDANCE_STATUS_META[row.status];
                return (
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                );
              },
            },
            {
              key: "remarks",
              header: "Remarks",
              hideBelow: "xl",
              render: (row) => <span className="text-xs text-ink-500">{row.remarks ?? "—"}</span>,
            },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right whitespace-nowrap",
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setViewing(row)}>
                    <Eye aria-hidden className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">View</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Correct</span>
                  </Button>
                </div>
              ),
            },
          ]}
        />

        <Pagination
          page={safePage}
          pageCount={totalPages}
          onPageChange={setPage}
          totalItems={records.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      {viewing && <AttendanceDetailModal record={viewing} onClose={() => setViewing(null)} />}

      {editing && (
        <CorrectAttendanceModal
          record={editing}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
          policy={policy}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

/**
 * Read-only view of one record, including the audit columns that the table
 * itself does not show.
 */
function AttendanceDetailModal({
  record,
  onClose,
}: {
  record: AttendanceRecord;
  onClose: () => void;
}) {
  const meta = ATTENDANCE_STATUS_META[record.status];

  return (
    <Modal
      open
      onClose={onClose}
      title="Attendance Details"
      description={`${record.employeeName} · ${formatDate(record.date, { day: "2-digit", month: "long", year: "numeric" })}`}
      size="lg"
      footer={
        <FormActions>
          <Button onClick={onClose}>Close</Button>
        </FormActions>
      }
    >
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={record.employeeName} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{record.employeeName}</p>
          <p className="truncate text-xs text-ink-500">
            {record.employeeUsername} · {record.employeeRole === "admin" ? "Administrator" : "Employee"}
          </p>
        </div>
        <Badge tone={meta.tone} icon={meta.icon} className="ml-auto">
          {meta.label}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Detail label="Employee ID" value={record.employeeId} />
        <Detail label="Department" value={record.department} />
        <Detail
          label="Working date"
          value={formatDate(record.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        />
        <Detail label="Check In" value={formatTime(record.checkIn)} />
        <Detail label="Check Out" value={formatTime(record.checkOut)} />
        <Detail label="Working Hours" value={formatHours(record.workingHours)} />
        <Detail
          label="Recorded"
          value={formatDate(record.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
        />
        <Detail
          label="Last Updated"
          value={formatDate(record.updatedAt, { day: "2-digit", month: "short", year: "numeric" })}
        />
      </dl>

      <div className="mt-5">
        <p className="text-xs text-ink-500">Remarks</p>
        <p className="mt-1 text-sm text-ink-700">{record.remarks ?? "No remarks recorded."}</p>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

/**
 * Admin correction of a stored day: status, times and a reason.
 *
 * Times are submitted as local `YYYY-MM-DDTHH:mm` built from the record's own
 * working date, and the server rejects a check-out at or before the check-in.
 */
function CorrectAttendanceModal({
  record,
  defaultCheckIn,
  defaultCheckOut,
  policy,
  onClose,
}: {
  record: AttendanceRecord;
  defaultCheckIn: string;
  defaultCheckOut: string;
  policy: AttendancePolicy;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(attendanceCorrectionSchema),
    defaultValues: {
      recordId: record.id,
      status: record.status,
      checkIn: record.checkIn ? toTimeInput(record.checkIn) : "",
      checkOut: record.checkOut ? toTimeInput(record.checkOut) : "",
      remarks: record.remarks ?? "",
    },
  });

  const status = watch("status");
  const checkInTime = watch("checkIn");
  const needsTimes = status === "present" || status === "late" || status === "half_day";

  // What the server will store for the times currently in the form.
  //
  // This is a preview, not the decision: `correctAttendance` runs the same
  // `resolveAttendanceStatus` on the server and that result is what gets saved.
  // Showing it here means the admin sees the status flip as they retype the
  // check-in, instead of discovering it after a round trip.
  const projectedStatus = useMemo(() => {
    if (!needsTimes || !checkInTime) return null;
    const instant = new Date(`${record.date}T${checkInTime}`);
    if (Number.isNaN(instant.getTime())) return null;
    return resolveAttendanceStatus({ checkIn: instant, requested: status as AttendanceStatus, policy });
  }, [checkInTime, needsTimes, policy, record.date, status]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await correctAttendanceAction({
      ...values,
      checkIn: needsTimes ? `${record.date}T${values.checkIn || defaultCheckIn}` : "",
      checkOut: needsTimes ? `${record.date}T${values.checkOut || defaultCheckOut}` : "",
    });

    if (result.success) {
      toast(result.message, "success");
      onClose();
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) setError(field as keyof FormValues, { message: messages[0] });
      }
    }
    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Correct Attendance"
      description={`${record.employeeName} · ${formatDate(record.date)}`}
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="attendance-correction-form" isLoading={isSubmitting} loadingText="Saving…">
            Save Correction
          </Button>
        </FormActions>
      }
    >
      <form
        id="attendance-correction-form"
        onSubmit={onSubmit}
        className="space-y-5"
        noValidate
      >
        <FormErrorMessage message={serverError} />
        <input type="hidden" {...register("recordId")} />

        <FormField label="Status" htmlFor="attendance-status" error={errors.status?.message} required>
          <Select
            id="attendance-status"
            options={ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            error={errors.status?.message}
            {...register("status")}
          />
        </FormField>

        {needsTimes && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Check In" htmlFor="attendance-in" error={errors.checkIn?.message}>
                <Input id="attendance-in" type="time" step={60} {...register("checkIn")} />
              </FormField>
              <FormField label="Check Out" htmlFor="attendance-out" error={errors.checkOut?.message}>
                <Input id="attendance-out" type="time" step={60} {...register("checkOut")} />
              </FormField>
            </div>

            {projectedStatus && <StatusProjection status={projectedStatus} cutoffLabel={lateCutoffLabel(policy)} />}

            <p className="text-xs text-ink-500">
              On Time and Late are recalculated from the check-in time, so changing it changes the
              status. {lateCutoffLabel(policy)} is still On Time; anything later is Late.
            </p>
          </>
        )}

        <FormField
          label="Remarks"
          htmlFor="attendance-remarks"
          error={errors.remarks?.message}
          hint="Reason for this correction."
        >
          <Input id="attendance-remarks" placeholder="Optional note" {...register("remarks")} />
        </FormField>
      </form>
    </Modal>
  );
}

/**
 * The status the current times will produce, shown above the save button.
 *
 * Deliberately styled with the same badge the table uses, so the admin is
 * looking at the exact treatment the row will carry once saved.
 */
function StatusProjection({ status, cutoffLabel }: { status: AttendanceStatus; cutoffLabel: string }) {
  const meta = ATTENDANCE_STATUS_META[status];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-ink-100 bg-surface-subtle px-4 py-3">
      <p className="text-xs text-ink-500">This will be saved as</p>
      <Badge tone={meta.tone} icon={meta.icon}>
        {meta.label}
      </Badge>
      <p className="text-xs text-ink-500">
        {status === "late"
          ? `Past the ${cutoffLabel} cutoff.`
          : `On or before the ${cutoffLabel} cutoff.`}
      </p>
    </div>
  );
}

/** An instant as the `HH:mm` an `input type="time"` expects, in local time. */
function toTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}