import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Extra = { nombre: string; precio: number; cantidad?: number };

export type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
  extras?: Extra[];
};

function extrasSum(item: CartItem): number {
  return (item.extras ?? []).reduce((s, e) => s + e.precio * (e.cantidad ?? 1), 0);
}

type CartStore = {
  items: CartItem[];
  agregarProducto: (producto: Omit<CartItem, "cantidad" | "extras">) => void;
  aumentarCantidad: (id: string) => void;
  disminuirCantidad: (id: string) => void;
  eliminarProducto:  (id: string) => void;
  setExtras:         (id: string, extras: Extra[]) => void;
  limpiarCarrito:    () => void;
  total:             () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregarProducto: (producto) =>
        set((state) => {
          const existente = state.items.find((item) => item.id === producto.id);
          if (existente) {
            return {
              items: state.items.map((item) =>
                item.id === producto.id
                  ? { ...item, cantidad: item.cantidad + 1 }
                  : item
              ),
            };
          }
          return {
            items: [...state.items, { ...producto, cantidad: 1, extras: [] }],
          };
        }),

      aumentarCantidad: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
          ),
        })),

      disminuirCantidad: (id) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
            )
            .filter((item) => item.cantidad > 0),
        })),

      eliminarProducto: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      setExtras: (id, extras) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, extras } : item
          ),
        })),

      limpiarCarrito: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (acc, item) => acc + (item.precio + extrasSum(item)) * item.cantidad,
          0
        ),
    }),
    { name: "bocado-supremo-cart" }
  )
);
