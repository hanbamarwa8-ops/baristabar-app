import Link from "next/link";

import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer/Footer";

interface ComingSoonTemplateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ComingSoonTemplate({
  eyebrow,
  title,
  description,
}: ComingSoonTemplateProps) {
  return (
    <>
      <Navbar />

      <main className="flex min-h-[70vh] flex-col bg-[#FBF8F4]">
        <section className="flex flex-1 items-center justify-center px-6 py-20 sm:px-10 sm:py-24 lg:px-16">
          <div className="mx-auto w-full max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8A6B55] sm:text-xs">
              {eyebrow}
            </p>

            <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight text-[#3B2418] sm:text-5xl lg:text-6xl">
              {title}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
              {description}
            </p>

            <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full border border-[#E4D9CE] bg-white px-4 py-2.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-[#8A6B55]"
              />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#604331]">
                Coming soon
              </span>
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#3B2418] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#604331]"
              >
                Explore the shop
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8C8BA] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-[#3B2418] transition-colors hover:border-[#3B2418] hover:bg-white"
              >
                Back to home
              </Link>
            </div>

            <div
              aria-hidden="true"
              className="mx-auto mt-12 h-px w-16 bg-[#D6BDA7]"
            />

            <p className="mt-5 text-xs tracking-[0.08em] text-stone-400">
              GOOD COFFEE. BETTER MOMENTS.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}