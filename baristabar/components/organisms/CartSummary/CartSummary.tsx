import Link from "next/link";

interface CartSummaryProps {
  itemCount: number;
  subtotal: number;
  freeDelivery: boolean;
}

export function CartSummary({
  itemCount,
  subtotal,
  freeDelivery,
}: CartSummaryProps) {
  return (
    <aside className="rounded-xl bg-[#F8F5F0] p-6 sm:p-8">
      <h2 className="text-xl font-medium text-[#3B2418]">
        Order summary
      </h2>

      <div className="mt-6 flex justify-between gap-4 text-sm text-stone-600">
        <span>Items</span>
        <span>{itemCount}</span>
      </div>

      <div className="mt-4 flex justify-between gap-4 border-t border-stone-200 pt-4">
        <span className="font-medium text-[#3B2418]">
          Subtotal
        </span>
        <span className="font-semibold text-[#3B2418]">
          {subtotal.toFixed(2)} DT
        </span>
      </div>

      {freeDelivery ? (
        <p className="mt-4 rounded-lg bg-[#E8DED4] p-3 text-xs leading-relaxed text-[#3B2418]">
          Free delivery throughout Tunisia applies to this order.
        </p>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Free delivery is available with a BeanBox and at least one
          other product, or on orders over 200 DT.
        </p>
      )}

      <Link
        href="/checkout"
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#604331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2"
      >
        Proceed to checkout
        <span aria-hidden="true">→</span>
      </Link>

      <Link
        href="/shop"
        className="mt-4 block text-center text-sm font-medium text-[#8A6B55] hover:text-[#3B2418] hover:underline"
      >
        Continue shopping
      </Link>
    </aside>
  );
}
