import Link from "next/link";
import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
}

interface ProductsApiResponse {
  success: boolean;
  data: Product[];
}

async function getProducts(): Promise<Product[]> {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    throw new Error("BACKEND_URL est manquante dans .env.local");
  }

  const response = await fetch(`${backendUrl}/api/products`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erreur API : ${response.status}`);
  }

  const result =
    (await response.json()) as ProductsApiResponse;

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Réponse API invalide");
  }

  return result.data;
}

export async function FeaturedProductsSection() {
  let products: Product[] = [];
  let hasError = false;

  try {
    products = await getProducts();
  } catch (error) {
    console.error("Impossible de charger les produits :", error);
    hasError = true;
  }

  return (
    <section
      className="bg-white px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28"
      aria-labelledby="featured-products-heading"
    >
      <div className="mx-auto max-w-310">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
              Selected with care
            </p>

            <h2
              id="featured-products-heading"
              className="mt-4 font-serif text-4xl leading-tight text-[#3B2418] sm:text-5xl"
            >
              Our signature coffees.
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-7 text-stone-500 sm:text-base">
              Discover exceptional beans chosen to make your everyday
              coffee ritual extraordinary.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex w-fit items-center gap-3 border-b border-[#3B2418]/40 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#3B2418] transition-colors hover:border-[#3B2418] hover:text-[#8A6B55]"
          >
            View all coffees <span aria-hidden="true">→</span>
          </Link>
        </div>

        {hasError ? (
          <p className="mt-10 text-sm text-red-700">
            Impossible de charger les cafés. Vérifie que le backend est démarré.
          </p>
        ) : products.length === 0 ? (
          <p className="mt-10 text-sm text-stone-500">
            Aucun café disponible pour le moment.
          </p>
        ) : (
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {products.map((product) => (
              <FeaturedProductCard
                key={product.id}
                name={product.name}
                category={product.category}
                description={
                  product.description ?? "Discover our specialty coffee."
                }
                price={product.price}
                image={product.image_url ?? "/coffee-origins.jpg"}
                href="/shop"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
