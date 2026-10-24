
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/atoms/Logo";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

interface AuthTemplateProps {
  mode: AuthMode;
  nextPath?: "/checkout";
}

export function AuthTemplate({
  mode,
  nextPath,
}: AuthTemplateProps) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">(
    "success",
  );

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const otherAuthHref = isSignUp
    ? nextPath
      ? `/sign-in?next=${encodeURIComponent(nextPath)}`
      : "/sign-in"
    : nextPath
      ? `/sign-up?next=${encodeURIComponent(nextPath)}`
      : "/sign-up";

  function showError(text: string) {
    setMessageType("error");
    setMessage(text);
  }

  function showSuccess(text: string) {
    setMessageType("success");
    setMessage(text);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setMessage("");

    if (isSignUp && password !== confirmPassword) {
      showError("Passwords do not match. Please check again.");
      return;
    }

    if (password.length < 8) {
      showError("Your password must contain at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${
              window.location.origin
            }/auth/callback?next=${encodeURIComponent(
              nextPath ?? "/",
            )}`,
          },
        });

        if (error) {
          showError(error.message);
          return;
        }

        setPassword("");
        setConfirmPassword("");

        if (data.session) {
          router.replace(nextPath ?? "/");
          router.refresh();
          return;
        }

        showSuccess(
          "Your account request was received. Check your email for the confirmation link before signing in.",
        );

        return;
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        showError(
          "Unable to sign in. Check your email and password, then try again.",
        );
        return;
      }

      const isAdmin =
        data.user?.app_metadata?.role === "admin";

      router.replace(
        isAdmin ? "/admin" : nextPath ?? "/",
      );

      router.refresh();
    } catch (error) {
      console.error("Supabase authentication failed:", error);

      showError(
        "We could not connect to authentication. Check your connection and Supabase configuration, then try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (isSendingReset) return;

    setMessage("");

    if (!email.trim()) {
      showError(
        "Enter your email address first, then choose Forgot password.",
      );
      return;
    }

    setIsSendingReset(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${
              window.location.origin
            }/auth/callback?next=${encodeURIComponent(
              "/reset-password",
            )}`,
          },
        );

      if (error) {
        showError(
          "Unable to send the reset email. Please try again.",
        );
        return;
      }

      showSuccess(
        "If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.",
      );
    } catch (error) {
      console.error("Password reset request failed:", error);

      showError(
        "We could not send the reset request. Please try again.",
      );
    } finally {
      setIsSendingReset(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-[#E4D9CE] bg-white px-4 text-sm text-[#3B2418] outline-none transition-colors placeholder:text-stone-400 focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10";

  const passwordInputClass = `${inputClass} pr-16`;

  return (
    <main className="min-h-screen bg-[#FBF8F4] lg:grid lg:grid-cols-2">
      {/* Left panel: authentication form */}
      <section className="flex min-h-screen flex-col px-6 py-4 sm:px-10 sm:py-5 lg:px-12 lg:py-4 xl:px-20">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Logo />

          <Link
            href="/shop"
            className="shrink-0 text-xs font-medium text-stone-500 transition-colors hover:text-[#3B2418]"
          >
            Back to shop{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </header>

        {/* Main content */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-4 sm:py-5 lg:py-0">
          {/* Introduction */}
          <div className={isSignUp ? "mb-5" : "mb-7"}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
              {isSignUp
                ? "Join our community"
                : "Welcome back"}
            </p>

            <h1
              className={`mt-3 font-serif leading-tight tracking-tight text-[#3B2418] ${
                isSignUp
                  ? "text-4xl sm:text-[42px]"
                  : "text-4xl sm:text-5xl"
              }`}
            >
              {isSignUp ? (
                <>
                  Create your
                  <br />
                  <span className="italic">
                    coffee account.
                  </span>
                </>
              ) : (
                <>
                  Your coffee
                  <br />
                  <span className="italic">
                    ritual awaits.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {isSignUp
                ? "Create an account to make every coffee moment yours."
                : "Sign in to continue your BaristaBar experience."}
            </p>
          </div>

          {/* Authentication form */}
          <form
            onSubmit={handleSubmit}
            className={isSignUp ? "space-y-3" : "space-y-4"}
          >
            {/* Full name */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-medium text-[#3B2418]"
                >
                  Full name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  required
                  className={inputClass}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[#3B2418]"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#3B2418]"
                >
                  Password
                </label>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    className="text-xs text-[#8A6B55] transition-colors hover:text-[#3B2418] disabled:opacity-60"
                  >
                    {isSendingReset
                      ? "Sending link..."
                      : "Forgot password?"}
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isSignUp
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder={
                    isSignUp
                      ? "Create a password"
                      : "Enter your password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className={passwordInputClass}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((visible) => !visible)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute inset-y-0 right-3 text-xs font-medium text-[#8A6B55] transition-colors hover:text-[#3B2418]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {isSignUp && (
                <p className="mt-1 text-xs text-stone-500">
                  Use at least 8 characters.
                </p>
              )}
            </div>

            {/* Confirm password */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-[#3B2418]"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className={passwordInputClass}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (visible) => !visible,
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute inset-y-0 right-3 text-xs font-medium text-[#8A6B55] transition-colors hover:text-[#3B2418]"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {message && (
              <p
                role={
                  messageType === "error"
                    ? "alert"
                    : "status"
                }
                aria-live="polite"
                className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
                  messageType === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-[#E4D9CE] bg-[#F3EAE0] text-[#604331]"
                }`}
              >
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-center gap-3 rounded-full bg-[#3B2418] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#604331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting
                ? "Please wait..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}

              <span aria-hidden="true">→</span>
            </button>
          </form>

          {/* Switch between sign in and sign up */}
          <p className="mt-4 text-center text-sm text-stone-600">
            {isSignUp
              ? "Already have an account?"
              : "New to BaristaBar?"}{" "}

            <Link
              href={otherAuthHref}
              className="font-semibold text-[#3B2418] underline decoration-[#8A6B55]/50 underline-offset-4 transition-colors hover:text-[#8A6B55]"
            >
              {isSignUp
                ? "Sign in"
                : "Create an account"}
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-stone-400">
            Good coffee. Better moments.
          </p>
        </div>
      </section>

      {/* Right panel: coffee image */}
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#251811] lg:block">
        <Image
          src="/hero-coffee.jpeg"
          alt="Coffee beans and a warm coffee preparation scene"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-linear-to-t from-[#1C100C]/90 via-[#1C100C]/30 to-[#1C100C]/10" />

        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E1C5AD]">
            The BaristaBar experience
          </p>

          <h2 className="mt-5 max-w-xl font-serif text-5xl leading-tight text-[#FBF8F4] xl:text-6xl">
            Discover your coffee.
            <br />
            <span className="italic">
              Brew your experience.
            </span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-7 text-[#E5D8CE]">
            From carefully selected beans to your favourite
            brewing ritual, discover the little details that make
            every cup special.
          </p>

          <div className="mt-8 h-px w-16 bg-[#D6BDA7]" />

          <p className="mt-4 text-xs tracking-[0.12em] text-[#E5D8CE]">
            CAREFULLY SELECTED · MADE TO BE SAVOURED
          </p>
        </div>
      </aside>
    </main>
  );
}
