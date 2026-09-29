"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { upsertSalaryAction, markSalaryPaidAction } from "@/app/admin/actions";
import { salaryRecordSchema } from "@/lib/validations/salary";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Calculator } from "lucide-react";
import type { SalaryRecord } from "@/types/salary";

type Values = z.infer<typeof salaryRecordSchema>;
type FormValues = z.input<typeof salaryRecordSchema>;

export function SalaryFormModal({
  record,
  month,
  staff,
  onClose,
}: {
  record: SalaryRecord | null;
  month: string;
  staff: Array<{ id: string; fullName: string; department: string; basicSalary: number }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(salaryRecordSchema),
    defaultValues: {
      employeeId: "",
      month,
      basicSalary: 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      paymentStatus: "pending",
      remarks: "",
    },
  });

  if (record && seededFor !== record.id) {
    setSeededFor(record.id);
    reset({
      employeeId: record.employeeId,
      month: record.month,
      basicSalary: record.basicSalary,
      allowances: record.allowances,
      bonus: record.bonus,
      deductions: record.deductions,
      paymentStatus: record.paymentStatus,
      remarks: record.remarks ?? "",
    });
  }
  if (!record && seededFor !== null) setSeededFor(null);

  const basic = Number(watch("basicSalary")) || 0;
  const allowances = Number(watch("allowances")) || 0;
  const bonus = Number(watch("bonus")) || 0;
  const deductions = Number(watch("deductions")) || 0;
  const net = Math.max(0, basic + allowances + bonus - deductions);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await upsertSalaryAction(values);

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
      title={record ? "Edit Salary Record" : "Add Salary Record"}
      description={
        record
          ? `Update ${record.employeeName}'s record for ${record.month}.`
          : "Create or update a salary record for a staff member."
      }
      size="lg"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="salary-form" isLoading={isSubmitting} loadingText="Saving…">
            Save Salary
          </Button>
        </FormActions>
      }
    >
      <form id="salary-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Employee" htmlFor="salary-employee" error={errors.employeeId?.message} required>
            <Select
              id="salary-employee"
              disabled={record !== null}
              options={staff.map((person) => ({
                value: person.id,
                label: `${person.fullName} — ${person.department}`,
              }))}
              placeholder="Select an employee"
              error={errors.employeeId?.message}
              onChange={(event) => {
                const person = staff.find((p) => p.id === event.target.value);
                if (person && !record) {
                  setValue("basicSalary", person.basicSalary, { shouldValidate: true });
                }
                setValue("employeeId", event.target.value, { shouldValidate: true });
              }}
            />
          </FormField>

          <FormField label="Salary Month" htmlFor="salary-month" error={errors.month?.message} required>
            <Input id="salary-month" type="month" error={errors.month?.message} {...register("month")} />
          </FormField>

          <FormField label="Basic Salary" htmlFor="salary-basic" error={errors.basicSalary?.message} required>
            <Input id="salary-basic" type="number" min={0} step={500} error={errors.basicSalary?.message} {...register("basicSalary")} />
          </FormField>

          <FormField label="Allowances" htmlFor="salary-allowances" error={errors.allowances?.message} required>
            <Input id="salary-allowances" type="number" min={0} step={100} error={errors.allowances?.message} {...register("allowances")} />
          </FormField>

          <FormField label="Bonus" htmlFor="salary-bonus" error={errors.bonus?.message} required>
            <Input id="salary-bonus" type="number" min={0} step={100} error={errors.bonus?.message} {...register("bonus")} />
          </FormField>

          <FormField label="Deductions" htmlFor="salary-deductions" error={errors.deductions?.message} required>
            <Input id="salary-deductions" type="number" min={0} step={100} error={errors.deductions?.message} {...register("deductions")} />
          </FormField>

          <FormField label="Payment Status" htmlFor="salary-status" error={errors.paymentStatus?.message} required>
            <Select
              id="salary-status"
              options={PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              error={errors.paymentStatus?.message}
              {...register("paymentStatus")}
            />
          </FormField>

          <FormField label="Remarks" htmlFor="salary-remarks" error={errors.remarks?.message} className="sm:col-span-2">
            <Input id="salary-remarks" placeholder="Optional note" error={errors.remarks?.message} {...register("remarks")} />
          </FormField>
        </div>

        <div className="rounded-card border border-brand-200 bg-brand-50 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-brand-800">
              <Calculator aria-hidden className="h-4 w-4" />
              Net Salary
            </span>
            <span className="text-lg font-semibold text-brand-900">{formatCurrency(net)}</span>
          </div>
          <p className="mt-1 text-xs text-brand-700">
            {formatCurrency(basic + allowances + bonus)} gross − {formatCurrency(deductions)} deductions
          </p>
        </div>

        <SubmitButton className="sr-only" loadingText="Saving…">
          Save
        </SubmitButton>
      </form>
    </Modal>
  );
}

export function MarkPaidButton({ recordId }: { recordId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="soft"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await markSalaryPaidAction(recordId);
        toast(result.message, result.success ? "success" : "error");
        setBusy(false);
        if (result.success) router.refresh();
      }}
    >
      {busy ? "Marking…" : "Mark paid"}
    </Button>
  );
}
