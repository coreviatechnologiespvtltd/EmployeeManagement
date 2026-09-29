import type { Announcement } from "@/types/announcement";
import { shiftDays, toISODateTime, todayDate } from "./date-utils";

const today = todayDate();
const admin = "Aarav Shrestha";
const hr = "Nisha Gurung";

export const seedAnnouncements: Announcement[] = [
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
    authorName: admin,
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
    authorName: hr,
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
    authorName: hr,
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
    authorName: admin,
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
    authorName: admin,
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
    authorName: admin,
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
    authorName: hr,
    priority: "low",
    status: "archived",
    publishedAt: toISODateTime(shiftDays(today, -75)),
    expiresAt: toISODateTime(shiftDays(today, -45)),
    readBy: ["emp-1001", "emp-1002", "emp-1003", "emp-1004", "emp-1005", "emp-1006", "emp-1007", "emp-1008", "emp-1009", "emp-1010"],
  },
];
