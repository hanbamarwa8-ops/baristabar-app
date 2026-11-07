import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";

import {
  getProductImage,
  getProductsFromDatabase,
  type Product,
} from "@/lib/products";

import {
  findActiveCategories,
  type CategoryRecord,
} from "@/lib/categories-repository";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;

  let categories: CategoryRecord[] = [];
  let categoriesError = false;

  try {
    categories = await findActiveCategories();
  } catch (error) {
    console.error("Unable to load storefront categories:", error);
    categoriesError = true;
  }

  const categoryInfo = categories.find(
    (item) => item.slug === categorySlug,
  );

  // An unknown or inactive category returns a 404.
  if (!categoriesError && !categoryInfo) {
    notFound();
  }

  let allProducts: Product[] = [];
  let productsError = false;

  try {
    allProducts = await getProductsFromDatabase();
  } catch (error) {
    console.error("Unable to load category products:", error);
    productsError = true;
  }

  // Filter products by category ID.
  // Legacy products without category_id use the category name as fallback.
  const products = categoryInfo
    ? allProducts.filter((product) => {
        if (product.category_id) {
          return product.category_id === categoryInfo.id;
        }

        return (
          normalize(product.category) === normalize(categoryInfo.name)
        );
      })
    : [];

  const catalogueError = categoriesError || productsError;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FBF8F4]">
        {/* Centered category heading */}
        <section className="px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-14 lg:px-16 lg:pt-16">
          <div className="mx-auto max-w-360">
            <header className="relative border-b border-[#E8DFD5] pb-8 text-center">
              <div className="mx-auto max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
                  The BaristaBar selection
                </p>

                <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl">
                  {categoryInfo?.name ??
                    "Collection temporarily unavailable"}
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                  {categoryInfo?.description ||
                    "Discover our carefully selected products for your coffee ritual."}
                </p>
              </div>

              {!catalogueError && (
                <p className="mt-5 text-sm text-stone-500 sm:absolute sm:bottom-8 sm:right-0 sm:mt-0">
                  {products.length}{" "}
                  {products.length === 1 ? "product" : "products"}
                </p>
              )}
            </header>
          </div>
        </section>

        {/* Dynamic category navigation */}
        <section className="px-5 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-360">
            <nav
              aria-label="Product categories"
              className="flex gap-3 overflow-x-auto pb-2"
            >
              <Link
                href="/shop"
                className="shrink-0 rounded-full border border-[#E8DFD5] bg-white px-5 py-3 text-sm text-stone-600 transition-colors hover:border-[#3B2418] hover:text-[#3B2418]"
              >
                All Products
              </Link>

              {categories.map((item) => {
                const isActive = item.slug === categorySlug;

                return (
                  <Link
                    key={item.id}
                    href={`/categories/${item.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`shrink-0 rounded-full border px-5 py-3 text-sm transition-colors duration-200 ${
                      isActive
                        ? "border-[#3B2418] bg-[#3B2418] text-white"
                        : "border-[#E8DFD5] bg-white text-stone-600 hover:border-[#3B2418] hover:text-[#3B2418]"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* Products */}
        <section className="px-6 pb-12 pt-5 sm:px-10 sm:pb-16 lg:px-16 lg:pb-20">
          <div className="mx-auto max-w-360">
            {catalogueError ? (
              <div className="py-20 text-center" role="alert">
                <p className="font-serif text-2xl text-[#3B2418]">
                  This collection is temporarily unavailable.
                </p>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-500">
                  We could not load this collection. Please try again in a moment.
                </p>

                <Link
                  href={`/categories/${categorySlug}`}
                  className="mt-6 inline-flex items-center gap-2 border-b border-[#3B2418]/40 pb-2 text-sm font-medium text-[#3B2418] transition-colors hover:border-[#3B2418]"
                >
                  Try again
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product, index) => (
                  <FeaturedProductCard
                    key={product.id}
                    productId={product.id}
                    name={product.name}
                    category={product.category}
                    description={
                      product.description ??
                      "Discover the BaristaBar selection."
                    }
                    price={product.price}
                    image={getProductImage(product)}
                    href={`/shop/${product.slug}`}
                    stock={product.stock}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="font-serif text-2xl text-[#3B2418]">
                  This collection is coming soon.
                </p>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-500">
                  We are preparing this selection. Explore the rest of our
                  shop in the meantime.
                </p>

                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-2 border-b border-[#3B2418]/40 pb-2 text-sm font-medium text-[#3B2418] transition-colors hover:border-[#3B2418]"
                >
                  Browse all products
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
