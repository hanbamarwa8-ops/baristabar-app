
import Link from "next/link";
import { Footer } from "@/components/organisms/Footer/Footer";

import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";
import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { demoProducts } from "@/data/demoProducts";

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

interface ShopPageProps {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
}

const categories = [
  { label: "Coffee Beans", slug: "coffee-beans" },
  { label: "Ground Coffee", slug: "ground-coffee" },
  { label: "Coffee Capsules", slug: "coffee-capsules" },
  { label: "Syrups & Flavours", slug: "syrups-flavours" },
  { label: "Accessories", slug: "accessories" },
  { label: "Coffee Machines", slug: "coffee-machines" },
  { label: "Gift Boxes", slug: "gift-boxes" },
];

const categoryAliases: Record<string, string[]> = {
  "coffee-beans": ["coffee beans", "cafe en grains", "coffee bean"],
  "ground-coffee": ["ground coffee", "cafe moulu"],
  "coffee-capsules": ["coffee capsules", "capsules de cafe", "capsules"],
  "syrups-flavours": [
    "syrups flavours",
    "syrups flavors",
    "syrups",
    "flavours",
    "flavors",
    "sirops aromes",
  ],
  accessories: ["accessories", "accessoires"],
  "coffee-machines": ["coffee machines", "machines a cafe"],
  "gift-boxes": ["gift boxes", "coffrets cadeaux", "gift box"],
};

const productImagesBySlug: Record<string, string> = {
  "ethiopia-yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
  "house-espresso-blend": "/02_House_Espresso_Blend_v2.png",
  "colombia-supremo": "/03_Colombia_Supremo_v2.png",
  "brazilian-signature-blend": "/05_Brazilian_Signature_Blend_v2.png",
  "tunisian-coffee-blend": "/06_Tunisian_Coffee_Blend_v2.png",
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFirstParam(
  value: string | string[] | undefined
): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function matchesCategory(
  productCategory: string,
  categorySlug: string
): boolean {
  const aliases = categoryAliases[categorySlug];

  if (!aliases) return true;

  const normalizedCategory = normalizeText(productCategory);

  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);

    return (
      normalizedCategory === normalizedAlias ||
      normalizedCategory.includes(normalizedAlias)
    );
  });
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

  const result = (await response.json()) as ProductsApiResponse;

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Réponse API invalide");
  }

  return result.data;
}

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const params = await searchParams;
  const query = getFirstParam(params.q).trim();
  const categorySlug = getFirstParam(params.category).trim();

  let apiProducts: Product[] = [];
  let apiUnavailable = false;

  try {
    apiProducts = await getProducts();
  } catch (error) {
    console.error("Impossible de charger les produits :", error);
    apiUnavailable = true;
  }

  // Start with the demo catalogue.
  // Products returned by the API replace demo entries with the same slug.
  // This preserves real Supabase IDs for products already in the database.
  const productsBySlug = new Map<string, Product>();

  for (const product of demoProducts) {
    productsBySlug.set(product.slug, product);
  }

  for (const product of apiProducts) {
    productsBySlug.set(product.slug, product);
  }

  const allProducts = Array.from(productsBySlug.values());
  const normalizedQuery = normalizeText(query);

  const filteredProducts = allProducts.filter((product) => {
    const searchableText = normalizeText(
      [
        product.name,
        product.slug,
        product.description,
        product.category,
      ].join(" ")
    );

    const matchesSearch =
      !normalizedQuery || searchableText.includes(normalizedQuery);

    const matchesSelectedCategory =
      !categorySlug ||
      matchesCategory(product.category, categorySlug);

    return matchesSearch && matchesSelectedCategory;
  });

  const selectedCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F8F5F0] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-310">
          {/* Heading */}
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
            Explore our collection
          </p>

          <h1 className="mt-4 font-serif text-4xl text-[#3B2418] sm:text-6xl">
            Our Coffee Collection
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
            Discover carefully selected coffees for your everyday ritual.
          </p>

          {/* Temporary catalogue notice */}
          <p className="mt-5 text-xs leading-5 text-stone-500">
            Prototype catalogue: some products, prices and stocks are
            demonstration data and will be synchronized with Supabase later.
          </p>

          {apiUnavailable && (
            <p className="mt-4 rounded-lg border border-[#8A6B55]/20 bg-[#E8DED4]/50 p-4 text-sm text-[#665044]">
              The backend is unavailable. The demonstration catalogue is
              displayed so you can continue testing the shop interface.
            </p>
          )}

          {/* Category filters */}
          <nav
            aria-label="Filter products by category"
            className="mt-8 flex flex-wrap gap-2"
          >
            <Link
              href={
                query
                  ? `/shop?q=${encodeURIComponent(query)}`
                  : "/shop"
              }
              className={`rounded-full border px-4 py-2.5 text-xs font-medium transition-colors ${
                !categorySlug
                  ? "border-[#3B2418] bg-[#3B2418] text-white"
                  : "border-[#3B2418]/20 text-[#3B2418] hover:bg-[#E8DED4]"
              }`}
            >
              All products
            </Link>

            {categories.map((category) => {
              const selected = categorySlug === category.slug;

              const href = query
                ? `/shop?category=${category.slug}&q=${encodeURIComponent(query)}`
                : `/shop?category=${category.slug}`;

              return (
                <Link
                  key={category.slug}
                  href={href}
                  aria-current={selected ? "page" : undefined}
                  className={`rounded-full border px-4 py-2.5 text-xs font-medium transition-colors ${
                    selected
                      ? "border-[#3B2418] bg-[#3B2418] text-white"
                      : "border-[#3B2418]/20 text-[#3B2418] hover:bg-[#E8DED4]"
                  }`}
                >
                  {category.label}
                </Link>
              );
            })}
          </nav>

          {/* Results count */}
          {(query || selectedCategory) && (
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <span>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
                {query ? ` matching "${query}"` : ""}
                {selectedCategory ? ` in ${selectedCategory.label}` : ""}
              </span>

              <Link
                href="/shop"
                className="font-medium text-[#8A6B55] underline underline-offset-4 hover:text-[#3B2418]"
              >
                Clear filters
              </Link>
            </div>
          )}

          {/* Product grid */}
          {filteredProducts.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-[#3B2418]/10 bg-white/50 px-6 py-16 text-center">
              <h2 className="font-serif text-2xl text-[#3B2418]">
                No products found
              </h2>

              <p className="mt-3 text-sm text-stone-500">
                Try another search or select a different category.
              </p>

              <Link
                href="/shop"
                className="mt-6 inline-flex rounded-full bg-[#3B2418] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#684733]"
              >
                View all products
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-5">
              {filteredProducts.map((product, index) => {
                const image =
                  productImagesBySlug[product.slug] ??
                  product.image_url ??
                  "/coffee-origins.jpg";

                return (
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
                    image={image}
                    href="/shop"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
