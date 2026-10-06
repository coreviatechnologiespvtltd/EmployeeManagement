"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { SalaryFormModal, MarkPaidButton } from "@/components/admin/SalaryFormModal";
import { PAYMENT_STATUS_META } from "@/lib/status";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { formatCurrency, monthLabel } from "@/lib/format";
import { Plus, Pencil } from "lucide-react";
import type { SalaryRecord } from "@/types/salary";

type StaffOption = { id: string; fullName: string; department: string; basicSalary: number };

export function SalaryManagementTable({
  records,
  staff,
  months,
  currentMonth,
}: {
  records: SalaryRecord[];
  staff: StaffOption[];
  months: string[];
  currentMonth: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const [query, setQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"all" | "pending" | "processing" | "paid">("all");
  const [editing, setEditing] = useState<SalaryRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (q && ![record.employeeName, record.department].join(" ").toLowerCase().includes(q)) return false;
      if (paymentStatus !== "all" && record.paymentStatus !== paymentStatus) return false;
      return true;
    });
  }, [records, query, paymentStatus]);

  const totals = useMemo(
    () => ({
      gross: filtered.reduce((sum, r) => sum + r.basicSalary + r.allowances + r.bonus, 0),
      deductions: filtered.reduce((sum, r) => sum + r.deductions, 0),
      net: filtered.reduce((sum, r) => sum + r.netSalary, 0),
    }),
    [filtered],
  );

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-2xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by employee or department"
            label="Search salary records"
          />
          <Select
            id="salary-month"
            label="Month"
            value={month}
            onChange={(event) => {
              const next = event.target.value;
              setMonth(next);
              router.push(`?month=${next}`);
            }}
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
          />
          <Select
            id="salary-status"
            label="Payment status"
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
            options={[
              { value: "all", label: "All payment statuses" },
              ...PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No salary records</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {query || paymentStatus !== "all"
              ? "Try adjusting your search or filters."
              : `No payroll records exist for ${monthLabel(month)} yet.`}
          </p>
          {!query && paymentStatus === "all" && (
            <Button className="mt-4" onClick={() => setCreating(true)}>
              Add the first record
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="grid grid-cols-2 gap-4 border-b border-ink-100 bg-surface-subtle px-5 py-3 sm:grid-cols-4">
            <Summary label="Employees" value={String(filtered.length)} />
            <Summary label="Gross" value={formatCurrency(totals.gross)} />
            <Summary label="Deductions" value={formatCurrency(totals.deductions)} />
            <Summary label="Net Payroll" value={formatCurrency(totals.net)} strong />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <caption className="sr-only">Salary records for {monthLabel(month)}</caption>
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-3 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Basic</th>
                  <th scope="col" className="px-4 py-3 font-medium">Allowances</th>
                  <th scope="col" className="px-4 py-3 font-medium">Deductions</th>
                  <th scope="col" className="px-4 py-3 font-medium">Net Salary</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((record) => {
                  const meta = PAYMENT_STATUS_META[record.paymentStatus];
                  return (
                    <tr key={record.id} className="transition-colors duration-150 hover:bg-surface-subtle">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink-900">{record.employeeName}</p>
                        <p className="text-xs text-ink-500">{record.department}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">{formatCurrency(record.basicSalary)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">{formatCurrency(record.allowances)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-danger-600">−{formatCurrency(record.deductions)}</td>
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-ink-900">
                        {formatCurrency(record.netSalary)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(record)}>
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {record.paymentStatus !== "paid" && <MarkPaidButton recordId={record.id} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(editing || creating) && (
        <SalaryFormModal
          record={editing}
          month={month}
          staff={staff}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={strong ? "text-base font-semibold text-ink-900" : "text-sm font-medium text-ink-800"}>{value}</p>
    </div>
  );
}
