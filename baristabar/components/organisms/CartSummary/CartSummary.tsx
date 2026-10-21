interface CartSummaryProps {
  itemCount: number;
  subtotal: number;
}

export function CartSummary({
  itemCount,
  subtotal,
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
        <span className="font-medium text-[#3B2418]">Subtotal</span>
        <span className="font-semibold text-[#3B2418]">
          {subtotal.toFixed(3)} DT
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-500">
        Free delivery throughout Tunisia. No delivery fee.
      </p>

      <p className="mt-6 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-600">
        Checkout will be available soon.
      </p>
    </aside>
  );
}
