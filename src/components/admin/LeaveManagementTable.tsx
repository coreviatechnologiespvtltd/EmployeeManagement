"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { FormActions } from "@/components/forms/FormActions";
import { Pagination, paginate, pageCountFor } from "@/components/ui/Pagination";
import { decideLeaveAction } from "@/app/admin/actions";
import { LEAVE_STATUS_META, LEAVE_TYPE_LABELS } from "@/lib/status";
import { LEAVE_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Check, X, MessageSquare } from "lucide-react";
import type { LeaveRequest } from "@/types/leave";

const PAGE_SIZE = 8;

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export function LeaveManagementTable({ requests }: { requests: LeaveRequest[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [leaveType, setLeaveType] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{ request: LeaveRequest; outcome: "approved" | "rejected" } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (q && ![request.employeeName, request.reason, request.department ?? ""].join(" ").toLowerCase().includes(q)) {
        return false;
      }
      if (status !== "all" && request.status !== status) return false;
      if (leaveType !== "all" && request.leaveType !== leaveType) return false;
      return true;
    });
  }, [requests, query, status, leaveType]);

  const totalPages = pageCountFor(filtered.length, PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible = paginate(filtered, safePage, PAGE_SIZE);
  const hasFilters = query !== "" || status !== "all" || leaveType !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setLeaveType("all");
    setPage(1);
  }

  function decide(request: LeaveRequest, outcome: "approved" | "rejected", comment?: string) {
    startTransition(async () => {
      const result = await decideLeaveAction(request.id, outcome, comment);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setDecision(null);
        router.refresh();
      }
    });
  }

  const tabs = (["all", "pending", "approved", "rejected"] as const).map((value) => ({
    value,
    label:
      value === "all"
        ? "All"
        : value === "pending"
          ? "Pending"
          : value === "approved"
            ? "Approved"
            : "Rejected",
    count: value === "all" ? requests.length : requests.filter((r) => r.status === value).length,
  }));

  return (
    <>
      <Tabs
        items={tabs}
        value={status}
        onChange={(value) => {
          setStatus(value as StatusFilter);
          setPage(1);
        }}
        className="mb-5"
        ariaLabel="Filter leave requests by status"
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by employee or reason"
            label="Search leave requests"
          />
          <Select
            value={leaveType}
            onChange={(event) => {
              setLeaveType(event.target.value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All leave types" }, ...LEAVE_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
            aria-label="Filter by leave type"
          />
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-800">{filtered.length}</span> of {requests.length}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No leave requests found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {hasFilters ? "Try adjusting your search or filters." : "Applications from staff will appear here."}
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
            <table className="w-full min-w-[960px] text-sm">
              <caption className="sr-only">Leave applications</caption>
              <thead>
                <tr className="border-b border-ink-100 bg-surface-subtle text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-3 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Leave Type</th>
                  <th scope="col" className="px-4 py-3 font-medium">Period</th>
                  <th scope="col" className="px-4 py-3 font-medium">Days</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visible.map((request) => {
                  const meta = LEAVE_STATUS_META[request.status];
                  return (
                    <tr key={request.id} className="align-top transition-colors duration-150 hover:bg-surface-subtle">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={request.employeeName} size="xs" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{request.employeeName}</p>
                            <p className="truncate text-xs text-ink-500">{request.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                        {LEAVE_TYPE_LABELS[request.leaveType]}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-700">
                        {formatDate(request.startDate)}
                        {request.endDate !== request.startDate && (
                          <span className="text-ink-400"> – {formatDate(request.endDate)}</span>
                        )}
                        <p className="mt-1 line-clamp-2 max-w-[220px] text-xs text-ink-500">{request.reason}</p>
                      </td>
                      <td className="px-4 py-3.5 font-medium whitespace-nowrap text-ink-900">
                        {request.totalDays}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                        {request.adminComment && (
                          <p className="mt-1.5 line-clamp-2 max-w-[180px] text-xs text-ink-500">
                            {request.adminComment}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {request.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => decide(request, "rejected")}
                            >
                              <X aria-hidden className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button size="sm" disabled={pending} onClick={() => setDecision({ request, outcome: "approved" })}>
                              <Check aria-hidden className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      <DecisionModal
        decision={decision}
        onClose={() => setDecision(null)}
        isPending={pending}
        onConfirm={(comment) => decision && decide(decision.request, decision.outcome, comment)}
      />
    </>
  );
}

function DecisionModal({
  decision,
  onClose,
  isPending,
  onConfirm,
}: {
  decision: { request: LeaveRequest; outcome: "approved" | "rejected" } | null;
  onClose: () => void;
  isPending: boolean;
  onConfirm: (comment: string) => void;
}) {
  const [comment, setComment] = useState("");

  return (
    <Modal
      open={decision !== null}
      onClose={onClose}
      title="Approve Leave Request"
      description={
        decision
          ? `${decision.request.employeeName} · ${decision.request.totalDays} day${decision.request.totalDays === 1 ? "" : "s"}`
          : undefined
      }
      size="sm"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button isLoading={isPending} loadingText="Approving…" onClick={() => onConfirm(comment)}>
            <Check aria-hidden className="h-4 w-4" />
            Approve
          </Button>
        </FormActions>
      }
    >
      <div className="space-y-4">
        {decision && (
          <div className="rounded-lg bg-surface-subtle px-3.5 py-3">
            <p className="text-sm text-ink-700">{decision.request.reason}</p>
            <p className="mt-2 text-xs text-ink-500">
              {formatDate(decision.request.startDate)}
              {decision.request.endDate !== decision.request.startDate &&
                ` – ${formatDate(decision.request.endDate)}`}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="decision-comment" className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
            <MessageSquare aria-hidden className="h-3.5 w-3.5 text-ink-400" />
            Note for the employee
            <span className="text-xs font-normal text-ink-400">(optional)</span>
          </label>
          <Textarea
            id="decision-comment"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="e.g. Approved. Please hand over pending items before leaving."
            maxLength={300}
          />
        </div>
      </div>
    </Modal>
  );
}
