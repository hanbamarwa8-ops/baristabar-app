import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";
import {
  BeanBoxCustomizer,
  type BeanBoxMode,
  type BeanBoxOptionProduct,
} from "@/components/organisms/BeanBoxCustomizer/BeanBoxCustomizer";
import {
  getProductImage,
  getProductsFromApi,
  type Product,
} from "@/lib/products";

const beanBoxes = {
  "discovery-box": {
    name: "Discovery Box",
    mode: "discovery",
    label: "The signature selection",
    description:
      "Discover three of our Featured coffees in one curated box. A simple introduction to the flavours and character of the BaristaBar coffee selection.",
      image: "/discovery-box-espresso-v2.jpg",
    imageAlt: "Creamy coffee swirls in warm chocolate and caramel tones",
    details: [
      "Ethiopia Yirgacheffe",
      "House Espresso Blend",
      "Colombia Supremo",
    ],
  },

  "classic-box": {
    name: "Classic Box",
    mode: "classic",
    label: "Your everyday ritual",
    description:
      "Choose the Featured coffee that best fits your everyday ritual. Your selection is assembled and added to the bag as one complete Classic Box.",
    image: "/classic2.jpg",
    imageAlt: "Classic Box coffee selection",
    details: [
      "Choose one Featured coffee",
      "One complete box per purchase",
      "Price based on the selected coffee",
    ],
  },

  "barista-box": {
    name: "Barista Box",
    mode: "barista",
    label: "Make it your own",
    description:
      "Build a box around your favourite Featured coffee and a compatible coffee accessory available in the BaristaBar catalogue.",
    image: "/brewing-methods.jpg",
    imageAlt: "Coffee brewing methods",
    details: [
      "Choose one Featured coffee",
      "Choose an available accessory",
      "One complete personalised box",
    ],
  },

  "premium-box": {
    name: "Premium Box",
    mode: "premium",
    label: "The complete coffee experience",
    description:
      "Create a richer coffee experience with two different Featured coffees and an accessory or flavour selected from the available catalogue.",
    image: "/coffee-origins.jpg",
    imageAlt: "Premium coffee discovery",
    details: [
      "Choose two different Featured coffees",
      "Choose an available accessory or flavour",
      "One complete personalised box",
    ],
  },
} as const;

type BeanBoxSlug = keyof typeof beanBoxes;

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

  const productOptions: BeanBoxOptionProduct[] = catalog.map(
    (product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      price: Number(product.price),
      image: getProductImage(product) || "/coffee-origins.jpg",
      stock: Math.max(
        0,
        Number.isFinite(Number(product.stock))
          ? Math.floor(Number(product.stock))
          : 0,
      ),
    }),
  );

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

              <div className="mt-6">
                <p className="font-serif text-3xl text-[#3B2418]">
                  One complete box
                </p>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  One-time purchase. The total is calculated from the
                  products you select below.
                </p>
              </div>

              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#604331]">
                <span aria-hidden="true">✓</span>
                Free delivery is available with a BeanBox and at least one other
                product, or on orders over 200 DT.
              </p>

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

              <Link
                href="/#beanbox"
                className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] border border-[#3B2418] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white"
              >
                <span aria-hidden="true">←</span>
                Back to BeanBox
              </Link>
            </div>
          </div>
        </section>

        {/* Personalise and add the entire box */}
        <BeanBoxCustomizer
          boxSlug={slug}
          boxName={box.name}
          boxDescription={box.description}
          boxImage={box.image}
          mode={box.mode as BeanBoxMode}
          products={productOptions}
          catalogueError={catalogueError}
        />
      </main>

      <Footer />
    </>
  );
}
