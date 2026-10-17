"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/atoms/Logo";

type AuthMode = "sign-in" | "sign-up";

interface AuthTemplateProps {
  mode: AuthMode;
}

export function AuthTemplate({ mode }: AuthTemplateProps) {
  const isSignUp = mode === "sign-up";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isSignUp && password !== confirmPassword) {
      setMessage("Passwords do not match. Please check again.");
      return;
    }

    setMessage(
      "Your form is ready. Account authentication will be connected in the next development step."
    );
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
            Back to shop <span aria-hidden="true">→</span>
          </Link>
        </header>

        {/* Vertically centered content */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-4 sm:py-5 lg:py-0">
          {/* Introduction */}
          <div className={isSignUp ? "mb-5" : "mb-7"}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
              {isSignUp ? "Join our community" : "Welcome back"}
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
                  <span className="italic">coffee account.</span>
                </>
              ) : (
                <>
                  Your coffee
                  <br />
                  <span className="italic">ritual awaits.</span>
                </>
              )}
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {isSignUp
                ? "Create an account to make every coffee moment yours."
                : "Sign in to continue your BaristaBar experience."}
            </p>
          </div>

          {/* Form */}
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
                    onClick={() =>
                      setMessage(
                        "Password reset will be available when authentication is connected."
                      )
                    }
                    className="text-xs text-[#8A6B55] transition-colors hover:text-[#3B2418]"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isSignUp ? "new-password" : "current-password"
                  }
                  placeholder={
                    isSignUp ? "Create a password" : "Enter your password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={passwordInputClass}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
                    type={showConfirmPassword ? "text" : "password"}
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
                      setShowConfirmPassword((visible) => !visible)
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
                role="status"
                aria-live="polite"
                className="rounded-lg border border-[#E4D9CE] bg-[#F3EAE0] px-4 py-3 text-sm leading-6 text-[#604331]"
              >
                {message}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-3 rounded-full bg-[#3B2418] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#604331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
            >
              {isSignUp ? "Create account" : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {/* Link to the other authentication page */}
          <p className="mt-4 text-center text-sm text-stone-600">
            {isSignUp ? "Already have an account?" : "New to BaristaBar?"}{" "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-semibold text-[#3B2418] underline decoration-[#8A6B55]/50 underline-offset-4 transition-colors hover:text-[#8A6B55]"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-stone-400">
            Good coffee. Better moments.
          </p>
        </div>
      </section>

      {/* Right panel: editorial coffee image */}
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
            <span className="italic">Brew your experience.</span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-7 text-[#E5D8CE]">
            From carefully selected beans to your favourite brewing ritual,
            discover the little details that make every cup special.
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