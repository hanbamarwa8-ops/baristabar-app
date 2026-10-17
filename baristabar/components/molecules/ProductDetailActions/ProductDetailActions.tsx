"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  useCart,
  type CartProduct,
} from "@/components/providers/CartProvider";

interface ProductDetailActionsProps {
  product: CartProduct;
}

export function ProductDetailActions({
  product,
}: ProductDetailActionsProps) {
  const { addToCart } = useCart();
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
    if (product.stock <= 0) return;

    addToCart(product);
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
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={product.stock <= 0}
        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#3B2418] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-300 hover:bg-[#684733] disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {product.stock <= 0
          ? "Out of stock"
          : added
            ? "Added to cart ✓"
            : "Add to cart"}
      </button>

      <Link
        href="/cart"
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#3B2418]/30 px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#3B2418] transition-colors hover:bg-[#E8DED4]"
      >
        View cart
      </Link>
    </div>
  );
}