export type Role = "employee" | "admin";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
