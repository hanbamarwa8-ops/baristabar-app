"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/atoms/Icon";

interface FeaturedProductCardProps {
  name: string;
  category: string;
  description: string;
  price: number;
  rating?: number;
  image: string;
  href: string;
}

export function FeaturedProductCard({
  name,
  category,
  description,
  price,
  rating,
  image,
  href,
}: FeaturedProductCardProps) {
  const [added, setAdded] = useState(false);

  return (
    <article className="group">
      {/* Product image and category */}
      <Link
        href={href}
        aria-label={`Découvrir ${name}`}
        className="relative block aspect-4/5 overflow-hidden rounded-xl bg-[#F0E8DE]"
      >
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <span className="absolute left-4 top-4 rounded-full bg-[#F8F2EB] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#3B2418]">
          {category}
        </span>
      </Link>

      {/* Product information */}
      <div className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={href}
              className="font-serif text-2xl text-[#3B2418] transition-colors hover:text-[#8A6B55]"
            >
              {name}
            </Link>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              {description}
            </p>
          </div>

          <p className="shrink-0 text-sm font-semibold text-[#3B2418]">
            {price.toFixed(3)} TND
          </p>
        </div>

        {/* Rating: displayed only when available */}
        <div className="mt-4 flex items-center justify-between gap-3">
          {rating !== undefined ? (
            <div
              className="flex items-center gap-1.5 text-sm text-stone-600"
              aria-label={`Note indicative : ${rating} sur 5`}
            >
              <span className="text-[#A77843]" aria-hidden="true">
                ★
              </span>
              <span>{rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-xs text-stone-400">
              Specialty Coffee
            </span>
          )}

          {/* Visual cart interaction for now */}
          <button
            type="button"
            onClick={() => setAdded((current) => !current)}
            aria-pressed={added}
            aria-label={
              added
                ? `Retirer ${name} de la sélection`
                : `Ajouter ${name} au panier`
            }
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#3B2418] px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
          >
            <Icon name={added ? "check" : "plus"} size={15} />
            {added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
