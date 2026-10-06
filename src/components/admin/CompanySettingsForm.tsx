"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { updateCompanySettingsAction } from "@/app/admin/actions";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { formatClockMinutes, lateCutoffMinutes, parseClockMinutes } from "@/lib/attendance-policy";
import { Clock, TriangleAlert } from "lucide-react";

type Values = CompanySettingsInput;
type FormValues = z.input<typeof companySettingsSchema>;

/**
 * The company policy an admin can change without a redeploy.
 *
 * The late cutoff is previewed live as the admin types, using the same module
 * the server applies on check-in and on correction, so what this form shows is
 * what the next check-in will be judged against. Saving re-derives every stored
 * status, which is why the hint calls that out rather than leaving it implicit.
 */
export function CompanySettingsForm({
  policy,
}: {
  /** Current values, read from `company_settings` by the server page. */
  policy: CompanySettingsInput;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: policy,
  });

  const workdayStart = watch("workdayStart");
  const lateThresholdMinutes = watch("lateThresholdMinutes");

  // The cutoff follows the two fields as they are typed, so the effect of a
  // change is visible before it is saved rather than after.
  const cutoff = formatClockMinutes(
    lateCutoffMinutes({
      workdayStart: String(workdayStart ?? ""),
      lateThresholdMinutes: Number(lateThresholdMinutes ?? 0) || 0,
    }),
  );
  const cutoffValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(workdayStart ?? ""));

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await updateCompanySettingsAction(values);

    if (result.success) {
      toast(result.message, "success");
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
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorMessage message={serverError} />

      <SectionCard
        title="Attendance Rules"
        description="When an arrival counts as late, and how long a working day is"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Official Check-In Time"
            htmlFor="workdayStart"
            error={errors.workdayStart?.message}
            hint="The start of the working day."
            required
          >
            <Input
              id="workdayStart"
              type="time"
              step={300}
              error={errors.workdayStart?.message}
              {...register("workdayStart")}
            />
          </FormField>

          <FormField
            label="Late Grace Period (minutes)"
            htmlFor="lateThresholdMinutes"
            error={errors.lateThresholdMinutes?.message}
            hint="Minutes after the official start that are still on time."
            required
          >
            <Input
              id="lateThresholdMinutes"
              type="number"
              min={0}
              max={240}
              step={1}
              error={errors.lateThresholdMinutes?.message}
              {...register("lateThresholdMinutes")}
            />
          </FormField>

          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-brand-100 bg-brand-50/60 px-4 py-3">
              <Clock aria-hidden className="h-4 w-4 shrink-0 text-brand-600" />
              <p className="text-sm text-ink-700">
                Arriving at{" "}
                <span className="font-semibold text-ink-900">
                  {cutoffValid ? cutoff : "--:--"}
                </span>{" "}
                or earlier is <span className="font-semibold text-ink-900">On Time</span>. From{" "}
                <span className="font-semibold text-ink-900">
                  {cutoffValid ? nextMinuteLabel(cutoff) : "--:--"}
                </span>{" "}
                the status is <span className="font-semibold text-ink-900">Late</span>.
              </p>
              <Badge tone={cutoffValid ? "info" : "warning"} className="ml-auto">
                {cutoffValid ? `Late after ${cutoff}` : "Enter a valid start time"}
              </Badge>
            </div>
          </div>

          <FormField
            label="Standard Working Hours"
            htmlFor="standardWorkingHours"
            error={errors.standardWorkingHours?.message}
            hint="Used to prefill the standard shift on the correction form."
            required
          >
            <Input
              id="standardWorkingHours"
              type="number"
              min={1}
              max={24}
              step={1}
              error={errors.standardWorkingHours?.message}
              {...register("standardWorkingHours")}
            />
          </FormField>

          <FormField
            label="Annual Leave Allocation (days)"
            htmlFor="leaveAllocationDays"
            error={errors.leaveAllocationDays?.message}
            hint="Opens the leave balance for every employee."
            required
          >
            <Input
              id="leaveAllocationDays"
              type="number"
              min={0}
              max={365}
              step={1}
              error={errors.leaveAllocationDays?.message}
              {...register("leaveAllocationDays")}
            />
          </FormField>
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-card border border-warning-100 bg-warning-50/60 px-4 py-3 text-xs text-ink-600">
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
          Saving recalculates every stored attendance status against the new rules,
          so a check-in at 10:05 AM becomes Late if the grace period drops to 0, and
          returns to On Time when it goes back to 15. Days marked Absent, On Leave or
          Half Day are left as they are.
        </p>
      </SectionCard>

      <FormActions>
        <SubmitButton isLoading={isSubmitting} loadingText="Saving…">
          Save Settings
        </SubmitButton>
      </FormActions>
    </form>
  );
}

/** The first minute after the cutoff, i.e. where "Late" begins. */
function nextMinuteLabel(cutoffLabel: string): string {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(cutoffLabel);
  if (!match) return cutoffLabel;
  const [, hourPart, minutePart, meridiem] = match;
  const base = parseClockMinutes(
    meridiem === "PM"
      ? `${String(Number(hourPart) % 12 + 12).padStart(2, "0")}:${minutePart}`
      : `${String(hourPart === "12" ? 0 : Number(hourPart)).padStart(2, "0")}:${minutePart}`,
  );
  return formatClockMinutes(base + 1);
}