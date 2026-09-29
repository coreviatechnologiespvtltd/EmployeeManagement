import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatCurrency, monthLabel, formatDate } from "@/lib/format";
import { PAYMENT_STATUS_META } from "@/lib/status";
import { Receipt, Download, Printer } from "lucide-react";
import type { SalaryRecord } from "@/types/salary";

export function SalarySlipCard({
  record,
  onDownload,
  onPrint,
}: {
  record: SalaryRecord | null;
  onDownload?: () => void;
  onPrint?: () => void;
}) {
  if (!record) {
    return (
      <div className="rounded-card border border-ink-100 bg-white shadow-card">
        <EmptyState
          icon={Receipt}
          title="No payslip generated"
          description="Your payslip for the current month will appear here once payroll is processed."
        />
      </div>
    );
  }

  const meta = PAYMENT_STATUS_META[record.paymentStatus];
  const gross = record.basicSalary + record.allowances + record.bonus;

  return (
    <section className="rounded-card border border-ink-100 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Salary Slip — {monthLabel(record.month)}</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {record.employeeName} · {record.department}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {onPrint && (
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer aria-hidden className="h-3.5 w-3.5" />
              Print
            </Button>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download aria-hidden className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
        </div>
      </header>

      <div className="px-5 py-5">
        <table className="w-full text-sm">
          <caption className="sr-only">Salary breakdown for {monthLabel(record.month)}</caption>
          <tbody>
            <SlipRow label="Basic Salary" amount={record.basicSalary} />
            <SlipRow label="Allowances" amount={record.allowances} />
            <SlipRow label="Bonus & Incentives" amount={record.bonus} />
            <tr className="border-t border-ink-100">
              <th scope="row" className="py-2.5 text-left font-medium text-ink-700">
                Gross Earnings
              </th>
              <td className="py-2.5 text-right font-semibold text-ink-900">{formatCurrency(gross)}</td>
            </tr>
            <SlipRow label="Deductions" amount={-record.deductions} tone="danger" />
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-200">
              <th scope="row" className="pt-3.5 text-left text-sm font-semibold text-ink-900">
                Net Salary
              </th>
              <td className="pt-3.5 text-right text-lg font-semibold text-ink-900">{formatCurrency(record.netSalary)}</td>
            </tr>
          </tfoot>
        </table>

        {record.remarks && (
          <p className="mt-4 rounded-lg bg-surface-subtle px-3.5 py-2.5 text-xs text-ink-600">{record.remarks}</p>
        )}

        {record.paidAt && (
          <p className="mt-3 text-xs text-ink-500">Paid on {formatDate(record.paidAt)}</p>
        )}
      </div>
    </section>
  );
}

function SlipRow({
  label,
  amount,
  tone = "default",
}: {
  label: string;
  amount: number;
  tone?: "default" | "danger";
}) {
  return (
    <tr>
      <th scope="row" className="py-2.5 text-left font-medium text-ink-700">
        {label}
      </th>
      <td
        className={`py-2.5 text-right font-medium ${
          amount < 0 ? "text-danger-600" : tone === "danger" ? "text-danger-600" : "text-ink-800"
        }`}
      >
        {amount < 0 ? `−${formatCurrency(Math.abs(amount))}` : formatCurrency(amount)}
      </td>
    </tr>
  );
}
