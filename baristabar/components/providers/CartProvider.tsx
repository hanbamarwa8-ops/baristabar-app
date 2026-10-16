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

export interface CartItem extends CartProduct {
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  addToCart: (product: CartProduct) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "baristabar-cart";

const CartContext = createContext<CartContextValue | undefined>(
  undefined
);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore the cart from localStorage on the client.
  useEffect(() => {
    let cancelled = false;

    const restoreCart = () => {
      let restoredItems: CartItem[] = [];

      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
          const parsed: unknown = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            restoredItems = parsed.filter(
              (item): item is CartItem =>
                item !== null &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                typeof item.category === "string" &&
                typeof item.description === "string" &&
                typeof item.image === "string" &&
                typeof item.price === "number" &&
                Number.isFinite(item.price) &&
                item.price >= 0 &&
                typeof item.stock === "number" &&
                Number.isFinite(item.stock) &&
                item.stock >= 0 &&
                Number.isInteger(item.stock) &&
                typeof item.quantity === "number" &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0 &&
                item.quantity <= item.stock
            );
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
    };

    restoreCart();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      console.error("Impossible de sauvegarder le panier.");
    }
  }, [items, hydrated]);

  // Add a product or increase its quantity.
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
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...product,
                quantity: Math.min(
                  item.quantity + 1,
                  product.stock
                ),
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
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
                item.stock
              ),
            },
          ];
        })
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      isHydrated: hydrated,
      addToCart,
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
      removeFromCart,
      updateQuantity,
      clearCart,
    ]
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
      "useCart doit être utilisé à l'intérieur de CartProvider."
    );
  }

  return context;
}