"use client";

import Link from "next/link";
import { CartItemRow } from "@/components/molecules/CartItemRow/CartItemRow";
import { CartSummary } from "@/components/organisms/CartSummary/CartSummary";
import { useCart } from "@/components/providers/CartProvider";

export default function CartTemplate() {
  const {
    items,
    itemCount,
    subtotal,
    removeFromCart,
    updateQuantity,
    isHydrated,
  } = useCart();

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-white px-6 py-20 text-center">
        <p className="text-sm text-stone-500">
          Loading your cart...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/shop"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6B55] hover:text-[#3B2418]"
        >
          ← Continue shopping
        </Link>

        <div className="mt-8 border-b border-stone-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
            Your selection
          </p>

          <h1 className="mt-3 text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl">
            Your shopping bag
          </h1>

          <p className="mt-3 text-sm text-stone-500">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your bag
          </p>
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-2xl font-medium text-[#3B2418]">
              Your bag is empty
            </h2>

            <p className="mt-3 text-sm text-stone-500">
              Discover your next favourite coffee.
            </p>

            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-[#3B2418] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#684733]"
            >
              Explore the shop
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            <section aria-label="Cart items">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))}
            </section>

            <div>
              <CartSummary
                itemCount={itemCount}
                subtotal={subtotal}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
