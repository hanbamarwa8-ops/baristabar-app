import Image from "next/image";
import Link from "next/link";

export function CoffeeMatchSection() {
  return (
    <section
      className="bg-[#F8F5F0] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24"
      aria-labelledby="coffee-match-heading"
    >
      <div className="mx-auto max-w-310">
        <div className="grid overflow-hidden rounded-[12px] bg-[#fcf8f1] lg:grid-cols-2">
          {/* Text content */}
          <div className="flex flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
              Your personal coffee journey
            </p>

            <h2
              id="coffee-match-heading"
              className="mt-5 max-w-lg font-serif text-4xl leading-[1.08] tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl"
            >
              Find the coffee
              <br />
              <span className="italic">that matches you.</span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-[#6F5A4C] sm:text-base">
              Floral and delicate, rich and chocolatey, or smooth and balanced.
              Discover the coffee styles that fit your taste and your daily ritual.
            </p>

            <Link
              href="/shop"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-4 rounded-[6px] bg-[#3B2418] px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#F8F2EB] transition-colors hover:bg-[#65432F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
            >
              Explore our coffees
              <span aria-hidden="true">→</span>
            </Link>

            <p className="mt-4 text-xs text-[#8A6B55]">
              Your personalized coffee quiz is coming soon.
            </p>
          </div>

          {/* Image */}
          <div className="relative min-h-75 overflow-hidden sm:min-h-95 lg:min-h-125">
            <Image
              src="/brew.jpeg"
              alt="Préparation artisanale d'un café filtre"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover object-center transition-transform duration-700 motion-safe:hover:scale-[1.03]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
