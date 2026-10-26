import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import {
  getProductsFromDatabase,
  type Product,
} from "@/lib/products";

export const dynamic = "force-dynamic";

const recipes = [
  {
    number: "01",
    slug: "vanilla-latte",
    title: "Vanilla Latte",
    category: "The comforting cup",
    video: "/latte-v2.mp4",
    videoAlt: "A close-up of a latte being prepared",
    description:
      "A smooth espresso drink with milk and a gentle touch of vanilla.",
    time: "5 minutes",
    ingredients: [
      "1 espresso shot",
      "Milk of your choice",
      "Vanilla syrup, to taste",
    ],
    method: [
      "Prepare your espresso.",
      "Warm and froth the milk.",
      "Pour the milk over the espresso and add vanilla syrup to taste.",
    ],
    productSlugs: ["house-espresso-blend", "monin-vanilla"],
  },
  {
    number: "02",
    slug: "slow-pour-over",
    title: "Slow Pour-Over",
    category: "The mindful ritual",
    video: "/slowpourover-v2.mp4",
    videoAlt: "Coffee prepared slowly with a pour-over method",
    description:
      "A simple preparation that puts the coffee itself at the centre of the experience.",
    time: "4–6 minutes",
    ingredients: [
      "Freshly ground coffee",
      "Hot water",
      "A pour-over dripper and filter",
    ],
    method: [
      "Place the filter in the dripper and add the coffee.",
      "Wet the grounds evenly with a small amount of hot water.",
      "Continue pouring slowly, then serve once the coffee has filtered through.",
    ],
    productSlugs: ["ethiopia-yirgacheffe"],
  },
  {
    number: "03",
    slug: "iced-coffee",
    title: "Iced Coffee",
    category: "The refreshing favourite",
    video: "/ice-coffee-v2.mp4",
    videoAlt: "An iced coffee being prepared and served",
    description:
      "A refreshing coffee for warmer days, served over ice and adjusted to your taste.",
    time: "5 minutes",
    ingredients: [
      "Freshly brewed coffee, cooled",
      "Ice cubes",
      "Milk or sweetener, optional",
    ],
    method: [
      "Prepare your coffee and let it cool.",
      "Fill a glass with ice.",
      "Pour in the coffee and add milk or sweetener if desired.",
    ],
    productSlugs: ["colombia-supremo"],
  },
];

function formatPrice(price: number): string {
  return `${Number(price).toFixed(3)} DT`;
}

