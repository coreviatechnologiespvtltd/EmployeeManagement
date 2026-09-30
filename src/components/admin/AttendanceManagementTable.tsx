"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { correctAttendanceAction } from "@/app/admin/actions";
import { attendanceCorrectionSchema } from "@/lib/validations/salary";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import { formatDate, formatTime, formatHours } from "@/lib/format";
import { Pencil } from "lucide-react";
import type { AttendanceRecord } from "@/types/attendance";

type Values = z.infer<typeof attendanceCorrectionSchema>;
type FormValues = z.input<typeof attendanceCorrectionSchema>;

export function AttendanceManagementTable({
  records,
  availableDates,
  selectedDate,
  defaultCheckIn,
  defaultCheckOut,
}: {
  records: AttendanceRecord[];
  availableDates: string[];
  selectedDate: string;
  /** Standard working day from `company_settings`, used when times are missing. */
  defaultCheckIn: string;
  defaultCheckOut: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "present" | "absent" | "late" | "half_day" | "leave">("all");
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (q && ![record.employeeName, record.department].join(" ").toLowerCase().includes(q)) return false;
      if (status !== "all" && record.status !== status) return false;
      return true;
    });
  }, [records, query, status]);

  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      halfDay: records.filter((r) => r.status === "half_day").length,
      absent: records.filter((r) => r.status === "absent").length,
      onLeave: records.filter((r) => r.status === "leave").length,
    }),
    [records],
  );

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-2xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by employee or department"
            label="Search attendance"
          />
          <Select
            value={selectedDate}
            onChange={(event) => router.push(`?date=${event.target.value}`)}
            options={availableDates.map((d) => ({ value: d, label: formatDate(d, { day: "2-digit", month: "long", year: "numeric" }) }))}
            aria-label="Select attendance date"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            options={[
              { value: "all", label: "All statuses" },
              ...ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            aria-label="Filter by attendance status"
          />
        </div>
        <p className="text-xs text-ink-500">
          {filtered.length} of {records.length} records
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No attendance records</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {query || status !== "all"
              ? "Try adjusting your search or filters."
              : "No attendance was recorded for this date."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="grid grid-cols-2 gap-4 border-b border-ink-100 bg-surface-subtle px-5 py-3 sm:grid-cols-6">
            {[
              { label: "Present", value: counts.present },
              { label: "Late", value: counts.late },
              { label: "Half Day", value: counts.halfDay },
              { label: "On Leave", value: counts.onLeave },
              { label: "Absent", value: counts.absent },
              { label: "Total", value: records.length },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-ink-500">{item.label}</p>
                <p className="text-sm font-semibold text-ink-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">Attendance records</caption>
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-3 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Check In</th>
                  <th scope="col" className="px-4 py-3 font-medium">Check Out</th>
                  <th scope="col" className="px-4 py-3 font-medium">Hours</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((record) => {
                  const meta = ATTENDANCE_STATUS_META[record.status];
                  return (
                    <tr key={record.id} className="transition-colors duration-150 hover:bg-surface-subtle">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={record.employeeName} size="xs" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{record.employeeName}</p>
                            <p className="truncate text-xs text-ink-500">{record.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">{formatDate(record.date)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                        {record.checkIn ? formatTime(record.checkIn) : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                        {record.checkOut ? formatTime(record.checkOut) : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                        {record.workingHours ? formatHours(record.workingHours) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(record)}>
                          <Pencil aria-hidden className="h-3.5 w-3.5" />
                          Correct
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <CorrectAttendanceModal
          record={editing}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CorrectAttendanceModal({
  record,
  defaultCheckIn,
  defaultCheckOut,
  onClose,
}: {
  record: AttendanceRecord;
  defaultCheckIn: string;
  defaultCheckOut: string;
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
  const needsTimes = status === "present" || status === "late" || status === "half_day";

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
          <Button type="submit" form="attendance-form" isLoading={isSubmitting} loadingText="Saving…">
            Save Correction
          </Button>
        </FormActions>
      }
    >
      <form id="attendance-form" onSubmit={onSubmit} className="space-y-5" noValidate>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Check In" htmlFor="attendance-in" error={errors.checkIn?.message}>
              <Input id="attendance-in" type="time" step={300} {...register("checkIn")} />
            </FormField>
            <FormField label="Check Out" htmlFor="attendance-out" error={errors.checkOut?.message}>
              <Input id="attendance-out" type="time" step={300} {...register("checkOut")} />
            </FormField>
          </div>
        )}

        <FormField
          label="Remarks"
          htmlFor="attendance-remarks"
          error={errors.remarks?.message}
          hint="Reason for this correction."
        >
          <Input id="attendance-remarks" placeholder="Optional note" {...register("remarks")} />
        </FormField>

        <SubmitButton className="sr-only" loadingText="Saving…">
          Save
        </SubmitButton>

      </form>
    </Modal>
  );
}

function toTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
