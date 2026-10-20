
import Link from "next/link";
import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";

export default function CoffeeOriginsPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-hidden bg-[#FBF8F4] text-[#3B2418]">
        <section className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1fr_0.85fr] lg:gap-20 lg:px-16 lg:py-20">
          {/* LEFT: ARTICLE */}
          <article className="order-2 lg:order-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#997254]">
              The story behind every cup
            </p>

            <h1 className="mt-5 font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">
              Every bean
              <br />
              has a <span className="italic text-[#997254]">story.</span>
            </h1>

            <p className="mt-7 max-w-lg text-sm leading-7 text-[#79685D] sm:text-base sm:leading-8">
              Coffee is more than a morning ritual. Behind every cup lies a
              journey shaped by nature, tradition, and craftsmanship. From
              the coffee fruit growing on a branch to the aroma of a freshly
              brewed cup, every stage contributes to a unique experience.
            </p>

            <div className="mt-8 max-w-lg border-t border-[#E8DED3] pt-7">
              <h2 className="font-serif text-2xl leading-snug sm:text-3xl">
                Where every journey begins
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#79685D] sm:text-base sm:leading-8">
                It all begins with the coffee cherry. Hidden inside this small
                fruit are the beans that will eventually become our favourite
                drink. The growing environment, harvesting, and processing all
                help shape the character of the coffee.
              </p>
            </div>

            <div className="mt-7 max-w-lg">
              <h2 className="font-serif text-2xl leading-snug sm:text-3xl">
                From the bean to your cup
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#79685D] sm:text-base sm:leading-8">
                After harvesting, the beans continue their journey through
                preparation, roasting, and brewing. Each step brings out
                different aromas and flavours, turning a simple ingredient
                into a moment worth slowing down for.
              </p>
            </div>

            <blockquote className="mt-7 border-l-2 border-[#C5A487] pl-5">
              <p className="font-serif text-lg italic leading-relaxed text-[#76543D]">
                Every cup tells a story of its origin, its journey, and the
                hands that helped bring it to life.
              </p>
            </blockquote>

            <Link
              href="/categories/coffee-beans"
              className="mt-9 inline-flex items-center gap-4 rounded-full bg-[#3B2418] px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331]"
            >
              Explore our coffee beans
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          {/* RIGHT: VIDEO */}
          <div className="order-1 flex justify-center lg:order-2 lg:translate-y-3 lg:justify-end">
            <div className="relative w-full max-w-97.5">
              {/* Decorative background frame */}
              <div className="absolute -inset-3 -rotate-2 rounded-[2rem] bg-[#E9DED1]" />

              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[#261910] shadow-2xl shadow-[#3B2418]/15">
                <video
                  className="aspect-9/13 w-full object-cover"
                  autoPlay
                  loop
                  muted
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Coffee Origins: from coffee fruit to freshly brewed coffee"
                >
                  <source
                    src="/Coffee-Origins.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support HTML video.
                </video>

                <div className="flex items-center justify-between gap-4 bg-[#3B2418] px-5 py-4 text-[#F7F0E8]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C7A98D]">
                      BaristaBar film
                    </p>
                    <p className="mt-1 font-serif text-lg">
                      From bean to cup
                    </p>
                  </div>

                  <span className="text-xl" aria-hidden="true">
                    ✳
                  </span>
                </div>
              </div>

              <p className="mt-5 text-center text-[10px] uppercase tracking-[0.22em] text-[#9A8574]">
                Discover the journey · Savour the moment
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
