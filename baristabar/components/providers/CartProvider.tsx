"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  stock: number;
}

export interface CartBoxContent {
  id: string;
  slug: string;
  name: string;
  quantityPerBox: number;
  unitPrice: number;
  image: string;
}

export interface CartBoxProduct extends CartProduct {
  kind: "beanbox";
  boxSlug: string;
  configurationLabel: string;
  contents: CartBoxContent[];
}

export interface CartItem extends CartProduct {
  quantity: number;
  kind?: "product" | "beanbox";
  boxSlug?: string;
  configurationLabel?: string;
  contents?: CartBoxContent[];
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  addToCart: (product: CartProduct) => void;
  addBoxToCart: (box: CartBoxProduct) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "baristabar-cart";

const CartContext = createContext<CartContextValue | undefined>(
  undefined,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidBoxContent(value: unknown): value is CartBoxContent {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.image === "string" &&
    typeof value.quantityPerBox === "number" &&
    Number.isInteger(value.quantityPerBox) &&
    value.quantityPerBox > 0 &&
    typeof value.unitPrice === "number" &&
    Number.isFinite(value.unitPrice) &&
    value.unitPrice >= 0
  );
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;

  const commonFieldsAreValid =
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.description === "string" &&
    typeof value.image === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    typeof value.stock === "number" &&
    Number.isInteger(value.stock) &&
    value.stock >= 0 &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    value.quantity <= value.stock;

  if (!commonFieldsAreValid) return false;

  if (
    value.kind !== undefined &&
    value.kind !== "product" &&
    value.kind !== "beanbox"
  ) {
    return false;
  }

  if (value.kind === "beanbox") {
    return (
      typeof value.boxSlug === "string" &&
      typeof value.configurationLabel === "string" &&
      Array.isArray(value.contents) &&
      value.contents.length > 0 &&
      value.contents.every(isValidBoxContent)
    );
  }

  return true;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved cart on the client.
  useEffect(() => {
    let cancelled = false;
    let restoredItems: CartItem[] = [];

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          restoredItems = parsed.filter(isValidCartItem);
        }
      }
    } catch {
      console.error("Impossible de restaurer le panier.");
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setItems(restoredItems);
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Save products and configured boxes together.
  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      console.error("Impossible de sauvegarder le panier.");
    }
  }, [items, hydrated]);

  // Existing behaviour for individual products.
  const addToCart = useCallback((product: CartProduct) => {
    if (
      !product.id ||
      !Number.isFinite(product.price) ||
      product.price < 0 ||
      !Number.isInteger(product.stock) ||
      product.stock <= 0
    ) {
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === product.id && item.kind !== "beanbox",
      );

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.id === product.id && item.kind !== "beanbox"
            ? {
                ...item,
                ...product,
                kind: "product",
                quantity: Math.min(
                  item.quantity + 1,
                  product.stock,
                ),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          kind: "product",
          quantity: 1,
        },
      ];
    });
  }, []);

  // A configured BeanBox is one cart line, not separate product lines.
  const addBoxToCart = useCallback((box: CartBoxProduct) => {
    const validBox =
      Boolean(box.id.trim()) &&
      Boolean(box.boxSlug.trim()) &&
      Boolean(box.name.trim()) &&
      Boolean(box.configurationLabel.trim()) &&
      Number.isFinite(box.price) &&
      box.price >= 0 &&
      Number.isInteger(box.stock) &&
      box.stock > 0 &&
      Array.isArray(box.contents) &&
      box.contents.length > 0 &&
      box.contents.every(isValidBoxContent);

    if (!validBox) return;

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === box.id && item.kind === "beanbox",
      );

      if (existingItem) {
        if (existingItem.quantity >= box.stock) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.id === box.id && item.kind === "beanbox"
            ? {
                ...box,
                quantity: Math.min(
                  item.quantity + 1,
                  box.stock,
                ),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          ...box,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    );
  }, []);

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (!Number.isFinite(quantity)) return;

      setItems((currentItems) =>
        currentItems.flatMap((item) => {
          if (item.id !== id) return [item];
          if (quantity <= 0) return [];

          return [
            {
              ...item,
              quantity: Math.min(
                Math.floor(quantity),
                item.stock,
              ),
            },
          ];
        }),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // A box counts as one item regardless of its internal contents.
  const itemCount = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      isHydrated: hydrated,
      addToCart,
      addBoxToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      hydrated,
      addToCart,
      addBoxToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error(
      "useCart doit être utilisé à l'intérieur de CartProvider.",
    );
  }

  return context;
}
