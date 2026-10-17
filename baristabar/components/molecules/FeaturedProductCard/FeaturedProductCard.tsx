"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";

interface FeaturedProductCardProps {
  productId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  href: string;
  stock: number;
  loading?: "eager" | "lazy";
}
const baristaBarProducts = [
  "ethiopia yirgacheffe",
  "house espresso blend",
  "colombia supremo",
  "brazilian santos",
  "brazilian signature blend",
  "tunisian coffee blend",
];

export function FeaturedProductCard({
  productId,
  name,
  category,
  description,
  price,
  image,
  href,
  stock,
  loading = "lazy",
}: FeaturedProductCardProps) {
  const { addToCart } = useCart();
  const isBaristaBarProduct = baristaBarProducts.includes(
    name.trim().toLowerCase()
  );
  const [added, setAdded] = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  function handleAddToCart() {
    if (stock <= 0) return;

    addToCart({
      id: productId,
      name,
      category,
      description,
      price,
      image,
      stock,
    });

    setAdded(true);

    if (feedbackTimer.current !== null) {
      clearTimeout(feedbackTimer.current);
    }

    feedbackTimer.current = setTimeout(() => {
      setAdded(false);
      feedbackTimer.current = null;
    }, 1500);
  }

  return (
    <article className="group flex h-full flex-col">
      <Link
        href={href}
        aria-label={`Découvrir ${name}`}
        className="block"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-[14px] bg-[#EAE2D7]">
          <Image
            src={image}
            alt={name}
            fill
            loading={loading}
            sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 22vw, 18vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-[#F8F5F0]/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3B2418]">
            {isBaristaBarProduct ? "Specialty Coffee" : category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-medium leading-snug text-[#3B2418] transition-colors group-hover:text-[#8A6B55]">
              {name}
            </h3>
          </Link>

          <p className="shrink-0 text-sm font-semibold text-[#3B2418]">
            {price.toFixed(2)} DT
          </p>
        </div>

        <p className="mt-2 line-clamp-3 min-h-18 text-sm leading-relaxed text-[#76675D]">
          {description}
        </p>

        <div className="mt-auto pt-5">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A6B55]">
            Specialty Coffee
          </p>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={stock <= 0}
            className="w-full rounded-full border border-[#3B2418] px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#3B2418] transition-colors duration-300 hover:bg-[#3B2418] hover:text-white disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 disabled:hover:bg-transparent disabled:hover:text-stone-400"
          >
            {stock <= 0
              ? "Out of stock"
              : added
                ? "Added to cart ✓"
                : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}