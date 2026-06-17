import { create } from "zustand";

// Tipo union para los dos métodos de entrega disponibles
export type DeliveryMethod = "pickup" | "delivery";

// Forma completa del estado + acciones del store
export type DeliveryState = {
  isModalOpen: boolean;
  selectedMethod: DeliveryMethod;
  address: string;
  // Callback registrado por la página que abre el modal; se ejecuta al confirmar
  onConfirm: (() => void) | null;

  // Acciones
  openModal: () => void;
  closeModal: () => void;
  setMethod: (method: DeliveryMethod) => void;
  setAddress: (address: string) => void;
  setOnConfirm: (fn: (() => void) | null) => void;
};

export const useDeliveryStore = create<DeliveryState>((set) => ({
  // Estado inicial
  isModalOpen: false,
  selectedMethod: "pickup",
  address: "",
  onConfirm: null,

  // Abre el modal de selección de entrega
  openModal: () => set({ isModalOpen: true }),

  // Cierra el modal, limpia dirección y descarta el callback
  closeModal: () => set({ isModalOpen: false, address: "", onConfirm: null }),

  // Cambia entre pickup y delivery
  setMethod: (method) => set({ selectedMethod: method }),

  // Actualiza la dirección escrita por el usuario
  setAddress: (address) => set({ address }),

  // Registra qué ejecutar cuando el usuario confirma el método de entrega
  setOnConfirm: (fn) => set({ onConfirm: fn }),
}));
