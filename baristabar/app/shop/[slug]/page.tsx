import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import { ProductDetailActions } from "@/components/molecules/ProductDetailActions/ProductDetailActions";
import {
  getProductImage,
  getProductsFromDatabase,
  type Product,
} from "@/lib/products";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const baristaBarSlugs = new Set([
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
  "brazilian-santos",
  "brazilian-signature-blend",
  "tunisian-coffee-blend",
]);

function isBaristaBarProduct(slug: string): boolean {
  return baristaBarSlugs.has(slug);
}

function formatPrice(price: number): string {
  return `${price.toFixed(2)} DT`;
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  let products: Product[] = [];
  let catalogueError = false;

  try {
    // Les produits proviennent exclusivement de l'API Express.
    products = await getProductsFromDatabase();
  } catch (error) {
    console.error(
      "Unable to load product details from the API:",
      error,
    );

    catalogueError = true;
  }

  const product = products.find((item) => item.slug === slug);

  if (!product && !catalogueError) {
    notFound();
  }

  if (!product) {
    return (
      <>
        <Navbar />

        <main className="flex min-h-[60vh] items-center justify-center bg-[#FBF8F4] px-6 py-20">
          <div className="max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
              BaristaBar catalogue
            </p>

            <h1 className="mt-4 font-serif text-4xl text-[#3B2418]">
              Product details are temporarily unavailable.
            </h1>

            <p className="mt-4 text-sm leading-7 text-stone-600">
              We could not retrieve product data from the shop.
              Please check your connection and try again.
            </p>

            <Link
              href="/shop"
              className="mt-7 inline-flex rounded-full bg-[#3B2418] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#604331]"
            >
              Back to the shop
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  const image = getProductImage(product);
  const specialtyCoffee = isBaristaBarProduct(product.slug);

  const description =
    product.description ??
    "Discover this product from the BaristaBar collection.";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F8F5F0] px-6 py-10 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-310">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-xs text-stone-500"
          >
            <Link
              href="/"
              className="transition-colors hover:text-[#3B2418]"
            >
              Home
            </Link>

            <span aria-hidden="true">/</span>

            <Link
              href="/shop"
              className="transition-colors hover:text-[#3B2418]"
            >
              Shop
            </Link>

            <span aria-hidden="true">/</span>

            <span className="text-[#3B2418]">
              {product.name}
            </span>
          </nav>

          {/* Product detail */}
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
            {/* Product image */}
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-[#EAE2D7]">
              <Image
                src={image}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />

              <span className="absolute left-4 top-4 rounded-full bg-[#F8F5F0]/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3B2418]">
                {specialtyCoffee
                  ? "Specialty Coffee"
                  : product.category}
              </span>
            </div>

            {/* Product information */}
            <section className="flex flex-col py-2 lg:py-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
                {product.category}
              </p>

              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3B2418] sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>

              <p className="mt-6 text-2xl font-medium text-[#3B2418]">
                {formatPrice(product.price)}
              </p>

              <div className="mt-6 h-px w-full bg-[#3B2418]/15" />

              <p className="mt-6 text-sm leading-7 text-stone-600 sm:text-base">
                {description}
              </p>

              <div className="mt-7 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    product.stock > 0
                      ? "bg-emerald-600"
                      : "bg-red-600"
                  }`}
                />

                <p className="text-sm text-stone-600">
                  {product.stock > 0
                    ? "In stock"
                    : "Currently unavailable"}
                </p>
              </div>

              <ProductDetailActions
                product={{
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  description,
                  price: product.price,
                  image,
                  stock: product.stock,
                }}
              />

              <div className="mt-8 border-t border-[#3B2418]/15 pt-6">
                <p className="text-xs leading-6 text-stone-500">
                  Carefully selected for your coffee ritual. Product
                  availability and pricing are based on the current
                  catalogue data.
                </p>
              </div>
            </section>
          </div>

          {/* Back to shop */}
          <div className="mt-16 border-t border-[#3B2418]/10 pt-8">
            <Link
              href="/shop"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6B55] transition-colors hover:text-[#3B2418]"
            >
              ← Back to the collection
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
