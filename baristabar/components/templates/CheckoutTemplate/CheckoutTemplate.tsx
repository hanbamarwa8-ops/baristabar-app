"use client";

import Link from "next/link";

import { useCart } from "@/components/providers/CartProvider";

interface CheckoutTemplateProps {
  userEmail: string;
}

export default function CheckoutTemplate({
  userEmail,
}: CheckoutTemplateProps) {
  const { items, itemCount, subtotal, isHydrated } = useCart();

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-6 py-20 text-center">
        <p className="text-sm text-stone-500">
          Loading your bag...
        </p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-6 py-20 text-center text-[#3B2418]">
        <h1 className="font-serif text-3xl">Your bag is empty</h1>

        <p className="mt-3 text-sm text-stone-600">
          Add products to your bag before continuing.
        </p>

        <Link
          href="/shop"
          className="mt-7 inline-flex rounded-full bg-[#3B2418] px-6 py-3 text-sm font-semibold text-white hover:bg-[#604331]"
        >
          Explore the shop
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF8F4] px-5 py-12 text-[#3B2418] sm:px-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cart"
          className="text-sm font-medium text-[#8A6B55] hover:underline"
        >
          ← Back to bag
        </Link>

        <header className="mt-7 border-b border-[#E4D9CE] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
            BaristaBar
          </p>

          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
            Checkout
          </h1>

          <p className="mt-4 text-sm text-stone-600">
            Signed in as{" "}
            <span className="font-medium">{userEmail}</span>
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-label="Order items" className="space-y-4">
            <h2 className="text-xl font-medium">Review your order</h2>

            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[#E4D9CE] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>

                    {item.kind === "beanbox" &&
                      item.configurationLabel && (
                        <p className="mt-2 text-sm text-stone-500">
                          {item.configurationLabel}
                        </p>
                      )}

                    <p className="mt-2 text-sm text-stone-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold">
                    {(item.price * item.quantity).toFixed(2)} DT
                  </p>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-xl bg-white p-6 ring-1 ring-[#E4D9CE]">
            <h2 className="text-xl font-medium">Order summary</h2>

            <div className="mt-5 flex justify-between gap-4 text-sm text-stone-600">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>

            <div className="mt-4 flex justify-between gap-4 border-t border-[#E4D9CE] pt-4">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">
                {subtotal.toFixed(2)} DT
              </span>
            </div>

            <Link
              href="/cart"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#3B2418] px-4 py-3 text-sm font-semibold text-[#3B2418] hover:bg-[#F8F5F0]"
            >
              Edit bag
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}