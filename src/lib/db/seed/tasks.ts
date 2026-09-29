import type { Task } from "@/types/task";
import { seedEmployees } from "./employees";
import { shiftDays, toISODate, toISODateTime, todayDate } from "./date-utils";

const today = todayDate();
const admin = seedEmployees[0]!;
const lead = seedEmployees[9]!;

function employeeName(id: string): string {
  return seedEmployees.find((e) => e.id === id)?.fullName ?? "Unknown";
}

function task(
  id: string,
  employeeId: string,
  title: string,
  description: string,
  priority: Task["priority"],
  status: Task["status"],
  startOffset: number,
  dueOffset: number,
  createdOffset: number,
  assigner: typeof admin = admin,
): Task {
  return {
    id,
    title,
    description,
    assignedToId: employeeId,
    assignedToName: employeeName(employeeId),
    assignedById: assigner.id,
    assignedByName: assigner.fullName,
    createdAt: toISODateTime(shiftDays(today, createdOffset)),
    startDate: toISODate(shiftDays(today, startOffset)),
    dueDate: toISODate(shiftDays(today, dueOffset)),
    priority,
    status,
    completedAt: status === "completed" ? toISODateTime(shiftDays(today, dueOffset)) : undefined,
  };
}

export const seedTasks: Task[] = [
  task(
    "tsk-3001",
    "emp-1002",
    "Complete payroll integration module",
    "Finish the salary slip generation flow and wire it to the existing employee records endpoint. Include validation for absent days and late deductions.",
    "urgent",
    "in_progress",
    -4,
    3,
    -9,
  ),
  task(
    "tsk-3002",
    "emp-1002",
    "Review PR for attendance correction API",
    "Review the pull request from the platform team covering manual attendance correction with audit logging. Leave comments on validation edge cases.",
    "high",
    "pending",
    -2,
    1,
    -3,
    lead,
  ),
  task(
    "tsk-3003",
    "emp-1002",
    "Update onboarding documentation",
    "Refresh the internal engineering handbook with the new local setup steps and the updated branch naming convention.",
    "low",
    "completed",
    -14,
    -6,
    -18,
  ),
  task(
    "tsk-3004",
    "emp-1002",
    "Fix leave balance calculation bug",
    "The leave balance card shows the wrong remaining value when a request is rejected. Recalculate from approved requests only.",
    "high",
    "overdue",
    -12,
    -3,
    -14,
    lead,
  ),
  task(
    "tsk-3005",
    "emp-1002",
    "Prepare Q3 performance review notes",
    "Summarise delivery highlights and growth areas for the quarterly review meeting with the department head.",
    "medium",
    "pending",
    1,
    9,
    -1,
  ),
  task("tsk-3010", "emp-1003", "Migrate auth service to new token format", "Update the token issuing logic to match the new session contract.", "high", "in_progress", -5, 4, -8, lead),
  task("tsk-3011", "emp-1003", "Write unit tests for leave balance helper", "Cover the edge cases around rejected requests and partial days.", "medium", "pending", -1, 6, -2, lead),
  task("tsk-3012", "emp-1003", "Fix flaky dashboard chart test", "The earnings chart test is timing out intermittently in CI.", "low", "overdue", -10, -2, -12),
  task("tsk-3013", "emp-1004", "Publish October hiring plan", "Draft the headcount plan for the next two quarters and circulate to department leads.", "medium", "pending", 0, 5, -1),
  task("tsk-3014", "emp-1004", "Onboard two QA contractors", "Handle paperwork, system access and buddy assignment for the incoming QA contractors.", "high", "in_progress", -6, 2, -9),
  task("tsk-3015", "emp-1005", "Reconcile September vendor invoices", "Match purchase invoices against ledger entries and flag mismatches for review.", "urgent", "pending", -2, 0, -6),
  task("tsk-3016", "emp-1005", "Prepare monthly financial statement draft", "Assemble the trial balance and draft P&L for internal review.", "high", "pending", 1, 7, -2),
  task("tsk-3017", "emp-1006", "Prepare client renewal proposals", "Draft renewal proposals for the four accounts up for renewal this quarter.", "high", "in_progress", -3, 4, -7),
  task("tsk-3018", "emp-1007", "Regression test release candidate 4.2", "Run the full regression suite and file defects for anything blocking release.", "urgent", "in_progress", -4, 1, -8),
  task("tsk-3019", "emp-1007", "Update test automation scripts", "Bring the automation scripts in line with the new checkout flow.", "low", "completed", -16, -9, -20),
  task("tsk-3020", "emp-1008", "Design social campaign creatives", "Produce the creative set for the upcoming product awareness campaign.", "medium", "pending", -1, 8, -4),
  task("tsk-3021", "emp-1009", "Draft weekly support digest", "Summarise the week’s top support issues for the product team.", "low", "completed", -11, -8, -14),
  task("tsk-3022", "emp-1010", "Mentor two junior engineers", "Schedule weekly one-on-ones and review their design proposals.", "medium", "in_progress", -8, 12, -10),
];
