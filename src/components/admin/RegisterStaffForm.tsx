"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select, DateField } from "@/components/ui/Select";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { SectionCard } from "@/components/ui/Card";
import { registerStaffAction } from "@/app/admin/actions";
import { registerStaffSchema, type RegisterStaffInput } from "@/lib/validations/employee";
import { DEPARTMENTS, POSITIONS, COMPANY_EMAIL_DOMAIN } from "@/lib/constants";
import { today } from "@/lib/format";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Administrator" },
];

export function RegisterStaffForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  type Values = RegisterStaffInput;
  type FormValues = z.input<typeof registerStaffSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(registerStaffSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      address: "",
      department: "Engineering",
      position: "Software Engineer",
      joiningDate: today(),
      basicSalary: 0,
      role: "employee",
      password: "",
      confirmPassword: "",
    },
  });

  const email = watch("email");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await registerStaffAction(values);

    if (result.success) {
      toast(result.message, "success");
      reset();
      router.push("/admin/staff");
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) {
          setError(field as keyof FormValues, { message: messages[0] });
        }
      }
    }
    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorMessage message={serverError} />

      <SectionCard title="Personal Information" description="Basic details used across the system">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="fullName" error={errors.fullName?.message} required>
            <Input
              id="fullName"
              placeholder="e.g. Aarav Sharma"
              autoComplete="name"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
          </FormField>

          <FormField label="Phone Number" htmlFor="phone" error={errors.phone?.message} required>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98XXXXXXXX"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </FormField>

          <FormField label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2" required>
            <Textarea
              id="address"
              rows={2}
              placeholder="Street, city, state and PIN code"
              error={errors.address?.message}
              {...register("address")}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Work Details" description="Department, role and compensation">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Department" htmlFor="department" error={errors.department?.message} required>
            <Select
              id="department"
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              error={errors.department?.message}
              {...register("department")}
            />
          </FormField>

          <FormField label="Position" htmlFor="position" error={errors.position?.message} required>
            <Select
              id="position"
              options={POSITIONS.map((p) => ({ value: p, label: p }))}
              error={errors.position?.message}
              {...register("position")}
            />
          </FormField>

          <FormField label="Joining Date" htmlFor="joiningDate" error={errors.joiningDate?.message} required>
            <DateField
              id="joiningDate"
              max={today()}
              error={errors.joiningDate?.message}
              {...register("joiningDate")}
            />
          </FormField>

          <FormField label="Basic Salary (monthly)" htmlFor="basicSalary" error={errors.basicSalary?.message} required>
            <Input
              id="basicSalary"
              type="number"
              min={0}
              step={500}
              placeholder="45000"
              error={errors.basicSalary?.message}
              {...register("basicSalary")}
            />
          </FormField>

          <FormField
            label="System Role"
            htmlFor="role"
            error={errors.role?.message}
            hint="Administrators can manage staff, payroll and announcements."
            required
          >
            <Select
              id="role"
              options={ROLE_OPTIONS}
              error={errors.role?.message}
              {...register("role")}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Account Credentials" description="Used to sign in to the employee portal">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Username"
            htmlFor="username"
            error={errors.username?.message}
            hint="Letters, numbers, dots, dashes and underscores."
            required
          >
            <Input
              id="username"
              placeholder="aarav.sharma"
              autoComplete="off"
              error={errors.username?.message}
              {...register("username")}
            />
          </FormField>

          <FormField
            label="Email Address"
            htmlFor="email"
            error={errors.email?.message}
            hint={`Company emails use the @${COMPANY_EMAIL_DOMAIN} domain.`}
            required
          >
            <Input
              id="email"
              type="email"
              placeholder={`name@${COMPANY_EMAIL_DOMAIN}`}
              autoComplete="email"
              error={errors.email?.message}
              onChange={(event) => {
                setValue("email", event.target.value, { shouldValidate: true });
              }}
              value={email}
            />
          </FormField>

          <FormField
            label="Temporary Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="At least 8 characters with upper case, lower case and a number."
            required
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
          </FormField>

          <FormField label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </FormField>
        </div>
      </SectionCard>

      <FormActions>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => {
            reset();
            setServerError(undefined);
          }}
        >
          Reset form
        </Button>
        <SubmitButton loadingText="Registering…">Register Staff</SubmitButton>
      </FormActions>
    </form>
  );
}
