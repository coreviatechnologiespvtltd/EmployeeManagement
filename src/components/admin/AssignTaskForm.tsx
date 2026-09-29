"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select, DateField } from "@/components/ui/Select";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { createTasksAction } from "@/app/admin/actions";
import { createTaskSchema } from "@/lib/validations/task";
import { TASK_PRIORITIES } from "@/lib/constants";
import { today } from "@/lib/format";
import { Users, X } from "lucide-react";

type Values = z.infer<typeof createTaskSchema>;
type FormValues = z.input<typeof createTaskSchema>;

export function AssignTaskForm({
  staff,
}: {
  staff: Array<{ id: string; fullName: string; department: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      assignedToIds: [],
      title: "",
      description: "",
      priority: "medium",
      startDate: today(),
      dueDate: today(),
    },
  });

  const startDate = watch("startDate");
  const selected = watch("assignedToIds") ?? [];

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await createTasksAction(values);

    if (result.success) {
      toast(result.message, "success");
      reset({ assignedToIds: [], title: "", description: "", priority: "medium", startDate: today(), dueDate: today() });
      router.push("/admin/tasks");
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

      <section className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink-900">Assign To</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Select one or more staff members. Each selected member receives their own copy of this task.
        </p>

        <div className="mt-4">
          <Controller
            control={control}
            name="assignedToIds"
            render={({ field }) => (
              <>
                <div className="flex flex-wrap gap-2">
                  {staff.map((person) => {
                    const isSelected = selected.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          const next = isSelected
                            ? selected.filter((id) => id !== person.id)
                            : [...selected, person.id];
                          field.onChange(next);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors duration-150 ${
                          isSelected
                            ? "border-brand-300 bg-brand-50 text-brand-800"
                            : "border-ink-200 bg-white text-ink-600 hover:border-brand-200 hover:bg-brand-50/50"
                        }`}
                      >
                        <EmployeeAvatar name={person.fullName} size="xs" />
                        {person.fullName}
                        {isSelected && <X aria-hidden className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
                {selected.length > 0 && (
                  <p className="mt-3 text-xs text-ink-500">
                    {selected.length} staff member{selected.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </>
            )}
          />
        </div>
        {errors.assignedToIds && (
          <p role="alert" className="mt-3 text-xs text-danger-600">
            {errors.assignedToIds.message}
          </p>
        )}
      </section>

      <section className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink-900">Task Details</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <FormField label="Title" htmlFor="title" error={errors.title?.message} className="sm:col-span-2" required>
            <Input
              id="title"
              placeholder="e.g. Prepare monthly payroll summary"
              error={errors.title?.message}
              {...register("title")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            hint="Include all the context the assignee needs."
            className="sm:col-span-2"
            required
          >
            <Textarea
              id="description"
              rows={5}
              placeholder="Describe the work expected, the output expected and any constraints."
              error={errors.description?.message}
              {...register("description")}
            />
          </FormField>

          <FormField label="Priority" htmlFor="priority" error={errors.priority?.message} required>
            <Select
              id="priority"
              options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              error={errors.priority?.message}
              {...register("priority")}
            />
          </FormField>

          <FormField label="Start Date" htmlFor="startDate" error={errors.startDate?.message} required>
            <DateField id="startDate" error={errors.startDate?.message} {...register("startDate")} />
          </FormField>

          <FormField
            label="Due Date"
            htmlFor="dueDate"
            error={errors.dueDate?.message}
            hint="Must be on or after the start date."
            required
          >
            <DateField
              id="dueDate"
              min={startDate}
              error={errors.dueDate?.message}
              {...register("dueDate")}
            />
          </FormField>
        </div>
      </section>

      <FormActions>
        <Button type="button" variant="outline" onClick={() => reset()} disabled={isSubmitting}>
          Clear
        </Button>
        <SubmitButton loadingText="Assigning…">
          <Users aria-hidden className="h-4 w-4" />
          Assign Task
        </SubmitButton>
      </FormActions>
    </form>
  );
}
