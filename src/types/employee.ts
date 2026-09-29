import type { Role } from "./auth";

export type EmployeeStatus = "active" | "inactive";

export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  position: string;
  joiningDate: string;
  role: Role;
  status: EmployeeStatus;
  avatarUrl?: string;
  basicSalary: number;
}

export interface EmployeeSummary {
  id: string;
  fullName: string;
  username: string;
  email: string;
  department: string;
  position: string;
  joiningDate: string;
  status: EmployeeStatus;
  role: Role;
  avatarUrl?: string;
}
