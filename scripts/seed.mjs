/**
 * Seeds the demo dataset used to exercise every screen.
 *
 * The data is the same set of people, tasks, attendance, payroll, leave and
 * notices that the in-memory mock shipped with, so the UI looks identical — but
 * it now lands in real PostgreSQL tables and survives a restart.
 *
 * This script is destructive: it truncates every application table first, so it
 * is a development convenience. Do not run it against a database that matters.
 *
 *   npm run db:seed
 *
 * Demo passwords can be overridden without editing this file:
 *   SEED_ADMIN_PASSWORD=... SEED_EMPLOYEE_PASSWORD=... npm run db:seed
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { Client } from "pg";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(projectRoot, ".env"), quiet: true });

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
const EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD ?? "Employee@123";
const BCRYPT_ROUNDS = 12;

/* -------------------------------------------------------------------------- */
/* Date helpers                                                                */
/* -------------------------------------------------------------------------- */

const toISODate = (d) => d.toISOString().slice(0, 10);
const toISODateTime = (d) => d.toISOString();

/** Deterministic PRNG so a re-seed produces the same dataset. */
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function shiftDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function shiftMonths(base, months) {
  return new Date(base.getFullYear(), base.getMonth() + months, 1);
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/* -------------------------------------------------------------------------- */
/* Static demo data                                                            */
/* -------------------------------------------------------------------------- */

const today = todayDate();

const LATE_THRESHOLD_MINUTES = 15;

const departments = [
  "Customer Support",
  "Engineering",
  "Finance",
  "Human Resources",
  "Marketing",
  "Operations",
  "Quality Assurance",
  "Sales",
];

const employees = [
  {
    id: "emp-1001",
    fullName: "Aarav Shrestha",
    username: "admin",
    email: "admin@corevia.com",
    phone: "+977 9841 234567",
    address: "Koteshwor, Kathmandu",
    department: "Operations",
    position: "Operations Manager",
    joiningDate: "2019-02-04",
    role: "admin",
    basicSalary: 95000,
  },
  {
    id: "emp-1002",
    fullName: "Sushmita Adhikari",
    username: "employee",
    email: "employee@corevia.com",
    phone: "+977 9812 876543",
    address: "Balkhu, Kathmandu",
    department: "Engineering",
    position: "Senior Software Engineer",
    joiningDate: "2021-06-15",
    role: "employee",
    basicSalary: 40000,
  },
  {
    id: "emp-1003",
    fullName: "Bikash Thapa",
    username: "bikash.thapa",
    email: "bikash.thapa@corevia.com",
    phone: "+977 9803 456789",
    address: "",
    department: "Engineering",
    position: "Software Engineer",
    joiningDate: "2022-11-02",
    role: "employee",
    basicSalary: 34000,
  },
  {
    id: "emp-1004",
    fullName: "Nisha Gurung",
    username: "nisha.gurung",
    email: "nisha.gurung@corevia.com",
    phone: "+977 9845 223344",
    address: "Lalitpur",
    department: "Human Resources",
    position: "HR Executive",
    joiningDate: "2022-03-21",
    role: "employee",
    basicSalary: 32000,
  },
  {
    id: "emp-1005",
    fullName: "Rajesh Maharjan",
    username: "rajesh.maharjan",
    email: "rajesh.maharjan@corevia.com",
    phone: "+977 9765 443322",
    address: "",
    department: "Finance",
    position: "Accountant",
    joiningDate: "2020-09-14",
    role: "employee",
    basicSalary: 36000,
  },
  {
    id: "emp-1006",
    fullName: "Pratiksha Karki",
    username: "pratiksha.karki",
    email: "pratiksha.karki@corevia.com",
    phone: "+977 9811 778899",
    address: "",
    department: "Sales",
    position: "Sales Executive",
    joiningDate: "2023-01-09",
    role: "employee",
    basicSalary: 28000,
  },
  {
    id: "emp-1007",
    fullName: "Anil Bhattarai",
    username: "anil.bhattarai",
    email: "anil.bhattarai@corevia.com",
    phone: "+977 9800 991122",
    address: "",
    department: "Quality Assurance",
    position: "QA Engineer",
    joiningDate: "2021-08-30",
    role: "employee",
    basicSalary: 33000,
  },
  {
    id: "emp-1008",
    fullName: "Manisha Rai",
    username: "manisha.rai",
    email: "manisha.rai@corevia.com",
    phone: "+977 9847 665544",
    address: "Tokha, Kathmandu",
    department: "Marketing",
    position: "Marketing Specialist",
    joiningDate: "2022-07-18",
    role: "employee",
    basicSalary: 30000,
  },
  {
    id: "emp-1009",
    fullName: "Sanjay Tamang",
    username: "sanjay.tamang",
    email: "sanjay.tamang@corevia.com",
    phone: "+977 9855 334455",
    address: "",
    department: "Customer Support",
    position: "Support Agent",
    joiningDate: "2023-05-08",
    role: "employee",
    basicSalary: 25000,
  },
  {
    id: "emp-1010",
    fullName: "Deepika Neupane",
    username: "deepika.neupane",
    email: "deepika.neupane@corevia.com",
    phone: "+977 9822 110099",
    address: "",
    department: "Engineering",
    position: "Team Lead",
    joiningDate: "2018-12-03",
    role: "employee",
    basicSalary: 62000,
  },
  {
    id: "emp-1011",
    fullName: "Kiran Pokhrel",
    username: "kiran.pokhrel",
    email: "kiran.pokhrel@corevia.com",
    phone: "+977 9700 556677",
    address: "",
    department: "Engineering",
    position: "Software Engineer",
    joiningDate: "2024-01-22",
    role: "employee",
    status: "inactive",
    basicSalary: 31000,
  },
];

const activeEmployees = employees.filter((e) => e.status !== "inactive");
const employeeName = (id) => employees.find((e) => e.id === id)?.fullName ?? "Unknown";

/* -------------------------------------------------------------------------- */
/* Generated data                                                              */
/* -------------------------------------------------------------------------- */

function buildTasks() {
  const admin = employees[0];
  const lead = employees[9];

  const task = (
    id,
    employeeId,
    title,
    description,
    priority,
    status,
    startOffset,
    dueOffset,
    createdOffset,
    assigner = admin,
  ) => ({
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
    completedAt: status === "completed" ? toISODateTime(shiftDays(today, dueOffset)) : null,
  });

  return [
    task("tsk-3001", "emp-1002", "Complete payroll integration module",
      "Finish the salary slip generation flow and wire it to the existing employee records endpoint. Include validation for absent days and late deductions.",
      "urgent", "in_progress", -4, 3, -9),
    task("tsk-3002", "emp-1002", "Review PR for attendance correction API",
      "Review the pull request from the platform team covering manual attendance correction with audit logging. Leave comments on validation edge cases.",
      "high", "pending", -2, 1, -3, lead),
    task("tsk-3003", "emp-1002", "Update onboarding documentation",
      "Refresh the internal engineering handbook with the new local setup steps and the updated branch naming convention.",
      "low", "completed", -14, -6, -18),
    task("tsk-3004", "emp-1002", "Fix leave balance calculation bug",
      "The leave balance card shows the wrong remaining value when a request is rejected. Recalculate from approved requests only.",
      "high", "overdue", -12, -3, -14, lead),
    task("tsk-3005", "emp-1002", "Prepare Q3 performance review notes",
      "Summarise delivery highlights and growth areas for the quarterly review meeting with the department head.",
      "medium", "pending", 1, 9, -1),
    task("tsk-3010", "emp-1003", "Migrate auth service to new token format",
      "Update the token issuing logic to match the new session contract.",
      "high", "in_progress", -5, 4, -8, lead),
    task("tsk-3011", "emp-1003", "Write unit tests for leave balance helper",
      "Cover the edge cases around rejected requests and partial days.",
      "medium", "pending", -1, 6, -2, lead),
    task("tsk-3012", "emp-1003", "Fix flaky dashboard chart test",
      "The earnings chart test is timing out intermittently in CI.",
      "low", "overdue", -10, -2, -12),
    task("tsk-3013", "emp-1004", "Publish October hiring plan",
      "Draft the headcount plan for the next two quarters and circulate to department leads.",
      "medium", "pending", 0, 5, -1),
    task("tsk-3014", "emp-1004", "Onboard two QA contractors",
      "Handle paperwork, system access and buddy assignment for the incoming QA contractors.",
      "high", "in_progress", -6, 2, -9),
    task("tsk-3015", "emp-1005", "Reconcile September vendor invoices",
      "Match purchase invoices against ledger entries and flag mismatches for review.",
      "urgent", "pending", -2, 0, -6),
    task("tsk-3016", "emp-1005", "Prepare monthly financial statement draft",
      "Assemble the trial balance and draft P&L for internal review.",
      "high", "pending", 1, 7, -2),
    task("tsk-3017", "emp-1006", "Prepare client renewal proposals",
      "Draft renewal proposals for the four accounts up for renewal this quarter.",
      "high", "in_progress", -3, 4, -7),
    task("tsk-3018", "emp-1007", "Regression test release candidate 4.2",
      "Run the full regression suite and file defects for anything blocking release.",
      "urgent", "in_progress", -4, 1, -8),
    task("tsk-3019", "emp-1007", "Update test automation scripts",
      "Bring the automation scripts in line with the new checkout flow.",
      "low", "completed", -16, -9, -20),
    task("tsk-3020", "emp-1008", "Design social campaign creatives",
      "Produce the creative set for the upcoming product awareness campaign.",
      "medium", "pending", -1, 8, -4),
    task("tsk-3021", "emp-1009", "Draft weekly support digest",
      "Summarise the week’s top support issues for the product team.",
      "low", "completed", -11, -8, -14),
    task("tsk-3022", "emp-1010", "Mentor two junior engineers",
      "Schedule weekly one-on-ones and review their design proposals.",
      "medium", "in_progress", -8, 12, -10),
  ];
}

function buildAttendance() {
  const random = makeRandom(20260929);
  const rows = [];

  // 90 days back and 3 days forward, so the current and next payroll month are
  // both populated.
  for (let offset = -90; offset <= 3; offset++) {
    const day = shiftDays(today, offset);
    const weekday = day.getDay();
    if (weekday === 0) continue; // Sunday

    const isSaturday = weekday === 6;
    const date = toISODate(day);

    for (const emp of activeEmployees) {
      // Deterministic per-employee attendance character.
      const empRoll = random();
      const roll = ((emp.id.charCodeAt(5) * 7 + offset * 13) % 100) / 100;
      const score = (empRoll + roll) / 2;

      let status;
      if (isSaturday) {
        status = score > 0.55 ? "present" : "half_day";
      } else if (score > 0.95) {
        status = "leave";
      } else if (score > 0.86) {
        status = "absent";
      } else if (score > 0.22) {
        status = "late";
      } else {
        status = "present";
      }

      const lateMinutes =
        status === "late" ? LATE_THRESHOLD_MINUTES + Math.floor(random() * 25) : Math.floor(random() * 8);
      const earlyMinutes = Math.floor(random() * 40);

      const checkInBase = new Date(day);
      checkInBase.setHours(9, 0, 0, 0);
      checkInBase.setMinutes(checkInBase.getMinutes() + lateMinutes);

      const checkOutBase = new Date(day);
      checkOutBase.setHours(17, 45, 0, 0);
      checkOutBase.setMinutes(checkOutBase.getMinutes() - earlyMinutes);

      const isWorking = status === "present" || status === "late" || status === "half_day";
      const checkIn = isWorking ? toISODateTime(checkInBase) : null;
      const checkOut = isWorking ? toISODateTime(checkOutBase) : null;
      const workingHours =
        isWorking && checkIn && checkOut
          ? Number(((new Date(checkOut) - new Date(checkIn)) / 3_600_000).toFixed(2))
          : null;

      rows.push({
        id: `att-${emp.id}-${date}`,
        employeeId: emp.id,
        workDate: date,
        status,
        checkIn,
        checkOut,
        workingHours,
        remarks: null,
      });
    }
  }

  // Give the two demo logins a clear state on the dashboard for today.
  const todayStr = toISODate(today);
  for (const row of rows) {
    if (row.workDate !== todayStr) continue;

    if (row.employeeId === "emp-1002") {
      row.status = "present";
      row.checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 2, 0).toISOString();
      row.checkOut = null;
      row.workingHours = null;
    }
    if (row.employeeId === "emp-1001") {
      row.status = "late";
      row.checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 18, 0).toISOString();
      row.checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 52, 0).toISOString();
      row.workingHours = 8.57;
    }
  }

  return rows;
}