export default async function CoffeeRecipesPage() {
  let catalog: Product[] = [];
  let catalogueError = false;

  try {
    catalog = await getProductsFromDatabase();
  } catch (error) {
    console.error("Unable to load recipe products:", error);
    catalogueError = true;
  }

  const productsBySlug = new Map(
    catalog.map((product) => [product.slug, product]),
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FBF8F4] text-[#3B2418]">
        {/* Editorial introduction */}
        <section className="px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div className="mx-auto grid max-w-310 items-center gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8A6B55] sm:text-xs">
                Made to be savoured
              </p>

              <h1 className="mt-5 font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Coffee
                <br />
                <span className="italic text-[#8A6B55]">recipes.</span>
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                Find inspiration for everyday coffee moments. From a comforting
                vanilla latte to a slow pour-over or refreshing iced coffee,
                start with our Featured coffees and make each cup your own.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#recipe-collection"
                  className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#3B2418] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331]"
                >
                  Explore the recipes
                  <span aria-hidden="true">↓</span>
                </Link>

                <Link
                  href="/categories/coffee-beans"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#D8C7B8] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:border-[#3B2418]"
                >
                  Find your coffee
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 rotate-2 rounded-[1.5rem] bg-[#E9DED1]" />

              <div className="relative aspect-4/5 overflow-hidden rounded-[1.25rem] bg-[#EDE2D5]">
                <Image
                  src="/coffee-recipes.jpg"
                  alt="A carefully prepared coffee drink"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>

              <p className="mt-5 text-center text-[10px] uppercase tracking-[0.2em] text-[#8A6B55]">
                Simple ingredients · Beautiful coffee moments
              </p>
            </div>
          </div>
        </section>

        {/* Recipe collection */}
        <section
          id="recipe-collection"
          className="scroll-mt-24 bg-[#F8F5F0] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24"
        >
          <div className="mx-auto max-w-310">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
                The recipe collection
              </p>

              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
                Your next favourite cup.
              </h2>

              <p className="mt-4 text-sm leading-7 text-stone-600">
                Start with a coffee you enjoy, follow a few simple steps and
                adjust each drink to your taste.
              </p>
            </div>

            <div className="mt-10 space-y-8">
              {recipes.map((recipe) => {
                const associatedProducts = recipe.productSlugs
                  .map((slug) => productsBySlug.get(slug))
                  .filter(
                    (product): product is Product => product !== undefined,
                  );

                return (
                  <article
                    key={recipe.slug}
                    className="overflow-hidden rounded-[10px] border border-[#E5D9CD] bg-white"
                  >
                    <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                      {/* Silent video: autoplay, continuous loop, mobile-friendly */}
                      <div className="relative min-h-64 overflow-hidden bg-[#EDE2D5] md:min-h-full">
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          disablePictureInPicture
                          aria-label={recipe.videoAlt}
                          className="absolute inset-0 h-full w-full object-cover"
                        >
                          <source src={recipe.video} type="video/mp4" />
                          Your browser does not support HTML video.
                        </video>
                      </div>

                      <div className="p-6 sm:p-8 lg:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
                            {recipe.number} / {recipe.category}
                          </p>

                          <span className="rounded-full bg-[#F8F5F0] px-3 py-1.5 text-xs text-stone-600">
                            {recipe.time}
                          </span>
                        </div>

                        <h3 className="mt-4 font-serif text-3xl sm:text-4xl">
                          {recipe.title}
                        </h3>

                        <p className="mt-4 text-sm leading-7 text-stone-600">
                          {recipe.description}
                        </p>

                        <div className="mt-6 grid gap-7 sm:grid-cols-2">
                          <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6B55]">
                              What you need
                            </h4>

                            <ul className="mt-3 space-y-2">
                              {recipe.ingredients.map((ingredient) => (
                                <li
                                  key={ingredient}
                                  className="flex items-start gap-2 text-sm leading-6 text-stone-600"
                                >
                                  <span aria-hidden="true" className="text-[#8A6B55]">
                                    ·
                                  </span>
                                  {ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6B55]">
                              How to make it
                            </h4>

                            <ol className="mt-3 space-y-2">
                              {recipe.method.map((step, index) => (
                                <li
                                  key={step}
                                  className="flex items-start gap-2 text-sm leading-6 text-stone-600"
                                >
                                  <span className="text-xs font-semibold text-[#8A6B55]">
                                    {index + 1}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        <div className="mt-7 border-t border-[#E8DFD5] pt-5">
                          <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A6B55]">
                            From the BaristaBar catalogue
                          </h4>

                          {catalogueError ? (
                            <p className="mt-3 text-sm text-stone-500">
                              Product details are temporarily unavailable.
                            </p>
                          ) : associatedProducts.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-3">
                              {associatedProducts.map((product) => (
                                <Link
                                  key={product.slug}
                                  href={`/shop/${product.slug}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-[#E5D9CD] px-4 py-2 text-xs text-[#3B2418] transition-colors hover:border-[#8A6B55] hover:bg-[#FBF8F4]"
                                >
                                  {product.name}
                                  <span className="text-[#8A6B55]">
                                    {formatPrice(Number(product.price))}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-stone-500">
                              Explore the shop for currently available coffees
                              and ingredients.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Next discovery route */}
        <section className="border-t border-[#E8DFD5] px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto flex max-w-310 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
                Keep exploring
              </p>

              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">
                Find a ritual for your favourite coffee.
              </h2>
            </div>

            <Link
              href="/discovery"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-[#3B2418] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331]"
            >
              Explore brewing rituals
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
