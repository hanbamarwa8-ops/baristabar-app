
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import {
  getProductImage,
  getProductsFromApi,
  type Product,
} from "@/lib/products";
export const dynamic = "force-dynamic";

const featuredSlugs = [
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
];

const rituals = [
  {
    number: "01",
    title: "Espresso",
    subtitle: "A concentrated daily ritual",
    description:
      "Prepare a compact, intense coffee and build your favourite drinks around it. Start with a coffee suited to your espresso routine.",
    image: "/brewing-methods.jpg",
    imageAlt: "Espresso preparation",
    steps: [
      "Choose your coffee.",
      "Prepare your espresso machine.",
      "Adjust the grind and extraction to your taste.",
    ],
  },
  {
    number: "02",
    title: "Pour-over",
    subtitle: "Slow down and savour",
    description:
      "A hands-on method for enjoying the preparation itself. Pour steadily and take the time to discover how your coffee changes in the cup.",
    image: "/coffee-origins.jpg",
    imageAlt: "Coffee beans and coffee preparation",
    steps: [
      "Prepare a filter and your ground coffee.",
      "Wet the grounds evenly with hot water.",
      "Pour slowly and let the coffee filter through.",
    ],
  },
  {
    number: "03",
    title: "Your own coffee ritual",
    subtitle: "Find your favourite way",
    description:
      "The best ritual is the one that fits your taste, your equipment and the time you have. Explore coffees and tools to develop yours.",
    image: "/coffee-recipes.jpg",
    imageAlt: "Coffee drink prepared for serving",
    steps: [
      "Begin with a coffee you enjoy.",
      "Choose a preparation method that suits you.",
      "Experiment with the strength and serving style.",
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isCoffee(product: Product): boolean {
  const category = normalize(product.category);

  return [
    "coffee beans",
    "ground coffee",
    "coffee capsules",
  ].includes(category);
}

function isBrewingProduct(product: Product): boolean {
  const category = normalize(product.category);

  return (
    category.includes("accessor") ||
    category.includes("coffee machine")
  );
}

function formatPrice(price: number): string {
  return `${Number(price).toFixed(3)} DT`;
}

export default async function BrewingRitualsPage() {
  let catalog: Product[] = [];
  let catalogueError = false;

  try {
    catalog = await getProductsFromApi();
  } catch (error) {
    console.error("Unable to load Brewing Rituals catalogue:", error);
    catalogueError = true;
  }

  const availableProducts = catalog.filter(
    (product) =>
      Number(product.stock) > 0 &&
      Number.isFinite(Number(product.price)),
  );

  const featuredProducts = featuredSlugs
    .map((slug) =>
      availableProducts.find((product) => product.slug === slug),
    )
    .filter((product): product is Product => product !== undefined);

  const otherProducts = availableProducts.filter(
    (product) =>
      (isCoffee(product) || isBrewingProduct(product)) &&
      !featuredSlugs.includes(product.slug),
  );

  const productsToShow = [
    ...featuredProducts,
    ...otherProducts,
  ].slice(0, 6);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FBF8F4] text-[#3B2418]">
        {/* Editorial introduction */}
        <section className="px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div className="mx-auto grid max-w-310 items-center gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8A6B55] sm:text-xs">
                The art of preparation
              </p>

              <h1 className="mt-5 font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Brewing
                <br />
                <span className="italic text-[#8A6B55]">
                  rituals.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                Every cup begins with a choice. Discover different
                ways to prepare your coffee, explore the tools that
                suit your routine and find a ritual worth returning to.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#ritual-guides"
                  className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#3B2418] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331]"
                >
                  Explore the methods
                  <span aria-hidden="true">↓</span>
                </Link>

                <Link
                  href="/categories/coffee-beans"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#D8C7B8] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:border-[#3B2418]"
                >
                  Explore our coffees
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 -rotate-2 rounded-[1.5rem] bg-[#E9DED1]" />

              <div className="relative aspect-4/5 overflow-hidden rounded-[1.25rem] bg-[#EDE2D5]">
                <Image
                  src="/brewing-methods.jpg"
                  alt="Coffee preparation and brewing methods"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>

              <p className="mt-5 text-center text-[10px] uppercase tracking-[0.2em] text-[#8A6B55]">
                Take your time · Find your ritual
              </p>
            </div>
          </div>
        </section>

        {/* Brewing guides */}
        <section
          id="ritual-guides"
          className="scroll-mt-24 bg-[#F8F5F0] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24"
        >
          <div className="mx-auto max-w-310">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
                Find your way
              </p>

              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
                Three ways to enjoy your coffee.
              </h2>

              <p className="mt-4 text-sm leading-7 text-stone-600">
                Begin with a method that matches your taste and
                routine. You can explore the coffees and tools
                available in our collection below.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rituals.map((ritual) => (
                <article
                  key={ritual.number}
                  className="flex h-full flex-col rounded-[10px] border border-[#E5D9CD] bg-white p-6 sm:p-7"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
                    {ritual.number} / Brewing guide
                  </p>

                  <h3 className="mt-4 font-serif text-2xl sm:text-3xl">
                    {ritual.title}
                  </h3>

                  <p className="mt-2 text-xs font-medium text-[#8A6B55]">
                    {ritual.subtitle}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-stone-600">
                    {ritual.description}
                  </p>

                  <div className="mt-5 h-px bg-[#E8DFD5]" />

                  <ol className="mt-5 space-y-3">
                    {ritual.steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 text-sm leading-6 text-stone-600"
                      >
                        <span className="mt-0.5 text-xs font-semibold text-[#8A6B55]">
                          0{index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Products loaded from the catalogue */}
        <section className="px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          <div className="mx-auto max-w-310">
            <div className="flex flex-col gap-5 border-b border-[#E8DFD5] pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
                  The BaristaBar selection
                </p>

                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
                  Coffee and tools for your ritual.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                  Explore available coffees, accessories and machines
                  directly from our current catalogue.
                </p>
              </div>

              <Link
                href="/shop"
                className="inline-flex w-fit items-center gap-2 border-b border-[#D8C7B8] pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors hover:border-[#3B2418]"
              >
                Browse the shop
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {catalogueError ? (
              <p role="alert" className="py-12 text-sm text-stone-500">
                The product catalogue is temporarily unavailable.
                Please try again later.
              </p>
            ) : productsToShow.length > 0 ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {productsToShow.map((product) => (
                  <article
                    key={product.slug}
                    className="overflow-hidden rounded-[10px] border border-[#E5D9CD] bg-white"
                  >
                    <div className="relative aspect-4/3 bg-[#EDE2D5]">
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

                      <h3 className="mt-2 font-serif text-2xl">
                        {product.name}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                        {product.description ||
                          "Explore this product from the BaristaBar collection."}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                          {formatPrice(Number(product.price))}
                        </span>

                        <Link
                          href={`/shop/${product.slug}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.12em] underline decoration-[#8A6B55]/50 underline-offset-4 hover:text-[#8A6B55]"
                        >
                          View product →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-12 text-sm text-stone-500">
                No coffee or brewing products are currently available.
                You can still browse the full shop.
              </p>
            )}
          </div>
        </section>

        {/* Next discovery route */}
        <section className="border-t border-[#E8DFD5] px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto flex max-w-310 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
                Continue exploring
              </p>

              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">
                A little inspiration in every cup.
              </h2>
            </div>

            <Link
              href="/recipes"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-[#3B2418] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331]"
            >
              Explore coffee recipes
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
