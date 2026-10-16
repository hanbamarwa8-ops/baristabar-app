import Link from "next/link";
import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";

export const dynamic = "force-dynamic";

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

const featuredSlugs = [
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
  "brazilian-signature-blend",
  "tunisian-coffee-blend",
];

const productImagesBySlug: Record<string, string> = {
  "ethiopia-yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
  "house-espresso-blend": "/02_House_Espresso_Blend_v2.png",
  "colombia-supremo": "/03_Colombia_Supremo_v2.png",
  "brazilian-signature-blend":
    "/05_Brazilian_Signature_Blend_v2.png",
  "tunisian-coffee-blend": "/06_Tunisian_Coffee_Blend_v2.png",
};

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

  const result = (await response.json()) as ProductsApiResponse;

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

  const productsBySlug = new Map(
    products.map((product) => [product.slug, product])
  );

  const displayProducts = featuredSlugs
    .map((slug) => productsBySlug.get(slug))
    .filter((product): product is Product => product !== undefined);

  return (
    <section
      className="bg-[#F8F5F0] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28"
      aria-labelledby="featured-products-heading"
    >
      <div className="mx-auto max-w-310">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
              Featured
            </p>

            <h2
              id="featured-products-heading"
              className="mt-4 font-serif text-4xl leading-tight tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl"
            >
              Coffee worth discovering.
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex w-fit items-center gap-3 border-b border-[#3B2418]/40 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#3B2418] transition-colors hover:border-[#3B2418] hover:text-[#8A6B55]"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>

        {hasError ? (
          <p className="mt-10 text-sm text-red-700">
            Impossible de charger les cafés. Vérifie que le backend est démarré.
          </p>
        ) : displayProducts.length === 0 ? (
          <p className="mt-10 text-sm text-stone-500">
            Aucun café disponible pour le moment.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:mt-14 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-5">
            {displayProducts.map((product, index) => (
              <FeaturedProductCard
                key={product.id}
                productId={product.id}
                stock={product.stock}
                name={product.name}
                category={product.category}
                description={
                  product.description ??
                  "Discover our specialty coffee."
                }
                price={product.price}
                image={
                  productImagesBySlug[product.slug] ??
                  product.image_url ??
                  "/02_House_Espresso_Blend_v2.png"
                }
                href="/shop"
                loading={index === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}