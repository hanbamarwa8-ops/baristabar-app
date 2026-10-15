import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Coffee Beans",
    image: "/01_Lavazza_Qualita_Oro.png",
    imageAlt: "Café en grains Lavazza Qualità Oro",
  },
  {
    name: "Ground Coffee",
    image: "/09_Lavazza_Qualita_Rossa_250g.png",
    imageAlt: "Café moulu Lavazza Qualità Rossa",
  },
  {
    name: "Coffee Capsules",
    image: "/10_Lavazza_Rossa_Capsules.png",
    imageAlt: "Capsules de café Lavazza",
  },
  {
    name: "Syrups & Flavours",
    image: "/06_Monin_Vanilla.png",
    imageAlt: "Sirop Monin à la vanille",
  },
  {
    name: "Accessories",
    image: "/06_Coffee_Corner_Accessories.png",
    imageAlt: "Accessoires pour préparer le café",
  },
  {
    name: "Coffee Machines",
    image: "/03_DeLonghi_Dedica_White.png",
    imageAlt: "Machine à espresso DeLonghi",
  },
  {
    name: "BeanBox Packs",
    image: "/13_Lavazza_Espresso_Maestro.png",
    imageAlt: "Sélection de cafés pour les packs BeanBox",
  },
  {
    name: "Gift Boxes",
    image: "/12_Nespresso_Volluto_Set.png",
    imageAlt: "Sélection de produits de café à offrir",
  },
];

export function ShopByCategorySection() {
  return (
    <section
      id="shop-by-category"
      className="bg-[#F0E7DE] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24"
      aria-labelledby="shop-category-heading"
    >
      <div className="mx-auto max-w-310">
        {/* Section heading */}
        <div>
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
            Discover coffee, equipment and little pleasures
            for every moment of your coffee ritual.
          </p>
        </div>

        {/* Eight category cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href="/shop"
              aria-label={`Explore ${category.name}`}
              className="group relative isolate block aspect-[3/4] overflow-hidden rounded-[10px] bg-[#D8C6B1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#795A46] focus-visible:ring-offset-4"
            >
              {/* Category image */}
              <Image
                src={category.image}
                alt={category.imageAlt}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                className="object-cover object-center transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
              />

              {/* Bottom gradient */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-[#1C100C]/80 via-[#1C100C]/10 to-transparent transition-colors duration-500 group-hover:from-[#1C100C]/90"
              />

              {/* Category title and hover action */}
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
                  className="mt-4 flex translate-y-2 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F8F2EB] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  aria-hidden="true"
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
