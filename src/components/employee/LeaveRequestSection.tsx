"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage } from "@/components/forms/FormActions";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { submitLeaveAction, cancelLeaveAction } from "@/app/employee/actions";
import { submitLeaveSchema } from "@/lib/validations/leave";
import { LEAVE_TYPES } from "@/lib/constants";
import { LEAVE_STATUS_META, LEAVE_TYPE_LABELS } from "@/lib/status";
import { daysBetween, formatDate, today } from "@/lib/format";
import type { SubmitLeaveInput } from "@/lib/validations/leave";
import type { LeaveRequest } from "@/types/leave";
import { CalendarPlus } from "lucide-react";

export function LeaveRequestSection({ requests }: { requests: LeaveRequest[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Leave History</h2>
          <p className="mt-0.5 text-xs text-ink-500">All your submitted leave applications and their status.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <CalendarPlus aria-hidden className="h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      <LeaveRequestList requests={requests} />
      <LeaveRequestModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function LeaveRequestList({ requests }: { requests: LeaveRequest[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-ink-200">
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-ink-900">No leave requests yet</p>
          <p className="mt-1.5 text-sm text-ink-500">
            Use <span className="font-medium text-ink-700">Apply for Leave</span> to submit your first application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <LeaveRequestCard key={request.id} request={request}>
          {request.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelLeaveAction(request.id);
                  toast(result.message, result.success ? "success" : "error");
                  if (result.success) router.refresh();
                })
              }
            >
              Cancel request
            </Button>
          )}
        </LeaveRequestCard>
      ))}
    </ul>
  );
}

export function LeaveRequestCard({ request, children }: { request: LeaveRequest; children?: React.ReactNode }) {
  const meta = LEAVE_STATUS_META[request.status];

  return (
    <li className="rounded-card border border-ink-100 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {formatDate(request.startDate, { day: "2-digit", month: "short", year: "numeric" })}
              {request.endDate !== request.startDate &&
                ` – ${formatDate(request.endDate, { day: "2-digit", month: "short", year: "numeric" })}`}
            </p>
            <Badge tone="neutral">{LEAVE_TYPE_LABELS[request.leaveType]}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {request.totalDays} day{request.totalDays === 1 ? "" : "s"} · Applied on {formatDate(request.appliedAt)}
          </p>
        </div>
        <Badge tone={meta.tone} icon={meta.icon} className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-700">{request.reason}</p>

      {request.adminComment && (
        <p className="mt-3 rounded-lg bg-surface-subtle px-3.5 py-2.5 text-xs leading-relaxed text-ink-600">
          <span className="font-semibold text-ink-800">
            {request.reviewedByName ?? "Administrator"}
            {request.reviewedAt ? ` · ${formatDate(request.reviewedAt)}` : ""}:
          </span>{" "}
          {request.adminComment}
        </p>
      )}

      {children && <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-3">{children}</div>}
    </li>
  );
}

export function LeaveRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitLeaveInput>({
    resolver: zodResolver(submitLeaveSchema),
    defaultValues: { leaveType: "casual", startDate: "", endDate: "", reason: "" },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const dayCount = startDate && endDate ? daysBetween(startDate, endDate) : 0;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await submitLeaveAction(values);

    if (result.success) {
      toast(result.message, "success");
      reset({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
      onClose();
      router.refresh();
      return;
    }

    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for Leave"
      description="Submit a new leave request for administrator approval."
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="leave-request-form" isLoading={isSubmitting} loadingText="Submitting…">
            Submit Request
          </Button>
        </FormActions>
      }
    >
      <form id="leave-request-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <FormField label="Leave Type" htmlFor="leaveType" error={errors.leaveType?.message} required>
          <Select
            id="leaveType"
            aria-invalid={errors.leaveType ? true : undefined}
            options={LEAVE_TYPES.map((type) => ({ value: type.value, label: type.label }))}
            {...register("leaveType")}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start Date" htmlFor="startDate" error={errors.startDate?.message} required>
            <input
              type="date"
              id="startDate"
              min={today()}
              aria-invalid={errors.startDate ? true : undefined}
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 transition-colors duration-150 hover:border-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              {...register("startDate")}
            />
          </FormField>

          <FormField label="End Date" htmlFor="endDate" error={errors.endDate?.message} required>
            <input
              type="date"
              id="endDate"
              min={startDate || today()}
              aria-invalid={errors.endDate ? true : undefined}
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 transition-colors duration-150 hover:border-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              {...register("endDate")}
            />
          </FormField>
        </div>

        {dayCount > 0 && (
          <p className="rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
            Total duration: <span className="font-semibold">{dayCount} day{dayCount === 1 ? "" : "s"}</span>
          </p>
        )}

        <FormField
          label="Reason"
          htmlFor="reason"
          error={errors.reason?.message}
          hint="Briefly explain why you need this leave."
          required
        >
          <Textarea
            id="reason"
            rows={4}
            placeholder="e.g. Family function out of valley, travel booked."
            aria-invalid={errors.reason ? true : undefined}
            {...register("reason")}
          />
        </FormField>
      </form>
    </Modal>
  );
}
