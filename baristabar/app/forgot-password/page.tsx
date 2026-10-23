
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/atoms/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) {
        setErrorMessage(
          "Unable to send the reset email. Please try again.",
        );
        return;
      }

      setSent(true);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-4 py-12 text-[#3B2418]">
      <section className="w-full max-w-md rounded-2xl border border-[#E4D9CE] bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {!sent ? (
          <>
            <div className="mb-7 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                Forgot password?
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#806F63]">
                Enter your email address and we will send you a link
                to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[#D8CABC] bg-[#FDFBF8] px-4 py-3 text-sm outline-none transition focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/15"
                />
              </div>

              {errorMessage && (
                <p role="alert" className="text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8DED4]">
              <span className="text-2xl" aria-hidden="true">✉</span>
            </div>

            <h1 className="text-2xl font-semibold">Check your email</h1>

            <p className="mt-3 text-sm leading-6 text-[#806F63]">
              If an account matches this email address, a password
              reset link will be sent. Check your inbox and spam folder.
            </p>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 text-sm font-medium text-[#8A6B55] hover:underline"
            >
              Try another email
            </button>
          </div>
        )}

        <p className="mt-7 text-center text-sm text-[#806F63]">
          Remember your password?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-[#3B2418] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
