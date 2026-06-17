import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
};

type CartStore = {
  items: CartItem[];

  agregarProducto: (
    producto: Omit<CartItem, "cantidad">
  ) => void;

  eliminarProducto: (id: string) => void;

  limpiarCarrito: () => void;

  total: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregarProducto: (producto) =>
        set((state) => {
          const existente = state.items.find(
            (item) => item.id === producto.id
          );

          if (existente) {
            return {
              items: state.items.map((item) =>
                item.id === producto.id
                  ? {
                      ...item,
                      cantidad: item.cantidad + 1,
                    }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...producto,
                cantidad: 1,
              },
            ],
          };
        }),

      eliminarProducto: (id) =>
        set((state) => ({
          items: state.items.filter(
            (item) => item.id !== id
          ),
        })),

      limpiarCarrito: () =>
        set({
          items: [],
        }),

      total: () =>
        get().items.reduce(
          (acc, item) =>
            acc + item.precio * item.cantidad,
          0
        ),
    }),
    {
      name: "bocado-supremo-cart",
    }
  )
);