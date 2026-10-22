import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border bg-background p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          BaristaBar Admin
        </p>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Access denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This account is not authorized to access the administration workspace.
          Please sign in with the authorized administrator account.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
