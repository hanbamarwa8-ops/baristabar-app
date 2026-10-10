import { AdminHeader } from "@/components/organisms/AdminHeader/AdminHeader";

export default function Home() {
  return (
    <main className="min-h-screen">
      <AdminHeader />

      <section className="p-8">
        <h1 className="text-3xl font-semibold">
          Dashboard
        </h1>

        <p className="mt-2 text-muted-foreground">
          Welcome to BaristaBar Admin.
        </p>
      </section>
    </main>
  );
}