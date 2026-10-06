import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/service";
import { ROLE_HOME } from "@/lib/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME, APP_SYSTEM_NAME } from "@/lib/constants";
import { CompanyLogo } from "@/components/layout/CompanyLogo";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-50),transparent)]"
      />

      <main className="relative w-full max-w-[26rem]">
        <div className="text-center">
          <CompanyLogo size="lg" priority className="mx-auto" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-ink-900 uppercase">{APP_NAME}</p>
          <p className="mt-1 text-xs text-ink-500">{APP_SYSTEM_NAME}</p>
        </div>

        <div className="mt-7 rounded-card border border-ink-100 bg-white p-6 shadow-card sm:p-7">
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-ink-900">Welcome Back</h1>
            <p className="mt-1 text-sm text-ink-500">Sign in to continue to your account</p>
          </div>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          &copy; {new Date().getFullYear()} {APP_NAME}. Internal use only.
        </p>
      </main>
    </div>
  );
}
