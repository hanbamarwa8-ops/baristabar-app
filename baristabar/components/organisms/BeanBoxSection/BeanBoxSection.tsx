import Image from "next/image";
import Link from "next/link";

const beanBoxPacks = [
  {
    name: "Discovery Box",
    label: "One-time purchase",
    price: "99",
    period: "DT",
    description:
      "Your first step into the world of specialty coffee.",
    details: [
      "3 coffees to discover",
      "V60 dripper and filters",
      "Coffee discovery booklet",
    ],
    image: "/machine-ChP83Bzd.jpg",
    imageAlt: "Café de spécialité pour découvrir de nouvelles saveurs",
    featured: true,
  },
  {
    name: "Classic Box",
    label: "Monthly subscription",
    price: "29",
    period: "/ month",
    description:
      "A carefully selected coffee for your everyday ritual.",
    details: [
      "1 coffee of 250 g each month",
      "Fresh coffee selection",
      "Delivery included",
    ],
    image: "/classic2.jpg",
    imageAlt: "Café espresso pour accompagner le quotidien",
    featured: false,
  },
  {
    name: "Barista Box",
    label: "Monthly subscription",
    price: "49",
    period: "/ month",
    description:
      "Explore new recipes and improve your barista skills at home.",
    details: [
      "1 coffee of 250 g",
      "Accessory or flavour",
      "Step-by-step recipe cards",
    ],
    image: "/brewing-methods.jpg",
    imageAlt: "Différentes méthodes de préparation du café",
    featured: false,
  },
  {
    name: "Premium Box",
    label: "Monthly subscription",
    price: "79",
    period: "/ month",
    description:
      "A complete experience for passionate coffee lovers.",
    details: [
      "2 specialty coffees",
      "1 accessory or flavour",
      "Exclusive coffee content",
    ],
    image: "/coffee-origins.jpg",
    imageAlt: "Découverte des origines du café",
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

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
            From your first discovery to your daily ritual,
            find the box that fits your coffee journey.
          </p>
        </div>

        {/* Pack cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {beanBoxPacks.map((pack) => (
            <article
              key={pack.name}
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

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-serif text-3xl text-[#3B2418]">
                    {pack.price}
                  </span>

                  <span className="text-sm text-stone-500">
                    {pack.period}
                  </span>
                </div>

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
                  href="/shop"
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
          Prices are indicative and displayed in Tunisian dinars (DT).
          Monthly subscriptions can be paused or cancelled.
        </p>
      </div>
    </section>
  );
}
