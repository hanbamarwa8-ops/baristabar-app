import Link from "next/link";

import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";
import {
  getProductImage,
  getProductsFromApi,
  type Product,
} from "@/lib/products";

const featuredSlugs = [
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
  "brazilian-signature-blend",
  "tunisian-coffee-blend",
];

export async function FeaturedProductsSection() {
  let apiProducts: Product[] = [];
  let hasError = false;

  try {
    apiProducts = await getProductsFromApi();
  } catch (error) {
    console.error(
      "Unable to load featured products from the API:",
      error,
    );
    hasError = true;
  }

  const displayProducts = featuredSlugs
    .map((slug) => apiProducts.find((product) => product.slug === slug))
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
          <p role="alert" className="mt-10 text-sm text-stone-500">
            Featured products are temporarily unavailable.
            Please check the backend connection and try again.
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
                image={getProductImage(product)}
                href={`/shop/${product.slug}`}
                loading={index === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
