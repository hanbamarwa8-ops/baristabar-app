import Image from "next/image";
import Link from "next/link";

const beanBoxPacks = [
  {
    slug: "discovery-box",
    name: "Discovery Box",
    label: "Fixed selection",
    description:
      "Discover three of our Featured coffees in one carefully curated box.",
    details: [
      "Ethiopia Yirgacheffe",
      "House Espresso Blend",
      "Colombia Supremo",
    ],
    image: "/discovery-box-espresso-v2.jpg",
    imageAlt: "Creamy coffee swirls in warm chocolate and caramel tones",
    featured: true,
  },
  {
    slug: "classic-box",
    name: "Classic Box",
    label: "Your everyday ritual",
    description:
      "Choose the Featured coffee that best fits your everyday coffee ritual.",
    details: [
      "Choose one Featured coffee",
      "A simple, personalised selection",
      "One complete box per purchase",
    ],
    image: "/classic2.jpg",
    imageAlt: "Classic Box coffee selection",
    featured: false,
  },
  {
    slug: "barista-box",
    name: "Barista Box",
    label: "Make it your own",
    description:
      "Build a box around your favourite Featured coffee and an available coffee accessory.",
    details: [
      "Choose one Featured coffee",
      "Choose an available accessory",
      "One complete personalised box",
    ],
    image: "/brewing-methods.jpg",
    imageAlt: "Coffee brewing methods",
    featured: false,
  },
  {
    slug: "premium-box",
    name: "Premium Box",
    label: "The complete experience",
    description:
      "Create a richer coffee experience with two different Featured coffees and an accessory or flavour.",
    details: [
      "Choose two different Featured coffees",
      "Choose an accessory or flavour",
      "One complete personalised box",
    ],
    image: "/coffee-origins.jpg",
    imageAlt: "Premium coffee discovery",
    featured: false,
  },
];

export function BeanBoxSection() {
  return (
    <section
      id="beanbox"
      className="scroll-mt-24 bg-[#F8F5F0] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28"
      aria-labelledby="beanbox-heading"
    >
      <div className="mx-auto max-w-310">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
            Your coffee, your ritual
          </p>

          <h2
            id="beanbox-heading"
            className="mt-4 font-serif text-4xl leading-tight tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl"
          >
            Meet your BeanBox.
          </h2>

          <p
            className={
              "mx-auto mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base"
            }
          >
            From your first discovery to your daily ritual, find the box
            that fits your coffee journey. Personalise your selection and
            add the complete box to your bag in one step.
          </p>

          <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#604331]">
            <span aria-hidden="true">✓</span>
            Free delivery is available with a BeanBox.
          </p>
        </div>

        {/* Pack cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {beanBoxPacks.map((pack) => (
            <article
              key={pack.slug}
              className={`flex h-full flex-col overflow-hidden rounded-[10px] border ${
                pack.featured
                  ? "border-[#8A6B55]/60"
                  : "border-[#E5D9CD]"
              }`}
            >
              {/* Pack image */}
              <div className="relative aspect-4/3 overflow-hidden bg-[#EDE2D5]">
                <Image
                  src={pack.image}
                  alt={pack.imageAlt}
                  fill
                  loading={pack.featured ? "eager" : "lazy"}
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out motion-safe:hover:scale-105"
                />

                <span className="absolute left-3 top-3 rounded-full bg-[#F8F2EB] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#3B2418]">
                  {pack.label}
                </span>
              </div>

              {/* Pack information */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-serif text-2xl text-[#3B2418]">
                  {pack.name}
                </h3>

                <p className="mt-3 min-h-18 text-sm leading-6 text-stone-500">
                  {pack.description}
                </p>

                <div className="my-5 h-px bg-[#E9DED3]" />

                <ul className="space-y-3">
                  {pack.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2 text-sm leading-5 text-stone-600"
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
                  href={`/beanbox/${pack.slug}`}
                  className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[5px] border border-[#3B2418] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
                >
                  Discover the box
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-stone-500">
          One-time purchase. Final price is calculated from the products
          included in your selected box. Free delivery throughout Tunisia.
        </p>

        {/* Discovery access */}
        <div className="mt-5 text-center">
          <Link
            href="/discovery"
            className="inline-flex items-center gap-2 border-b border-[#3B2418]/40 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#3B2418] transition-colors hover:border-[#3B2418] hover:text-[#8A6B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-4"
          >
            Explore Discovery
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
