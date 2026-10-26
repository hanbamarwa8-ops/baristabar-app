"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          "Sign-in failed. Check your email and password, and confirm that your account is enabled.",
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage(
        "Unable to connect to authentication. Check the Supabase settings in .env.local.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="admin-email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          placeholder="admin@example.com"
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          placeholder="Enter your password"
        />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-xs leading-5 text-muted-foreground">
        Access is restricted to the administrator email configured for this app.
        There is no public administrator sign-up.
      </p>
    </form>
  );
}
