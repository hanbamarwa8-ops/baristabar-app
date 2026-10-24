
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/atoms/Logo";
import { createClient } from "@/lib/supabase/client";

type PageState = "checking" | "ready" | "invalid" | "updating";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);

    // Retenir les paramètres avant que le client traite le lien.
    const hasRecoveryParams =
    url.searchParams.has("recovery") ||
    url.searchParams.has("code") ||
    url.hash.includes("type=recovery");

    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setPageState("ready");
      }
    });

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (!error && data.session && hasRecoveryParams) {
        setPageState("ready");
      } else {
        setPageState("invalid");
      }
    }

    void checkRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pageState !== "ready") return;

    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setPageState("updating");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(
          error.message ||
            "Unable to update your password. Please request a new reset link.",
        );
        setPageState("ready");
        return;
      }

      // Require a fresh sign-in with the new password.
      await supabase.auth.signOut();

      router.replace("/sign-in?passwordUpdated=1");
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setPageState("ready");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-4 py-12 text-[#3B2418]">
      <section className="w-full max-w-md rounded-2xl border border-[#E4D9CE] bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {pageState === "checking" ? (
          <div className="py-6 text-center">
            <h1 className="text-2xl font-semibold">Verifying your link</h1>
            <p className="mt-3 text-sm text-[#806F63]">
              Please wait while we verify your password reset link.
            </p>
          </div>
        ) : pageState === "invalid" ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Reset link unavailable</h1>

            <p className="mt-3 text-sm leading-6 text-[#806F63]">
              This link may have expired or already been used. Request a
              new password reset email to continue.
            </p>

            <Link
              href="/forgot-password"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#684733]"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                Create a new password
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#806F63]">
                Choose a new password for your BaristaBar account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  New password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-[#D8CABC] bg-[#FDFBF8] px-4 py-3 text-sm outline-none transition focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm new password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Enter your new password again"
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
                disabled={pageState === "updating"}
                className="w-full rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pageState === "updating"
                  ? "Updating password..."
                  : "Update password"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
