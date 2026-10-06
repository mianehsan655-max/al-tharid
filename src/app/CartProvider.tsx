"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CartLine = { id: string; quantity: number };
type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  addItem: (id: string, quantity: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  removeOrderedItems: (purchased: CartLine[]) => void;
};

const STORAGE_KEY = "al-tharid-cart";
const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (line): line is CartLine =>
        typeof line?.id === "string" &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 99
    );
  } catch {
    return [];
  }
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = window.setTimeout(() => {
      setLines(readCart());
      setReady(true);
    }, 0);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(readCart());
    };
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(load);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch { /* The cart remains usable if browser storage is unavailable. */ }
    }
  }, [lines, ready]);

  const addItem = (id: string, quantity: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) {
        return current.map((line) =>
          line.id === id
            ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
            : line
        );
      }
      return [...current, { id, quantity: Math.min(99, Math.max(1, quantity)) }];
    });
  };

  const setQuantity = (id: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) =>
            line.id === id ? { ...line, quantity: Math.min(99, quantity) } : line
          )
    );
  };

  return (
    <CartContext.Provider
      value={{
        lines,
        count: lines.reduce((total, line) => total + line.quantity, 0),
        ready,
        addItem,
        setQuantity,
        clearCart: () => {
          // Persist before navigation so a remount cannot restore the submitted basket.
          try {
            localStorage.setItem(STORAGE_KEY, "[]");
          } catch { /* In-memory clearing still succeeds without browser storage. */ }
          setLines([]);
        },
        removeOrderedItems: (purchased) => setLines((current) => current.flatMap((line) => {
          const ordered = purchased.find((entry) => entry.id === line.id);
          const remaining = line.quantity - (ordered?.quantity ?? 0);
          return remaining > 0 ? [{ ...line, quantity: remaining }] : [];
        })),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
