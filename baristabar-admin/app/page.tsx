import Link from "next/link";
import { AdminHeader } from "@/components/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  category: string;
  image_url: string | null;
  stock: number;
  created_at: string;
};

type ProductsResponse = {
  success: boolean;
  data: Product[];
  message?: string;
};

async function getProducts(): Promise<{
  products: Product[];
  error: string | null;
}> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        products: [],
        error: `Le backend a répondu avec le statut ${response.status}.`,
      };
    }

    const result = (await response.json()) as ProductsResponse;
    if (!result.success || !Array.isArray(result.data)) {
      return { products: [], error: "La réponse de l’API est invalide." };
    }

    return { products: result.data, error: null };
  } catch {
    return {
      products: [],
      error: "Impossible de joindre le backend. Vérifie qu’il est démarré.",
    };
  }
}

const formatPrice = (price: number | string) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(price));

export default async function Home() {
  await requireAdmin();

  const { products, error } = await getProducts();
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
            <p className="text-sm text-muted-foreground">BaristaBar / Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Vue d’ensemble de ton catalogue.</p>
          </div>
          <AdminSignOutButton />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Gestion du catalogue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoute des produits, mets à jour les prix et les stocks, ou désactive un produit.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Gérer les produits →
          </Link>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Erreur de connexion</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-6">
            <p className="text-sm text-muted-foreground">Produits récupérés</p>
            <p className="mt-2 text-3xl font-semibold">{products.length}</p>
          </div>
          <div className="rounded-xl border bg-background p-6">
            <p className="text-sm text-muted-foreground">Stock total disponible</p>
            <p className="mt-2 text-3xl font-semibold">{totalStock}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Catalogue des produits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aperçu des produits actifs récupérés depuis l’API commune.
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
                        <p className="mt-1 text-xs text-muted-foreground">{product.slug}</p>
                      </td>
                      <td className="px-5 py-4">{product.category}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium">{formatPrice(product.price)}</td>
                      <td className="px-5 py-4">
                        <span className={product.stock === 0 ? "font-medium text-red-600" : "font-medium"}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !error ? (
            <p className="p-6 text-sm text-muted-foreground">Aucun produit trouvé dans le catalogue.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
