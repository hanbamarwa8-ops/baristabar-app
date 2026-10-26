
import Link from "next/link";

import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";
import { findActiveProducts } from "@/lib/products-repository";

export const dynamic = "force-dynamic";

const formatPrice = (price: number | string) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(price));

export default async function Home() {
  await requireAdmin();

  let products: Awaited<ReturnType<typeof findActiveProducts>> = [];
  let error: string | null = null;

  try {
    products = await findActiveProducts();
  } catch (cause) {
    console.error("Unable to load admin dashboard products:", cause);
    error = "Impossible de charger le catalogue depuis la base de données.";
  }

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0,
  );

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
              Dashboard
            </h1>

            <p className="mt-2 text-muted-foreground">
              Vue d’ensemble de ton catalogue.
            </p>
          </div>

          <AdminSignOutButton />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Gestion du catalogue</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Ajoute des produits, mets à jour les prix et les stocks, ou
              désactive un produit.
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Gérer les produits →
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Erreur de connexion</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              Produits actifs récupérés
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {products.length}
            </p>
          </div>

          <div className="rounded-xl border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              Stock total disponible
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {totalStock}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">
              Catalogue des produits
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Aperçu des produits actifs récupérés depuis la base de données.
            </p>
          </div>

          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Produit</th>
                    <th className="px-5 py-3 font-medium">Catégorie</th>
                    <th className="px-5 py-3 font-medium">Prix</th>
                    <th className="px-5 py-3 font-medium">Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-5 py-4">
                        <p className="font-medium">{product.name}</p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.slug}
                        </p>
                      </td>

                      <td className="px-5 py-4">{product.category}</td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium">
                        {formatPrice(product.price)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            product.stock === 0
                              ? "font-medium text-red-600"
                              : "font-medium"
                          }
                        >
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !error ? (
            <p className="p-6 text-sm text-muted-foreground">
              Aucun produit actif trouvé dans le catalogue.
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
