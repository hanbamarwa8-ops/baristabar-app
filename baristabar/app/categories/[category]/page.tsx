import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";
import { demoProducts } from "@/data/demoProducts";

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  image?: string | null;
  image_url?: string | null;
  stock?: number;
}

interface ProductsApiResponse {
  success?: boolean;
  data?: Product[];
}

const categories = {
  "coffee-beans": {
    title: "Coffee Beans",
    description:
      "Discover exceptional coffee beans from distinctive origins, selected for their aroma, character and flavour.",
  },
  "ground-coffee": {
    title: "Ground Coffee",
    description:
      "Explore carefully selected ground coffees for a rich and satisfying cup, prepared your way.",
  },
  "coffee-capsules": {
    title: "Coffee Capsules",
    description:
      "Enjoy convenient coffee capsules with rich aromas and the quality you expect from every cup.",
  },
  "syrups-flavours": {
    title: "Syrups & Flavours",
    description:
      "Bring a new dimension to your coffee with delicious flavours for your favourite drinks.",
  },
  accessories: {
    title: "Accessories",
    description:
      "Discover practical tools and thoughtful details that make preparing and enjoying coffee even better.",
  },
  "coffee-machines": {
    title: "Coffee Machines",
    description:
      "Explore equipment for preparing espresso and creating your own coffee ritual at home.",
  },
  "gift-boxes": {
    title: "Gift Boxes",
    description:
      "Find thoughtful coffee gifts for sharing special moments with the people who matter.",
  },
} as const;

type CategorySlug = keyof typeof categories;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function getApiProducts(): Promise<Product[]> {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return [];
  }

  try {
    const response = await fetch(`${backendUrl}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Products API error:", response.status);
      return [];
    }

    const result =
      (await response.json()) as ProductsApiResponse;

    if (!result.success || !Array.isArray(result.data)) {
      return [];
    }

    return result.data;
  } catch (error) {
    console.error("Unable to load API products:", error);
    return [];
  }
}

async function getProducts(): Promise<Product[]> {
  const localProducts = demoProducts as unknown as Product[];
  const apiProducts = await getApiProducts();

  const productsBySlug = new Map<string, Product>();

  // Add demo products first and preserve their prepared images.
  for (const product of localProducts) {
    productsBySlug.set(product.slug, {
      ...product,
      price: Number(product.price),
      image: product.image ?? product.image_url ?? null,
      image_url: product.image_url ?? product.image ?? null,
      stock: product.stock ?? 99,
    });
  }

  // Backend data takes priority for matching product slugs.
  for (const product of apiProducts) {
    const localProduct = productsBySlug.get(product.slug);

    productsBySlug.set(product.slug, {
      ...localProduct,
      ...product,
      price: Number(product.price),
      image:
        localProduct?.image ??
        product.image ??
        product.image_url ??
        null,
      image_url:
        localProduct?.image_url ??
        localProduct?.image ??
        product.image_url ??
        product.image ??
        null,
      stock: product.stock ?? localProduct?.stock ?? 0,
    });
  }

  return Array.from(productsBySlug.values());
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (!Object.prototype.hasOwnProperty.call(categories, category)) {
    notFound();
  }

  const categoryInfo = categories[category as CategorySlug];
  const allProducts = await getProducts();

  const products = allProducts.filter(
    (product) =>
      normalize(product.category) === normalize(categoryInfo.title)
  );

  const categoryLinks = Object.entries(categories).map(
    ([slug, info]) => ({
      slug,
      title: info.title,
    })
  );

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
                    {categoryInfo.title}
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                  {categoryInfo.description}
                </p>
              </div>

              <p className="mt-5 text-sm text-stone-500 sm:absolute sm:bottom-8 sm:right-0 sm:mt-0">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </header>
          </div>
        </section>

        {/* All Products and category navigation */}
        <section className="px-5 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-360">
            <nav
              aria-label="Product categories"
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {/* All Products is the first navigation item */}
              <Link
                href="/shop"
                className="shrink-0 rounded-full border border-[#E8DFD5] bg-white px-5 py-3 text-sm text-stone-600 transition-colors hover:border-[#3B2418] hover:text-[#3B2418]"
              >
                All Products
              </Link>

              {categoryLinks.map((item) => {
                const isActive = item.slug === category;

                return (
                  <Link
                    key={item.slug}
                    href={`/categories/${item.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`shrink-0 rounded-full border px-5 py-3 text-sm transition-colors duration-200 ${
                      isActive
                        ? "border-[#3B2418] bg-[#3B2418] text-white"
                        : "border-[#E8DFD5] bg-white text-stone-600 hover:border-[#3B2418] hover:text-[#3B2418]"
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* Products */}
        <section className="px-6 pb-12 pt-5 sm:px-10 sm:pb-16 lg:px-16 lg:pb-20">
          <div className="mx-auto max-w-360">
            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product, index) => (
                  <FeaturedProductCard
                    key={product.slug}
                    productId={product.id}
                    name={product.name}
                    category={product.category}
                    description={
                      product.description ??
                      "Discover the BaristaBar selection."
                    }
                    price={product.price}
                    image={
                      product.image ??
                      product.image_url ??
                      "/coffee-origins.jpg"
                    }
                    href={`/shop/${product.slug}`}
                    stock={product.stock ?? 0}
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