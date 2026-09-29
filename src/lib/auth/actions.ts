"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, login as loginService, logout as logoutService } from "./service";
import { loginSchema } from "@/lib/validations/auth";
import type { Role } from "@/types/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await loginService(parsed.data.username, parsed.data.password);
  if (!result.success) return { error: result.error ?? "Unable to sign in." };
  if (result.user) redirect(result.user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard");

  // `redirect` throws, so this line is unreachable in practice.
  return { error: "Unable to determine your dashboard." };
}

export async function logoutAction(): Promise<void> {
  await logoutService();
  redirect("/login");
}

/**
 * Shared guard for Server Actions. Every mutation calls this first so that a
 * stale page cannot trigger a write even if proxy coverage was missed.
 */
export async function requireActionRole(...allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (allowed.length > 0 && !allowed.includes(user.role)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return user;
}

export async function revalidateDashboard(): Promise<void> {
  revalidatePath("/", "layout");
}
