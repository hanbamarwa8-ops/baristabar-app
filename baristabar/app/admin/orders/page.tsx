import Link from "next/link";

import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { OrdersManager } from "./OrdersManager";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-muted/30">
      <AdminHeader />

      <section className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              BaristaBar / Administration
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Gestion des commandes
            </h1>

            <p className="mt-2 text-muted-foreground">
              Consulte les commandes enregistrées, les coordonnées de livraison
              et les détails des articles.
            </p>
          </div>

          <AdminSignOutButton />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            ← Retour au dashboard
          </Link>

          <Link
            href="/admin/products"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Gestion des produits
          </Link>
        </div>

        <OrdersManager />
      </section>
    </main>
  );
}