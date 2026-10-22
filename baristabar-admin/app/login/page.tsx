import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in | BaristaBar",
  description: "Sign in to the BaristaBar administration workspace.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            BaristaBar
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Administration
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your authorized administrator account.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}