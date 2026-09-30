"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { FormErrorMessage } from "@/components/forms/FormActions";

// No credentials live in this file. The form authenticates against the
// bcrypt hashes in PostgreSQL, so shipping an account list to the browser would
// hand out working passwords. Demo credentials are printed by `npm run db:seed`
// and documented in the README instead.

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" isLoading={pending} loadingText="Signing in…">
      {pending ? "Signing in…" : "Login"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  const usernameError = state.fieldErrors?.username?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorMessage message={state.error} />

      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium text-ink-700">
          Username
        </label>
        <div className="relative">
          <User aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-ink-400" />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            autoFocus
            placeholder="Enter your username"
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={usernameError ? "username-error" : undefined}
            className={`h-11 w-full rounded-lg border bg-white pr-3 pl-11 text-sm text-ink-900 transition-colors duration-150 placeholder:text-ink-400 hover:border-ink-300 focus:ring-2 focus:outline-none ${
              usernameError
                ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
                : "border-ink-200 focus:border-brand-500 focus:ring-brand-500/20"
            }`}
          />
        </div>
        {usernameError && (
          <p id="username-error" role="alert" className="text-xs text-danger-600">
            {usernameError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink-700">
          Password
        </label>
        <div className="relative">
          <Lock aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-ink-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-error" : undefined}
            className={`h-11 w-full rounded-lg border bg-white pr-11 pl-11 text-sm text-ink-900 transition-colors duration-150 placeholder:text-ink-400 hover:border-ink-300 focus:ring-2 focus:outline-none ${
              passwordError
                ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
                : "border-ink-200 focus:border-brand-500 focus:ring-brand-500/20"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-400 transition-colors duration-150 hover:text-ink-700"
          >
            {showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" role="alert" className="text-xs text-danger-600">
            {passwordError}
          </p>
        )}
      </div>

      <LoginSubmitButton />
    </form>
  );
}

export { Loader2 };
