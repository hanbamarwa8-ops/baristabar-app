import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import {
  getProductImage,
  getProductsFromApi,
  type Product,
} from "@/lib/products";

const beanBoxes = {
  "discovery-box": {
    name: "Discovery Box",
    label: "One-time purchase",
    price: 99,
    billing: "One-time purchase",
    description:
      "Your first step into the world of specialty coffee.",
    image: "/machine-ChP83Bzd.jpg",
    imageAlt: "Discovery Box coffee experience",
    details: [
      "3 coffees to discover",
      "V60 dripper and filters",
      "Coffee discovery booklet",
    ],
    productSlugs: [
      "ethiopia-yirgacheffe",
      "colombia-supremo",
      "brazilian-signature-blend",
    ],
  },
  "classic-box": {
    name: "Classic Box",
    label: "Monthly subscription",
    price: 29,
    billing: "Per month",
    description:
      "A carefully selected coffee for your everyday ritual.",
    image: "/classic2.jpg",
    imageAlt: "Classic Box coffee selection",
    details: [
      "1 coffee selection",
      "Fresh coffee discovery",
      "Delivery details to be confirmed",
    ],
    productSlugs: ["house-espresso-blend"],
  },
  "barista-box": {
    name: "Barista Box",
    label: "Monthly subscription",
    price: 49,
    billing: "Per month",
    description:
      "Explore new recipes and improve your barista skills at home.",
    image: "/brewing-methods.jpg",
    imageAlt: "Coffee brewing methods",
    details: [
      "1 coffee selection",
      "A coffee accessory",
      "Step-by-step recipe inspiration",
    ],
    productSlugs: [
      "tunisian-coffee-blend",
      "manual-coffee-grinder",
    ],
  },
  "premium-box": {
    name: "Premium Box",
    label: "Monthly subscription",
    price: 79,
    billing: "Per month",
    description:
      "A complete experience for passionate coffee lovers.",
    image: "/coffee-origins.jpg",
    imageAlt: "Premium coffee discovery",
    details: [
      "2 specialty coffee selections",
      "A flavour or accessory",
      "Exclusive coffee inspiration",
    ],
    productSlugs: [
      "ethiopia-yirgacheffe",
      "colombia-supremo",
      "monin-vanilla",
    ],
  },
} as const;

type BeanBoxSlug = keyof typeof beanBoxes;

function formatPrice(price: number): string {
  return `${price.toFixed(3)} DT`;
}

export default async function BeanBoxDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!Object.prototype.hasOwnProperty.call(beanBoxes, slug)) {
    notFound();
  }

  const box = beanBoxes[slug as BeanBoxSlug];

  let catalog: Product[] = [];
  let catalogueError = false;

  try {
    catalog = await getProductsFromApi();
  } catch (error) {
    console.error("Unable to load BeanBox products:", error);
    catalogueError = true;
  }

  const includedProducts = box.productSlugs
    .map((productSlug) =>
      catalog.find((product) => product.slug === productSlug),
    )
    .filter((product): product is Product => product !== undefined);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FBF8F4]">
        {/* Breadcrumb */}
        <div className="px-6 pt-8 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-310">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-xs text-stone-500"
            >
              <Link href="/" className="hover:text-[#3B2418]">
                Home
              </Link>

              <span aria-hidden="true">/</span>

              <Link
                href="/#beanbox"
                className="hover:text-[#3B2418]"
              >
                BeanBox
              </Link>

              <span aria-hidden="true">/</span>

              <span className="text-[#3B2418]">{box.name}</span>
            </nav>
          </div>
        </div>

        {/* Box introduction */}
        <section className="px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="mx-auto grid max-w-310 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="relative aspect-4/3 overflow-hidden rounded-[10px] bg-[#EDE2D5]">
              <Image
                src={box.image}
                alt={box.imageAlt}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
                {box.label}
              </p>

              <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl">
                {box.name}
              </h1>

              <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">
                {box.description}
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-4xl text-[#3B2418]">
                  {box.price}
                </span>

                <span className="text-sm text-stone-500">
                  {box.billing === "One-time purchase"
                    ? "DT · one-time"
                    : `DT ${box.billing.toLowerCase()}`}
                </span>
              </div>

              <div className="mt-6 h-px bg-[#E8DFD5]" />

              <ul className="mt-6 space-y-3">
                {box.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex items-start gap-2 text-sm leading-6 text-stone-600"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 text-[#8A6B55]"
                    >
                      ✓
                    </span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs leading-6 text-stone-500">
                This page presents the planned box contents. Online
                ordering and subscriptions are not available yet.
              </p>

              <Link
                href="/#beanbox"
                className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] border border-[#3B2418] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white"
              >
                ← Back to BeanBox
              </Link>
            </div>
          </div>
        </section>

        {/* Actual products from Supabase */}
        <section className="px-6 pb-16 sm:px-10 sm:pb-20 lg:px-16">
          <div className="mx-auto max-w-310">
            <div className="border-b border-[#E8DFD5] pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
                Inside your box
              </p>

              <h2 className="mt-3 font-serif text-3xl text-[#3B2418] sm:text-4xl">
                Discover the selection.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                Explore the products associated with this box. Product
                details and availability come from the BaristaBar catalogue.
              </p>
            </div>

            {catalogueError ? (
              <p role="alert" className="py-12 text-sm text-stone-500">
                The product selection is temporarily unavailable. Please
                try again when the catalogue is accessible.
              </p>
            ) : includedProducts.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {includedProducts.map((product) => (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-[10px] border border-[#E5D9CD] bg-white"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-[#EDE2D5]">
                      <Image
                        src={getProductImage(product)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>

                    <div className="p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6B55]">
                        {product.category}
                      </p>

                      <h3 className="mt-2 font-serif text-2xl text-[#3B2418]">
                        {product.name}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        {product.description ??
                          "Discover this product from the BaristaBar collection."}
                      </p>

                      <p className="mt-4 font-medium text-[#3B2418]">
                        {formatPrice(product.price)}
                      </p>

                      <Link
                        href={`/shop/${product.slug}`}
                        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#3B2418] underline decoration-[#8A6B55]/50 underline-offset-4 hover:text-[#8A6B55]"
                      >
                        View product
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-12 text-sm text-stone-500">
                The products for this box are not currently available
                in the catalogue.
              </p>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