function buildSalaries() {
  const random = makeRandom(770425);
  const rows = [];

  const allowancesByDepartment = {
    Engineering: 10000,
    "Human Resources": 8000,
    Finance: 9000,
    Sales: 12000,
    Marketing: 8000,
    "Customer Support": 6000,
    "Quality Assurance": 9000,
    Operations: 11000,
  };

  const months = Array.from({ length: 12 }, (_, i) => monthKey(shiftMonths(today, i - 11)));

  months.forEach((month, monthIndex) => {
    for (const emp of activeEmployees) {
      const allowances = allowancesByDepartment[emp.department] ?? 8000;
      // Bonuses land twice a year.
      const isBonusMonth = monthIndex % 6 === 5;
      const bonus = isBonusMonth ? Math.round(emp.basicSalary * (0.15 + random() * 0.1)) : 0;
      const tada = random() > 0.8 ? Math.round(300 + random() * 900) : 0;
      const pfDeduction = Math.round(emp.basicSalary * 0.1);
      const absenceDeduction = random() > 0.88 ? 1200 : 0;
      const deductions = pfDeduction + absenceDeduction;
      const net = emp.basicSalary + allowances + bonus + tada - deductions;

      const isPast = monthIndex < months.length - 1;
      const isCurrent = monthIndex === months.length - 1;

      rows.push({
        employeeId: emp.id,
        month: `${month}-01`,
        basicSalary: emp.basicSalary,
        allowances,
        bonus: bonus + tada,
        deductions,
        netSalary: net,
        paymentStatus: isPast ? "paid" : isCurrent ? "processing" : "pending",
        paidAt: isPast ? `${month}-28T10:00:00.000Z` : null,
        remarks: absenceDeduction > 0 ? "Includes absence deduction" : null,
      });
    }
  });

  return rows;
}

