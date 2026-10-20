import Link from "next/link";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";
import {
  getProductsFromApi,
  getProductImage,
  type Product,
} from "@/lib/products";

interface ShopSearchParams {
  q?: string | string[];
  category?: string | string[];
  sort?: string | string[];
}

const categories = [
  {
    slug: "coffee-beans",
    title: "Coffee Beans",
    aliases: ["beans", "coffee beans", "cafe en grains"],
  },
  {
    slug: "ground-coffee",
    title: "Ground Coffee",
    aliases: ["ground coffee", "cafe moulu"],
  },
  {
    slug: "coffee-capsules",
    title: "Coffee Capsules",
    aliases: ["coffee capsules", "capsules"],
  },
  {
    slug: "syrups-flavours",
    title: "Syrups & Flavours",
    aliases: ["syrups and flavours", "syrups flavours", "sirop", "sirops"],
  },
  {
    slug: "accessories",
    title: "Accessories",
    aliases: ["accessories", "accessoires"],
  },
  {
    slug: "coffee-machines",
    title: "Coffee Machines",
    aliases: ["coffee machines", "machines a cafe"],
  },
  {
    slug: "gift-boxes",
    title: "Gift Boxes",
    aliases: ["gift boxes", "coffrets cadeaux", "coffrets"],
  },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function findCategory(value: string) {
  const normalizedValue = normalize(value);
  const slugValue = value.trim().toLowerCase();

  return categories.find(
    (category) =>
      category.slug === slugValue ||
      normalize(category.title) === normalizedValue ||
      category.aliases.some(
        (alias) => normalize(alias) === normalizedValue,
      ),
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;

  const query = getParam(params.q).trim();
  const categoryParam = getParam(params.category);
  const sortParam = getParam(params.sort);

  const selectedCategory = findCategory(categoryParam);

  let allProducts: Product[] = [];
  let catalogueError = false;

  try {
    // Supabase supplies the catalogue through the shared Express API.
    allProducts = await getProductsFromApi();
  } catch (error) {
    console.error("Unable to load the product catalogue:", error);
    catalogueError = true;
  }

  const normalizedQuery = normalize(query);

  let products = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory ||
      normalize(product.category) === normalize(selectedCategory.title);

    const searchableText = normalize(
      [
        product.name,
        product.slug,
        product.category,
        product.description ?? "",
      ].join(" "),
    );

    const matchesSearch =
      !normalizedQuery ||
      searchableText.includes(normalizedQuery);

    return matchesCategory && matchesSearch;
  });

  if (sortParam === "price-asc") {
    products = [...products].sort((a, b) => a.price - b.price);
  } else if (sortParam === "price-desc") {
    products = [...products].sort((a, b) => b.price - a.price);
  } else if (sortParam === "name-asc") {
    products = [...products].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  const allProductsActive = !selectedCategory;
  const pageTitle = selectedCategory?.title ?? "All Products";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FBF8F4]">
        {/* Shop heading */}
        <section className="px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-14 lg:px-16 lg:pt-16">
          <div className="mx-auto max-w-360">
            <header className="relative border-b border-[#E8DFD5] pb-8 text-center">
              <div className="mx-auto max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
                  The BaristaBar selection
                </p>

                <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl">
                  {pageTitle}
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                  Discover our collection of carefully selected coffee,
                  equipment and accessories, created to make every cup
                  a little more special.
                </p>
              </div>

              <p className="mt-5 text-sm text-stone-500 sm:absolute sm:bottom-8 sm:right-0 sm:mt-0">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </header>
          </div>
        </section>

        {/* Category navigation */}
        <section className="px-5 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-360">
            <nav
              aria-label="Product categories"
              className="flex gap-3 overflow-x-auto pb-2"
            >
              <Link
                href="/shop"
                aria-current={allProductsActive ? "page" : undefined}
                className={`shrink-0 rounded-full border px-5 py-3 text-sm transition-colors duration-200 ${
                  allProductsActive
                    ? "border-[#3B2418] bg-[#3B2418] text-white"
                    : "border-[#E8DFD5] bg-white text-stone-600 hover:border-[#3B2418] hover:text-[#3B2418]"
                }`}
              >
                All Products
              </Link>

              {categories.map((category) => {
                const isActive =
                  selectedCategory?.slug === category.slug;

                return (
                  <Link
                    key={category.slug}
                    href={`/categories/${category.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`shrink-0 rounded-full border px-5 py-3 text-sm transition-colors duration-200 ${
                      isActive
                        ? "border-[#3B2418] bg-[#3B2418] text-white"
                        : "border-[#E8DFD5] bg-white text-stone-600 hover:border-[#3B2418] hover:text-[#3B2418]"
                    }`}
                  >
                    {category.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* Search and sorting */}
        <section className="px-6 pb-7 pt-4 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-360">
            <form
              action="/shop"
              method="get"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex w-full items-center gap-3 rounded-full border border-[#E8DFD5] bg-white px-5 py-3 transition-colors focus-within:border-[#8A6B55] sm:max-w-md">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-[#8A6B55]"
                >
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="6.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m16 16 4.2 4.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="w-full bg-transparent text-sm text-[#3B2418] outline-none placeholder:text-stone-400"
                />

                {categoryParam && (
                  <input
                    type="hidden"
                    name="category"
                    value={categoryParam}
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="shop-sort"
                  className="shrink-0 text-xs font-medium text-stone-500"
                >
                  Sort by
                </label>

                <select
                  id="shop-sort"
                  name="sort"
                  defaultValue={sortParam || "featured"}
                  className="min-w-0 flex-1 rounded-full border border-[#E8DFD5] bg-white px-4 py-3 text-sm text-[#3B2418] outline-none transition-colors focus:border-[#8A6B55] sm:flex-none"
                >
                  <option value="featured">Recommended</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="name-asc">Name: A–Z</option>
                </select>

                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-[#3B2418] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#604331]"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Product catalogue */}
        <section className="px-6 pb-12 pt-3 sm:px-10 sm:pb-16 lg:px-16 lg:pb-20">
          <div className="mx-auto max-w-360">
            {catalogueError ? (
              <div className="py-20 text-center" role="alert">
                <p className="font-serif text-2xl text-[#3B2418]">
                  The catalogue is temporarily unavailable.
                </p>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-500">
                  Please check that the backend is running and try again.
                </p>
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
                  {query ? "No products found." : "This collection is coming soon."}
                </p>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-500">
                  {query
                    ? "Try a different search term or browse all our products."
                    : "We are preparing this selection. Explore the rest of our shop in the meantime."}
                </p>

                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-2 border-b border-[#3B2418]/40 pb-2 text-sm font-medium text-[#3B2418] transition-colors hover:border-[#3B2418] hover:text-[#8A6B55]"
                >
                  View all products
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
