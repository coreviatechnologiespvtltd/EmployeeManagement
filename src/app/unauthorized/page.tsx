import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/service";
import { ROLE_HOME } from "@/lib/navigation";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Access denied",
};

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const homeHref = user ? ROLE_HOME[user.role] : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <main className="w-full max-w-md rounded-card border border-ink-100 bg-white p-7 text-center shadow-card">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-600">
          <ShieldAlert aria-hidden className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Your account does not have permission to view this page. If you believe this is a mistake, contact your
          administrator.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href={homeHref}>
            <Button variant="primary">Back to dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign in as someone else</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