function buildLeaveRequests() {
  return [
    {
      id: "lv-2001",
      employeeId: "emp-1002",
      leaveType: "annual",
      startDate: toISODate(shiftDays(today, -22)),
      endDate: toISODate(shiftDays(today, -19)),
      totalDays: 4,
      reason: "Family function out of valley, travel booked and confirmed.",
      appliedAt: toISODateTime(shiftDays(today, -30)),
      status: "approved",
      adminComment: "Approved. Enjoy the break.",
      reviewedById: "emp-1001",
      reviewedAt: toISODateTime(shiftDays(today, -29)),
    },
    {
      id: "lv-2002",
      employeeId: "emp-1003",
      leaveType: "sick",
      startDate: toISODate(shiftDays(today, -4)),
      endDate: toISODate(shiftDays(today, -3)),
      totalDays: 2,
      reason: "Viral fever, advised rest by the doctor.",
      appliedAt: toISODateTime(shiftDays(today, -5)),
      status: "approved",
      adminComment: "Take care. Get well soon.",
      reviewedById: "emp-1001",
      reviewedAt: toISODateTime(shiftDays(today, -5)),
    },
    {
      id: "lv-2003",
      employeeId: "emp-1004",
      leaveType: "casual",
      startDate: toISODate(shiftDays(today, 6)),
      endDate: toISODate(shiftDays(today, 7)),
      totalDays: 2,
      reason: "Personal paperwork at the district office.",
      appliedAt: toISODateTime(shiftDays(today, -1)),
      status: "pending",
      adminComment: null,
      reviewedById: null,
      reviewedAt: null,
    },
    {
      id: "lv-2004",
      employeeId: "emp-1006",
      leaveType: "annual",
      startDate: toISODate(shiftDays(today, 14)),
      endDate: toISODate(shiftDays(today, 20)),
      totalDays: 7,
      reason: "Annual vacation to Pokhara with family.",
      appliedAt: toISODateTime(shiftDays(today, -2)),
      status: "pending",
      adminComment: null,
      reviewedById: null,
      reviewedAt: null,
    },
    {
      id: "lv-2005",
      employeeId: "emp-1008",
      leaveType: "unpaid",
      startDate: toISODate(shiftDays(today, -12)),
      endDate: toISODate(shiftDays(today, -11)),
      totalDays: 2,
      reason: "Needed to handle urgent property registration.",
      appliedAt: toISODateTime(shiftDays(today, -16)),
      status: "rejected",
      adminComment: "Campaign launch week. Please reschedule for next month.",
      reviewedById: "emp-1001",
      reviewedAt: toISODateTime(shiftDays(today, -15)),
    },
    {
      id: "lv-2006",
      employeeId: "emp-1009",
      leaveType: "casual",
      startDate: toISODate(shiftDays(today, 2)),
      endDate: toISODate(shiftDays(today, 2)),
      totalDays: 1,
      reason: "Bank appointment in the afternoon.",
      appliedAt: toISODateTime(today),
      status: "pending",
      adminComment: null,
      reviewedById: null,
      reviewedAt: null,
    },
    {
      id: "lv-2007",
      employeeId: "emp-1010",
      leaveType: "annual",
      startDate: toISODate(shiftMonths(today, -1)),
      endDate: toISODate(shiftDays(shiftMonths(today, -1), 2)),
      totalDays: 3,
      reason: "Pre-planned leave, handover documented in the tracker.",
      appliedAt: toISODateTime(shiftDays(today, -40)),
      status: "approved",
      adminComment: "Approved, handover notes are complete.",
      reviewedById: "emp-1001",
      reviewedAt: toISODateTime(shiftDays(today, -38)),
    },
    {
      id: "lv-2008",
      employeeId: "emp-1005",
      leaveType: "sick",
      startDate: toISODate(shiftDays(today, -1)),
      endDate: toISODate(shiftDays(today, -1)),
      totalDays: 1,
      reason: "Migraine, unable to work.",
      appliedAt: toISODateTime(shiftDays(today, -1)),
      status: "pending",
      adminComment: null,
      reviewedById: null,
      reviewedAt: null,
    },
  ];
}

