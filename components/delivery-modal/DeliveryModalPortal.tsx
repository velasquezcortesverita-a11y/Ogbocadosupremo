"use client";

import { useDeliveryStore } from "@/store/deliveryStore";
import DeliveryModal from "./DeliveryModal";

// Montado en el layout raíz para que el modal esté disponible en toda la app
export function DeliveryModalPortal() {
  const isModalOpen = useDeliveryStore((s) => s.isModalOpen);
  return isModalOpen ? <DeliveryModal /> : null;
}
