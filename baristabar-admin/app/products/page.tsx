import { AdminHeader } from "@/components/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";
import { ProductsManager } from "./ProductsManager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-muted/30">
      <AdminHeader />
      <section className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              BaristaBar / Administration / Catalogue
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Gestion des produits
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ajoute des produits, modifie leurs informations et leurs prix,
              ajuste le stock et désactive temporairement les produits qui ne
              doivent pas apparaître dans la boutique.
            </p>
          </div>
          <AdminSignOutButton />
        </div>

        <ProductsManager />
      </section>
    </main>
  );
}
