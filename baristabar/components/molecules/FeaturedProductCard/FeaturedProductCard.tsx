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
  image: string;
  href: string;
}

export function FeaturedProductCard({
  name,
  category,
  description,
  price,
  image,
  href,
}: FeaturedProductCardProps) {
  const [added, setAdded] = useState(false);

  return (
    <article className="group flex h-full flex-col">
      {/* Product image */}
      <Link
        href={href}
        aria-label={`Découvrir ${name}`}
        className="relative block aspect-4/5 shrink-0 overflow-hidden
          rounded-[14px] bg-[#F0E8DE]"
      >
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw"
          className="object-cover transition-transform duration-700
            ease-out group-hover:scale-105"
        />

        <span className="absolute left-3 top-3 max-w-[calc(100%-24px)]
          truncate rounded-full bg-[#F8F2EB] px-3 py-1.5
          text-[9px] font-semibold uppercase tracking-[0.12em]
          text-[#3B2418] sm:left-4 sm:top-4 sm:text-[10px]"
        >
          {category}
        </span>
      </Link>

      {/* Product information */}
      <div className="flex flex-1 flex-col pt-4">
        {/* Product name and price */}
        <div className="flex min-h-14 items-start justify-between gap-2">
          <Link
            href={href}
            className="line-clamp-2 min-w-0 flex-1 font-serif
              text-xl leading-7 text-[#3B2418]
              transition-colors hover:text-[#8A6B55]"
          >
            {name}
          </Link>

          <p className="shrink-0 whitespace-nowrap pt-1
            text-[11px] font-semibold text-[#3B2418]
            sm:text-xs"
          >
            {price.toFixed(3)} TND
          </p>
        </div>

        {/* Consistent description height */}
        <p className="mt-2 line-clamp-3 min-h-18
          text-sm leading-6 text-stone-500"
        >
          {description}
        </p>

        {/* Aligned card footer */}
        <div className="mt-auto flex flex-col gap-3 pt-5
          xl:flex-row xl:items-center xl:justify-between"
        >
          <span className="text-[11px] leading-4 text-stone-400">
            Specialty Coffee
          </span>

          <button
            type="button"
            onClick={() => setAdded((current) => !current)}
            aria-pressed={added}
            aria-label={
              added
                ? `Retirer ${name} de la sélection`
                : `Ajouter ${name} au panier`
            }
            className="inline-flex min-h-11 w-full items-center
              justify-center gap-2 whitespace-nowrap rounded-md
              border border-[#8A6B55] px-4 py-2.5
              text-[10px] font-semibold uppercase tracking-widest
              text-[#3B2418] transition-colors
              hover:bg-[#3B2418] hover:text-white
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2
              xl:w-auto xl:min-w-33"
          >
            <Icon name={added ? "check" : "plus"} size={15} />
            {added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
