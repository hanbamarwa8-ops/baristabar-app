import Image from "next/image";
import Link from "next/link";

import {
  findActiveCategories,
  type CategoryRecord,
} from "@/lib/categories-repository";

export async function ShopByCategorySection() {
  let categories: CategoryRecord[] = [];

  try {
    categories = await findActiveCategories();
  } catch (error) {
    console.error("Unable to load homepage categories:", error);
  }

  const categoryCards = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      href: `/categories/${category.slug}`,
      image: category.image_url || "/coffee-origins.jpg",
      imageAlt: category.name,
    })),
    {
      id: "beanbox-packs",
      name: "BeanBox Packs",
      href: "/#beanbox",
      image: "/13_Lavazza_Espresso_Maestro.png",
      imageAlt: "Coffee selection for BeanBox packs",
    },
  ];

  return (
    <section
      id="shop-by-category"
      className="bg-[#F0E7DE] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24"
      aria-labelledby="shop-category-heading"
    >
      <div className="mx-auto max-w-310">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#795A46] sm:text-xs">
            Shop by category
          </p>

          <h2
            id="shop-category-heading"
            className="mt-4 font-serif text-4xl font-normal leading-[1.08] tracking-[-0.035em] text-[#2E1C15] sm:text-5xl lg:text-6xl"
          >
            Everything for the ritual.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[#795A46] sm:text-base">
            Discover coffee, equipment and little pleasures for every moment of
            your coffee ritual.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryCards.map((category, index) => (
            <Link
              key={category.id}
              href={category.href}
              aria-label={`Explore ${category.name}`}
              className="group relative isolate block aspect-3/4 overflow-hidden rounded-[10px] bg-[#D8C6B1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#795A46] focus-visible:ring-offset-4"
            >
              <Image
                src={category.image}
                alt={category.imageAlt}
                fill
                unoptimized
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                className="object-cover object-center"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-[#1C100C]/80 via-[#1C100C]/10 to-transparent transition-colors duration-500 group-hover:from-[#1C100C]/90"
              />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <h3
                  className="text-[24px] font-normal leading-tight tracking-[-0.02em] text-[#F8F2EB]"
                  style={{
                    fontFamily: "var(--font-brand), Georgia, serif",
                  }}
                >
                  {category.name}
                </h3>

                <span
                  aria-hidden="true"
                  className="mt-4 flex translate-y-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F8F2EB] opacity-100 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100"
                >
                  Explore
                  <span className="text-base">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