function buildAnnouncements() {
  return [
    {
      id: "ann-4001",
      title: "Dashad 2083 public holiday schedule",
      description:
        "The office will remain closed from Dashad 15 to Dashad 22. Standard attendance and payroll cycles are unaffected.",
      body: `The Ministry of Home Affairs has published the official Dashad 2083 holiday list. Corevia Technologies will observe the following closure:

• Dashad 15 – Dashad 22: Office closed for all departments
• Only the on-call engineering rotation will remain reachable for production incidents
• Support tickets raised during the closure will be triaged on Dashad 23

Please update your calendar and let your team lead know if you have any customer commitments scheduled during the closure. Payroll for the month is unaffected and will be processed on schedule.`,
      authorId: "emp-1001",
      priority: "high",
      status: "published",
      publishedAt: toISODateTime(shiftDays(today, -2)),
      expiresAt: toISODateTime(shiftDays(today, 8)),
      readBy: [],
    },
    {
      id: "ann-4002",
      title: "Mid-year performance review cycle opens",
      description:
        "Self-assessment forms are due within two weeks. Department heads will schedule one-on-one discussions from next month.",
      body: `The mid-year performance review cycle is now open.

What you need to do:
1. Complete your self-assessment form in the internal HR portal
2. List the projects you contributed to, with measurable outcomes
3. Submit before the end of the month

Department heads will then schedule one-on-one discussions. Calibration sessions for managers follow the week after. Please talk to your reporting manager if you need clarification on expectations for your role.`,
      authorId: "emp-1004",
      priority: "normal",
      status: "published",
      publishedAt: toISODateTime(shiftDays(today, -6)),
      expiresAt: toISODateTime(shiftDays(today, 14)),
      readBy: ["emp-1004"],
    },
    {
      id: "ann-4003",
      title: "New health insurance policy from next month",
      description:
        "Coverage is being upgraded with a higher consultation limit and added dental cover. Enrollment is automatic unless you opt out.",
      body: `We have renegotiated our group health insurance policy. Key changes:

• Consultation limit raised from NPR 2,000 to NPR 3,500 per visit
• Dental cover added with a NPR 15,000 annual limit
• Dependent coverage now extends to children up to age 25
• Premium contribution split revised in favour of employees

Enrollment is automatic. If you want to opt out, submit the form to HR before the end of the month. Existing members will receive physical cards at the office reception.`,
      authorId: "emp-1004",
      priority: "normal",
      status: "published",
      publishedAt: toISODateTime(shiftDays(today, -11)),
      expiresAt: toISODateTime(shiftDays(today, 20)),
      readBy: ["emp-1004", "emp-1002", "emp-1005"],
    },
    {
      id: "ann-4004",
      title: "Mandatory security awareness training",
      description:
        "All staff must complete the security awareness module before the end of the quarter. Sessions run twice weekly.",
      body: `As part of our compliance obligations, every employee must complete the annual security awareness training.

The module covers:
• Phishing and social engineering
• Password and credential hygiene
• Device security and remote work
• Reporting a suspected incident

Live sessions run twice a week and are recorded. The online self-paced version is available for those who cannot attend a live session. Completion is tracked and reported to department heads.`,
      authorId: "emp-1001",
      priority: "urgent",
      status: "published",
      publishedAt: toISODateTime(shiftDays(today, -16)),
      expiresAt: toISODateTime(shiftDays(today, 5)),
      readBy: ["emp-1001", "emp-1003", "emp-1007", "emp-1010"],
    },
    {
      id: "ann-4005",
      title: "Q4 town hall — save the date",
      description:
        "Company-wide town hall next month in the main hall, with a live stream for remote staff. Agenda to follow.",
      body: `Our quarterly town hall is scheduled for next month in the main hall.

Agenda items:
• Business performance review for the quarter
• Product roadmap preview
• Customer spotlight
• Open Q&A

The session will be streamed live for staff working remotely. Submit questions in advance through the HR portal or ask them on the day.`,
      authorId: "emp-1001",
      priority: "low",
      status: "published",
      publishedAt: toISODateTime(shiftDays(today, -22)),
      expiresAt: toISODateTime(shiftDays(today, 30)),
      readBy: [],
    },
    {
      id: "ann-4006",
      title: "Parking slot reallocation",
      description: "Draft notice on the new basement parking allocation. Not yet published.",
      body: `Following the basement expansion, parking slots will be reallocated from the start of next month. This draft covers the allocation logic, the new zone map and the process for requesting reserved slots for staff with mobility needs.`,
      authorId: "emp-1001",
      priority: "normal",
      status: "draft",
      publishedAt: toISODateTime(today),
      expiresAt: null,
      readBy: [],
    },
    {
      id: "ann-4007",
      title: "WFH policy refresh (expired)",
      description: "Archived notice about the updated work-from-home allowance.",
      body: "This notice has expired and has been archived. See the employee handbook for the current work-from-home policy and allowance rates.",
      authorId: "emp-1004",
      priority: "low",
      status: "archived",
      publishedAt: toISODateTime(shiftDays(today, -75)),
      expiresAt: toISODateTime(shiftDays(today, -45)),
      readBy: [
        "emp-1001", "emp-1002", "emp-1003", "emp-1004", "emp-1005",
        "emp-1006", "emp-1007", "emp-1008", "emp-1009", "emp-1010",
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Loader                                                                      */
/* -------------------------------------------------------------------------- */

/** Inserts rows in chunks so a large seed does not blow the parameter limit. */
async function insertAll(client, table, columns, rows, chunkSize = 500) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row) => {
      const marks = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${marks.join(", ")})`;
    });

    await client.query(
      `insert into ${table} (${columns.join(", ")}) values ${placeholders.join(", ")}`,
      values,
    );
  }
  return rows.length;
}

/**
 * Points each sequence past the ids this seed inserted explicitly, so the next
 * application insert continues the series instead of colliding with it.
 *
 * Ids carry a prefix (`emp-1001`, `att-emp-1002-2026-01-01`), so the number is
 * extracted with a regex rather than a split.
 */
async function resyncSequences(client) {
  const tables = [
    "departments",
    "employees",
    "attendance_records",
    "tasks",
    "salary_records",
    "leave_requests",
    "announcements",
    "salary_component_templates",
  ];

  for (const table of tables) {
    const { rows } = await client.query(
      `select coalesce(max(nullif(regexp_replace(id, '^[^0-9]+([0-9]+).*$', '\\1'), '')::bigint), 0) as max_id
         from ${table}`,
    );
    await client.query("select setval($1, $2, true)", [`${table}_id_seq`, rows[0].max_id]);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set.\nCopy .env.example to .env and fill in your PostgreSQL connection string.",
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log("Clearing existing data...");
    // Order does not matter with CASCADE, but listing every table makes an
    // omission obvious if one is added later.
    await client.query(`
      truncate table
        announcement_reads,
        announcements,
        leave_requests,
        salary_records,
        attendance_records,
        tasks,
        sessions,
        user_credentials,
        employees,
        departments,
        salary_component_templates,
        company_settings
      restart identity cascade
    `);

    console.log("Seeding departments...");
    await insertAll(
      client,
      "departments",
      ["name"],
      departments.map((name) => ({ name })),
    );
    const { rows: deptRows } = await client.query("select id, name from departments");
    const deptId = new Map(deptRows.map((row) => [row.name, row.id]));

    console.log("Seeding employees...");
    await insertAll(
      client,
      "employees",
      ["id", "employee_code", "full_name", "username", "email", "phone", "address",
       "department_id", "position", "joining_date", "role", "status", "basic_salary"],
      employees.map((emp) => ({
        id: emp.id,
        employee_code: emp.id.toUpperCase(),
        full_name: emp.fullName,
        username: emp.username,
        email: emp.email,
        phone: emp.phone,
        address: emp.address,
        department_id: deptId.get(emp.department),
        position: emp.position,
        joining_date: emp.joiningDate,
        role: emp.role,
        status: emp.status ?? "active",
        basic_salary: emp.basicSalary,
      })),
    );

    console.log("Hashing demo passwords (bcrypt)...");
    const [adminHash, employeeHash] = await Promise.all([
      bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS),
      bcrypt.hash(EMPLOYEE_PASSWORD, BCRYPT_ROUNDS),
    ]);
    // Every seeded account gets a credential row so any of them can be used to
    // sign in and verify that each person sees only their own records. The admin
    // keeps its own password; everyone else shares the employee one.
    await insertAll(
      client,
      "user_credentials",
      ["employee_id", "password_hash"],
      employees
        .filter((emp) => emp.status !== "inactive")
        .map((emp) => ({
          employee_id: emp.id,
          password_hash: emp.id === "emp-1001" ? adminHash : employeeHash,
        })),
    );

    console.log("Seeding company settings...");
    await insertAll(
      client,
      "company_settings",
      ["key", "value", "label"],
      [
        { key: "leave_allocation_days", value: JSON.stringify(20), label: "Annual leave allocation (days)" },
        // `value` is jsonb, so every entry is sent as JSON text. A bare "09:00"
        // is not valid JSON, hence the explicit stringification.
        { key: "workday_start", value: JSON.stringify("09:00"), label: "Standard workday start" },
        { key: "late_threshold_minutes", value: JSON.stringify(15), label: "Late arrival threshold (minutes)" },
        { key: "standard_working_hours", value: JSON.stringify(8), label: "Standard working hours per day" },
      ],
    );

    console.log("Seeding salary component templates...");
    const allowanceTemplates = [
      ["Household Allowance", 6000],
      ["Transport Allowance", 2500],
      ["Medical Allowance", 2000],
      ["Internet Allowance", 1500],
    ];
    const deductionTemplates = [
      ["Provident Fund (10%)", 4000],
      ["TDS", 1500],
      ["Absence Deduction", 1200],
      ["Provident Library Fund", 500],
    ];
    await insertAll(
      client,
      "salary_component_templates",
      ["kind", "label", "amount", "sort_order"],
      [
        ...allowanceTemplates.map(([label, amount], i) => ({ kind: "allowance", label, amount, sort_order: i })),
        ...deductionTemplates.map(([label, amount], i) => ({ kind: "deduction", label, amount, sort_order: i })),
      ],
    );

    console.log("Seeding tasks...");
    const tasks = buildTasks();
    await insertAll(
      client,
      "tasks",
      ["id", "title", "description", "assigned_to_id", "assigned_by_id", "start_date",
       "due_date", "priority", "status", "completed_at", "created_at"],
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assigned_to_id: t.assignedToId,
        assigned_by_id: t.assignedById,
        start_date: t.startDate,
        due_date: t.dueDate,
        priority: t.priority,
        status: t.status,
        completed_at: t.completedAt,
        created_at: t.createdAt,
      })),
    );

    console.log("Seeding attendance...");
    const attendance = buildAttendance();
    await insertAll(
      client,
      "attendance_records",
      ["id", "employee_id", "work_date", "status", "check_in", "check_out", "working_hours", "remarks"],
      attendance.map((row) => ({
        id: row.id,
        employee_id: row.employeeId,
        work_date: row.workDate,
        status: row.status,
        check_in: row.checkIn,
        check_out: row.checkOut,
        working_hours: row.workingHours,
        remarks: row.remarks,
      })),
    );

    console.log("Seeding payroll...");
    const salaries = buildSalaries();
    await insertAll(
      client,
      "salary_records",
      ["employee_id", "month", "basic_salary", "allowances", "bonus", "deductions",
       "net_salary", "payment_status", "paid_at", "remarks"],
      salaries.map((row) => ({
        employee_id: row.employeeId,
        month: row.month,
        basic_salary: row.basicSalary,
        allowances: row.allowances,
        bonus: row.bonus,
        deductions: row.deductions,
        net_salary: row.netSalary,
        payment_status: row.paymentStatus,
        paid_at: row.paidAt,
        remarks: row.remarks,
      })),
    );

    console.log("Seeding leave requests...");
    const leaves = buildLeaveRequests();
    await insertAll(
      client,
      "leave_requests",
      ["id", "employee_id", "leave_type", "start_date", "end_date", "total_days",
       "reason", "applied_at", "status", "admin_comment", "reviewed_by_id", "reviewed_at"],
      leaves.map((row) => ({
        id: row.id,
        employee_id: row.employeeId,
        leave_type: row.leaveType,
        start_date: row.startDate,
        end_date: row.endDate,
        total_days: row.totalDays,
        reason: row.reason,
        applied_at: row.appliedAt,
        status: row.status,
        admin_comment: row.adminComment,
        reviewed_by_id: row.reviewedById,
        reviewed_at: row.reviewedAt,
      })),
    );

    console.log("Seeding announcements...");
    const announcements = buildAnnouncements();
    await insertAll(
      client,
      "announcements",
      ["id", "title", "description", "body", "author_id", "priority", "status",
       "published_at", "expires_at"],
      announcements.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        body: row.body,
        author_id: row.authorId,
        priority: row.priority,
        status: row.status,
        published_at: row.publishedAt,
        expires_at: row.expiresAt,
      })),
    );
    await insertAll(
      client,
      "announcement_reads",
      ["announcement_id", "employee_id"],
      announcements.flatMap((a) => a.readBy.map((employeeId) => ({
        announcement_id: a.id,
        employee_id: employeeId,
      }))),
    );

    await resyncSequences(client);

    console.log("\nSeed complete:");
    console.log(`  departments          ${departments.length}`);
    console.log(`  employees            ${employees.length}`);
    console.log(`  tasks                ${tasks.length}`);
    console.log(`  attendance records   ${attendance.length}`);
    console.log(`  salary records       ${salaries.length}`);
    console.log(`  leave requests       ${leaves.length}`);
    console.log(`  announcements        ${announcements.length}`);
    console.log("\nDemo sign-in accounts:");
    for (const emp of employees.filter((e) => e.status !== "inactive")) {
      const password = emp.id === "emp-1001" ? ADMIN_PASSWORD : EMPLOYEE_PASSWORD;
      const role = emp.role === "admin" ? "administrator" : "employee";
      console.log(`  ${emp.username.padEnd(18)} / ${password.padEnd(14)} (${emp.fullName} — ${role})`);
    }
    console.log(`\n  ${employees.filter((e) => e.status === "inactive").length} account(s) are seeded inactive and cannot sign in.`);
    console.log("These are development-only passwords. Change them before deploying.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\ndb:seed failed — ${error.message}\n`);
  process.exitCode = 1;
});