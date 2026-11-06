import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";

import { CategoriesManager } from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  // Protect the page: only authenticated administrators
  // can access category management.
  await requireAdmin();

  return (
    <main className="min-h-screen bg-muted/30">
      <AdminHeader />

      <section className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              BaristaBar / Administration / Catalogue / Catégories
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Gestion des catégories
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Organise le catalogue BaristaBar en gérant les catégories
              de produits. Ajoute de nouvelles catégories, modifie leurs
              informations et contrôle leur visibilité dans la boutique.
            </p>
          </div>

          <AdminSignOutButton />
        </div>

        {/* Category management interface */}
        <CategoriesManager />
      </section>
    </main>
  );
}
