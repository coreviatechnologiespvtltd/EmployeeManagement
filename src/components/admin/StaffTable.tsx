"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Select, DateField } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { SearchInput } from "@/components/ui/SearchInput";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Pagination, paginate, pageCountFor } from "@/components/ui/Pagination";
import {
  updateStaffAction,
  setStaffStatusAction,
  deleteStaffAction,
} from "@/app/admin/actions";
import { editStaffSchema, type EditStaffInput } from "@/lib/validations/employee";
import { DEPARTMENTS, POSITIONS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { MoreHorizontal, Pencil, UserCheck, UserX, Trash2 } from "lucide-react";
import type { Employee } from "@/types/employee";

const PAGE_SIZE = 8;

export function StaffTable({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [confirm, setConfirm] = useState<Employee | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (q && ![employee.fullName, employee.email, employee.position, employee.username].join(" ").toLowerCase().includes(q)) {
        return false;
      }
      if (department !== "all" && employee.department !== department) return false;
      if (status !== "all" && employee.status !== status) return false;
      return true;
    });
  }, [employees, query, department, status]);

  const totalPages = pageCountFor(filtered.length, PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible = paginate(filtered, safePage, PAGE_SIZE);
  const hasFilters = query !== "" || department !== "all" || status !== "all";

  function clearFilters() {
    setQuery("");
    setDepartment("all");
    setStatus("all");
    setPage(1);
  }

  function toggleStatus(employee: Employee) {
    const next = employee.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await setStaffStatusAction(employee.id, next);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) router.refresh();
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by name, email or username"
            label="Search staff"
          />
          <Select
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]}
            aria-label="Filter by department"
          />
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            aria-label="Filter by status"
          />
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-800">{filtered.length}</span> of {employees.length}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No staff found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {hasFilters ? "Try adjusting your search or filters." : "Register your first staff member to get started."}
          </p>
          {hasFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">Staff directory</caption>
              <thead>
                <tr className="border-b border-ink-100 bg-surface-subtle text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-3 font-medium">Staff</th>
                  <th scope="col" className="px-4 py-3 font-medium">Department</th>
                  <th scope="col" className="px-4 py-3 font-medium">Position</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-4 py-3 font-medium">Salary</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visible.map((employee) => (
                  <tr key={employee.id} className="transition-colors duration-150 hover:bg-surface-subtle">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                        >
                          {employee.fullName
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{employee.fullName}</p>
                          <p className="truncate text-xs text-ink-500">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">{employee.department}</td>
                    <td className="px-4 py-3.5 text-ink-700">
                      <p className="whitespace-nowrap">{employee.position}</p>
                      {employee.role === "admin" && (
                        <span className="text-xs text-brand-600">Administrator</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-600">{formatDate(employee.joiningDate)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                      {formatCurrency(employee.basicSalary)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={employee.status === "active" ? "success" : "neutral"} dot>
                        {employee.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end">
                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${employee.fullName}`}>
                              <MoreHorizontal aria-hidden className="h-4 w-4" />
                            </Button>
                          }
                          items={[
                            {
                              label: "Edit details",
                              icon: <Pencil aria-hidden className="h-4 w-4" />,
                              onSelect: () => setEditing(employee),
                            },
                            {
                              label: employee.status === "active" ? "Deactivate" : "Reactivate",
                              icon:
                                employee.status === "active" ? (
                                  <UserX aria-hidden className="h-4 w-4" />
                                ) : (
                                  <UserCheck aria-hidden className="h-4 w-4" />
                                ),
                              onSelect: () => toggleStatus(employee),
                            },
                            {
                              label: "Remove",
                              icon: <Trash2 aria-hidden className="h-4 w-4" />,
                              danger: true,
                              onSelect: () => setConfirm(employee),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={safePage}
            pageCount={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      <EditStaffModal employee={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Remove staff member"
        message={
          confirm
            ? `${confirm.fullName} will be removed from the system. This cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (!confirm) return;
          startTransition(async () => {
            const result = await deleteStaffAction(confirm.id);
            toast(result.message, result.success ? "success" : "error");
            if (result.success) {
              setConfirm(null);
              router.refresh();
            }
          });
        }}
        isPending={pending}
      />

      {pending && <span className="sr-only" role="status">Updating…</span>}
    </>
  );
}

function EditStaffModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  type Values = EditStaffInput;
  type FormValues = z.input<typeof editStaffSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      department: "Engineering",
      position: "Software Engineer",
      joiningDate: "",
      basicSalary: 0,
      role: "employee",
    },
  });

  // Re-seed the form whenever a different employee is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (employee && seededFor !== employee.id) {
    setSeededFor(employee.id);
    reset({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      department: employee.department as EditStaffInput["department"],
      position: employee.position as EditStaffInput["position"],
      joiningDate: employee.joiningDate,
      basicSalary: employee.basicSalary,
      role: employee.role,
    });
  }
  if (!employee && seededFor !== null) setSeededFor(null);

  const onSubmit = handleSubmit(async (values) => {
    if (!employee) return;
    setServerError(undefined);
    const result = await updateStaffAction(employee.id, values);

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
      open={employee !== null}
      onClose={onClose}
      title="Edit Staff Details"
      description={employee ? `Update profile information for ${employee.fullName}.` : undefined}
      size="lg"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-staff-form" isLoading={isSubmitting} loadingText="Saving…">
            Save Changes
          </Button>
        </FormActions>
      }
    >
      <form id="edit-staff-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="edit-fullName" error={errors.fullName?.message} required>
            <Input id="edit-fullName" error={errors.fullName?.message} {...register("fullName")} />
          </FormField>
          <FormField label="Phone Number" htmlFor="edit-phone" error={errors.phone?.message} required>
            <Input id="edit-phone" type="tel" error={errors.phone?.message} {...register("phone")} />
          </FormField>
          <FormField label="Email Address" htmlFor="edit-email" error={errors.email?.message} required>
            <Input id="edit-email" type="email" error={errors.email?.message} {...register("email")} />
          </FormField>
          <FormField label="Joining Date" htmlFor="edit-joiningDate" error={errors.joiningDate?.message} required>
            <DateField id="edit-joiningDate" error={errors.joiningDate?.message} {...register("joiningDate")} />
          </FormField>
          <FormField label="Department" htmlFor="edit-department" error={errors.department?.message} required>
            <Select
              id="edit-department"
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              error={errors.department?.message}
              {...register("department")}
            />
          </FormField>
          <FormField label="Position" htmlFor="edit-position" error={errors.position?.message} required>
            <Select
              id="edit-position"
              options={POSITIONS.map((p) => ({ value: p, label: p }))}
              error={errors.position?.message}
              {...register("position")}
            />
          </FormField>
          <FormField label="Basic Salary" htmlFor="edit-basicSalary" error={errors.basicSalary?.message} required>
            <Input
              id="edit-basicSalary"
              type="number"
              min={0}
              step={500}
              error={errors.basicSalary?.message}
              {...register("basicSalary")}
            />
          </FormField>
          <FormField label="System Role" htmlFor="edit-role" error={errors.role?.message} required>
            <Select
              id="edit-role"
              options={[
                { value: "employee", label: "Employee" },
                { value: "admin", label: "Administrator" },
              ]}
              error={errors.role?.message}
              {...register("role")}
            />
          </FormField>
          <FormField label="Address" htmlFor="edit-address" error={errors.address?.message} className="sm:col-span-2" required>
            <Textarea id="edit-address" rows={2} error={errors.address?.message} {...register("address")} />
          </FormField>
        </div>

        <SubmitButton className="sr-only" loadingText="Saving…">
          Save
        </SubmitButton>
      </form>
    </Modal>
  );
}
