import Link from "next/link";
import { FileQuestion, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/service";
import { ROLE_HOME } from "@/lib/navigation";

export default async function NotFound() {
  const user = await getCurrentUser();
  const homeHref = user ? ROLE_HOME[user.role] : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <main className="w-full max-w-md rounded-card border border-ink-100 bg-white p-7 text-center shadow-card">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Compass aria-hidden className="h-6 w-6" />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-widest text-ink-400 uppercase">Error 404</p>
        <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          The record or page you are looking for may have been removed or you may not have access to it.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href={homeHref}>
            <Button variant="primary">
              <FileQuestion aria-hidden className="h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
