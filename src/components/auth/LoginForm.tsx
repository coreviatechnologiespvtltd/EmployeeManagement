"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, User } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormErrorMessage } from "@/components/forms/FormActions";

// No credentials live in this file. The form authenticates against the
// bcrypt hashes in PostgreSQL, so shipping an account list to the browser would
// hand out working passwords. Demo credentials are printed by `npm run db:seed`
// and documented in the README instead.

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" isLoading={pending} loadingText="Signing in…">
      {pending ? "Signing in…" : "Login"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  const usernameError = state.fieldErrors?.username?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorMessage message={state.error} />

      <Input
        id="username"
        name="username"
        label="Username"
        type="text"
        autoComplete="username"
        required
        autoFocus
        placeholder="Enter your username"
        leadingIcon={<User aria-hidden className="h-4 w-4" />}
        error={usernameError}
      />

      <PasswordInput
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        placeholder="Enter your password"
        leadingIcon={<Lock aria-hidden className="h-4 w-4" />}
        error={passwordError}
      />

      <LoginSubmitButton />
    </form>
  );
}
