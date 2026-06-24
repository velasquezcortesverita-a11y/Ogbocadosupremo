import { create } from "zustand";

export type CheckoutPrefill = {
  nombre: string;
  telefono: string;
  comentarios: string;
  metodoPago: string;
  deliveryMethod: "pickup" | "delivery" | null;
  deliveryAddress: string;
};

type CheckoutPrefillStore = {
  prefill: CheckoutPrefill | null;
  setPrefill: (data: CheckoutPrefill) => void;
  clearPrefill: () => void;
};

export const useCheckoutPrefillStore = create<CheckoutPrefillStore>((set) => ({
  prefill: null,
  setPrefill: (data) => set({ prefill: data }),
  clearPrefill: () => set({ prefill: null }),
}));
