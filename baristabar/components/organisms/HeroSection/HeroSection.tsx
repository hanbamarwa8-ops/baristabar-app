import Image from "next/image";
import { HeroActions } from "@/components/molecules/HeroActions";

export function HeroSection() {
  return (
    <section
      className="relative isolate flex min-h-140 items-center
        overflow-hidden bg-[#1C100C] sm:min-h-155
        lg:min-h-[calc(100svh-72px)]"
    >
      {/* Animated background image */}
      <Image
        src="/hero-coffee.jpeg"
        alt="Grains de café torréfiés dans une lumière chaleureuse"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center
          motion-safe:animate-[hero-zoom_24s_ease-in-out_infinite_alternate]"
      />

      {/* Dark overlay for text readability */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r
          from-[#1C100C]/95 via-[#1C100C]/75 to-[#1C100C]/15"
      />

      {/* Static content */}
      <div
        className="relative z-10 mx-auto w-full max-w-360
          px-6 py-20 sm:px-10 lg:px-16 lg:py-24"
      >
        <div className="max-w-4xl">
          <p
            className="mb-7 text-[11px] font-semibold uppercase
              tracking-[0.24em] text-[#D6BDA7] sm:text-xs"
          >
            Specialty Coffee <span className="mx-1.5">·</span>
            Roasted Weekly
          </p>

          <h1
            className="font-serif text-5xl leading-[0.98]
              tracking-[-0.045em] text-[#F8F2EB]
              sm:text-6xl md:text-7xl lg:text-[88px]"
          >
            Simple. Fresh.
            <br />
            <span className="font-normal italic">
              Exceptional.
            </span>
          </h1>

          <p
            className="mt-7 max-w-md text-base leading-7
              text-[#E4D7CE] sm:text-lg"
          >
            Discover exceptional coffee, carefully selected
            and roasted for your taste.
          </p>

          <HeroActions />
        </div>
      </div>
    </section>
  );
}
