"use client";

import Image from "next/image";
import type { CartItem } from "@/components/providers/CartProvider";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  const isBeanBox = item.kind === "beanbox";

  return (
    <article className="flex gap-4 border-b border-stone-200 py-6 sm:gap-6">
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-[#EAE2D7] sm:h-36 sm:w-32">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs uppercase tracking-[0.15em] text-[#8A6B55]">
          {isBeanBox ? "BaristaBar BeanBox" : item.category}
        </p>

        <h3 className="mt-2 text-lg font-medium text-[#3B2418]">
          {item.name}
        </h3>

        <p className="mt-1 text-sm text-stone-500">
          {item.price.toFixed(2)} DT / {isBeanBox ? "box" : "unit"}
        </p>

        {isBeanBox && item.contents && (
          <div className="mt-3 rounded-lg bg-[#F8F5F0] p-3">
            {item.configurationLabel && (
              <p className="text-xs font-medium text-[#604331]">
                {item.configurationLabel}
              </p>
            )}

            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6B55]">
              Included in your box
            </p>

            <ul className="mt-2 space-y-1">
              {item.contents.map((content) => (
                <li
                  key={content.id}
                  className="text-sm leading-5 text-stone-600"
                >
                  {content.name}
                  {content.quantityPerBox > 1
                    ? ` × ${content.quantityPerBox}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <div
            className="flex items-center rounded-full border border-stone-300"
            aria-label={`Quantité de ${item.name}`}
          >
            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(item.id, item.quantity - 1)
              }
              disabled={item.quantity <= 1}
              aria-label="Diminuer la quantité"
              className="h-9 w-9 rounded-l-full text-lg text-[#3B2418] hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>

            <span className="min-w-8 text-center text-sm">
              {item.quantity}
            </span>

            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(item.id, item.quantity + 1)
              }
              disabled={item.quantity >= item.stock}
              aria-label="Augmenter la quantité"
              className="h-9 w-9 rounded-r-full text-lg text-[#3B2418] hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <p className="font-semibold text-[#3B2418]">
            {(item.price * item.quantity).toFixed(2)} DT
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="mt-3 w-fit text-xs text-stone-500 underline underline-offset-4 transition-colors hover:text-red-700"
        >
          Remove
        </button>
      </div>
    </article>
  );
}
