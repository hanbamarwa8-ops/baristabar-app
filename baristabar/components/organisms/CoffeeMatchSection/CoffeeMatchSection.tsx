
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type TasteProfile = "floral" | "chocolate" | "balanced";

const recommendations: Record<
  TasteProfile,
  {
    name: string;
    slug: string;
    description: string;
  }
> = {
  floral: {
    name: "Ethiopia Yirgacheffe",
    slug: "ethiopia-yirgacheffe",
    description:
      "Floral notes, citrus and a delicate light roast.",
  },
  chocolate: {
    name: "House Espresso Blend",
    slug: "house-espresso-blend",
    description:
      "Dark chocolate, caramel and a full-bodied finish.",
  },
  balanced: {
    name: "Colombia Supremo",
    slug: "colombia-supremo",
    description:
      "Red berries, honey and a balanced medium roast.",
  },
};

const tasteOptions: {
  value: TasteProfile;
  label: string;
  description: string;
}[] = [
  {
    value: "floral",
    label: "Floral & citrus",
    description: "Light, delicate and aromatic",
  },
  {
    value: "chocolate",
    label: "Chocolate & caramel",
    description: "Rich, intense and comforting",
  },
  {
    value: "balanced",
    label: "Smooth & balanced",
    description: "Fruity, mellow and versatile",
  },
];

export function CoffeeMatchSection() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedTaste, setSelectedTaste] =
    useState<TasteProfile | null>(null);

  const recommendation = selectedTaste
    ? recommendations[selectedTaste]
    : null;

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

            {/* Existing primary action */}
            <Link
              href="/shop"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-4 rounded-[6px] bg-[#3B2418] px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#F8F2EB] transition-colors hover:bg-[#65432F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
            >
              Explore our coffees
              <span aria-hidden="true">→</span>
            </Link>

            {/* Interactive quiz toggle */}
            <button
              type="button"
              onClick={() => setQuizOpen((open) => !open)}
              aria-expanded={quizOpen}
              aria-controls="coffee-match-quiz"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-3 rounded-[6px] border border-[#8A6B55]/50 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#3B2418] transition-colors hover:border-[#8A6B55] hover:bg-[#F0E7DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
            >
              {quizOpen ? "Close coffee quiz" : "Find my coffee match"}
              <span aria-hidden="true">
                {quizOpen ? "−" : "＋"}
              </span>
            </button>

            {/* Quiz panel */}
            {quizOpen && (
              <div
                id="coffee-match-quiz"
                className="mt-5 w-full max-w-md rounded-lg border border-[#E5D9CD] bg-white/80 p-4 sm:p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
                  Your taste profile
                </p>

                <h3
                  id="coffee-taste-question"
                  className="mt-2 font-serif text-xl leading-snug text-[#3B2418] sm:text-2xl"
                >
                  Which flavours do you enjoy most?
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6F5A4C]">
                  Choose the flavour profile that sounds most appealing to you.
                </p>

                <div
                  className="mt-4 space-y-2"
                  role="group"
                  aria-labelledby="coffee-taste-question"
                >
                  {tasteOptions.map((option) => {
                    const isSelected =
                      selectedTaste === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedTaste(option.value)}
                        className={`flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-1 ${
                          isSelected
                            ? "border-[#8A6B55] bg-[#F0E7DE]"
                            : "border-[#E8DFD5] bg-white hover:border-[#8A6B55]/60 hover:bg-[#FCF8F1]"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium text-[#3B2418]">
                            {option.label}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-[#6F5A4C]">
                            {option.description}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-[#3B2418] bg-[#3B2418] text-white"
                              : "border-[#CDBBAA] bg-white"
                          }`}
                        >
                          {isSelected && (
                            <span className="text-[10px]">✓</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Recommendation */}
                {recommendation && (
                  <div
                    className="mt-5 border-t border-[#E8DFD5] pt-4"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
                      Your coffee match
                    </p>

                    <h4 className="mt-2 font-serif text-xl leading-snug text-[#3B2418]">
                      {recommendation.name}
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-[#6F5A4C]">
                      {recommendation.description}
                    </p>

                    <Link
                      href={`/shop/${recommendation.slug}`}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3B2418] underline decoration-[#8A6B55]/60 underline-offset-4 transition-colors hover:text-[#8A6B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
                    >
                      Discover this coffee
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Original image — unchanged */}
          <div className="relative min-h-75 overflow-hidden sm:min-h-95 lg:min-h-125">
            <Image
              src="/brew.jpeg"
              alt="Préparation artisanale d'un café filtre"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover object-center"            />
          </div>
        </div>
      </div>
    </section>
  );
}
