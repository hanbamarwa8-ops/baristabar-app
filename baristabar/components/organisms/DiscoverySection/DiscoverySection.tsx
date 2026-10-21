import { DiscoveryCard } from "@/components/molecules/DiscoveryCard/DiscoveryCard";

const discoveries = [
  {
    number: "01",
    title: "Coffee Origins",
    description:
      "Explore exceptional beans, unique origins and the stories behind every cup.",
    image: "/coffee-origins.jpg",
    imageAlt: "Grains de café fraîchement torréfiés",
    href: "/coffee-origins",
  },
  {
    number: "02",
    title: "Brewing Rituals",
    description:
      "Discover brewing techniques that bring out the best in every coffee.",
    image: "/brewing-methods.jpg",
    imageAlt: "Préparation artisanale d'un café filtre",
    href: "/discovery",
  },
  {
    number: "03",
    title: "Coffee Recipes",
    description:
      "Find inspiration for delicious coffee drinks and moments worth sharing.",
    image: "/coffee-recipes.jpg",
    imageAlt: "Boisson au café préparée avec soin",
    href: "/recipes",
  },
];

export function DiscoverySection() {
  return (
    <section
      id="discover"
      className="scroll-mt-24 bg-[#F8F5F0] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28"
      aria-labelledby="discovery-heading"
    >
      <div className="mx-auto max-w-310">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:items-end md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
              The BaristaBar experience
            </p>

            <h2
              id="discovery-heading"
              className="mt-4 max-w-xl font-serif text-4xl leading-[1.08] tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl"
            >
              More than coffee.
              <br />
              <span className="italic">A daily ritual.</span>
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 md:grid-cols-2 lg:grid-cols-3">
          {discoveries.map((item) => (
            <DiscoveryCard key={item.number} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
