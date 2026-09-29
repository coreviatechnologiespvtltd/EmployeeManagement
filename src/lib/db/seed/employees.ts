import type { Employee } from "@/types/employee";

/**
 * Demo credentials. In production these records are replaced by a real
 * identity provider and password hashes never live in application data.
 */
export interface StoredUser {
  userId: string;
  username: string;
  password: string;
  employee: Employee;
}

const base: Omit<Employee, "id" | "employeeCode" | "fullName" | "username" | "email"> = {
  phone: "",
  address: "",
  department: "Engineering",
  position: "Software Engineer",
  joiningDate: "2023-04-11",
  role: "employee",
  status: "active",
  basicSalary: 40000,
};

function employee(partial: Partial<Employee> & Pick<Employee, "id" | "fullName" | "username" | "email">): Employee {
  return { ...base, ...partial, employeeCode: partial.id.toUpperCase() };
}

export const seedEmployees: Employee[] = [
  employee({
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
  }),
  employee({
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
  }),
  employee({
    id: "emp-1003",
    fullName: "Bikash Thapa",
    username: "bikash.thapa",
    email: "bikash.thapa@corevia.com",
    phone: "+977 9803 456789",
    department: "Engineering",
    position: "Software Engineer",
    joiningDate: "2022-11-02",
    role: "employee",
    basicSalary: 34000,
  }),
  employee({
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
  }),
  employee({
    id: "emp-1005",
    fullName: "Rajesh Maharjan",
    username: "rajesh.maharjan",
    email: "rajesh.maharjan@corevia.com",
    phone: "+977 9765 443322",
    department: "Finance",
    position: "Accountant",
    joiningDate: "2020-09-14",
    role: "employee",
    basicSalary: 36000,
  }),
  employee({
    id: "emp-1006",
    fullName: "Pratiksha Karki",
    username: "pratiksha.karki",
    email: "pratiksha.karki@corevia.com",
    phone: "+977 9811 778899",
    department: "Sales",
    position: "Sales Executive",
    joiningDate: "2023-01-09",
    role: "employee",
    basicSalary: 28000,
  }),
  employee({
    id: "emp-1007",
    fullName: "Anil Bhattarai",
    username: "anil.bhattarai",
    email: "anil.bhattarai@corevia.com",
    phone: "+977 9800 991122",
    department: "Quality Assurance",
    position: "QA Engineer",
    joiningDate: "2021-08-30",
    role: "employee",
    basicSalary: 33000,
  }),
  employee({
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
  }),
  employee({
    id: "emp-1009",
    fullName: "Sanjay Tamang",
    username: "sanjay.tamang",
    email: "sanjay.tamang@corevia.com",
    phone: "+977 9855 334455",
    department: "Customer Support",
    position: "Support Agent",
    joiningDate: "2023-05-08",
    role: "employee",
    basicSalary: 25000,
  }),
  employee({
    id: "emp-1010",
    fullName: "Deepika Neupane",
    username: "deepika.neupane",
    email: "deepika.neupane@corevia.com",
    phone: "+977 9822 110099",
    department: "Engineering",
    position: "Team Lead",
    joiningDate: "2018-12-03",
    role: "employee",
    basicSalary: 62000,
  }),
  employee({
    id: "emp-1011",
    fullName: "Kiran Pokhrel",
    username: "kiran.pokhrel",
    email: "kiran.pokhrel@corevia.com",
    phone: "+977 9700 556677",
    department: "Engineering",
    position: "Software Engineer",
    joiningDate: "2024-01-22",
    role: "employee",
    status: "inactive",
    basicSalary: 31000,
  }),
];

export const seedUsers: StoredUser[] = [
  { userId: "emp-1001", username: "admin", password: "Admin@123", employee: seedEmployees[0]! },
  { userId: "emp-1002", username: "employee", password: "Employee@123", employee: seedEmployees[1]! },
];
