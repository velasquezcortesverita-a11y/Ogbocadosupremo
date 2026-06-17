"use client";

import { X, MapPin, Bike, Search, Locate } from "lucide-react";
import { useDeliveryStore, type DeliveryMethod } from "@/store/deliveryStore";
import { cn } from "@/lib/utils/cn";

// Sucursales fijas hasta integrar Supabase
const BRANCHES = [
  { id: 1, name: "Bocado Supremo — Escazú", address: "Plaza Tempo, Escazú, San José" },
  { id: 2, name: "Bocado Supremo — San Pedro", address: "C.C. Los Yoses, San José" },
];

// Opciones del toggle con su ícono y etiqueta
type MethodOption = {
  value: DeliveryMethod;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const METHOD_OPTIONS: MethodOption[] = [
  { value: "pickup",   label: "Pickup",   Icon: MapPin },
  { value: "delivery", label: "Delivery", Icon: Bike   },
];

export default function DeliveryModal() {
  const { isModalOpen, closeModal, onConfirm, selectedMethod, setMethod, address, setAddress } =
    useDeliveryStore();

  // No renderizar nada si el modal está cerrado
  if (!isModalOpen) return null;

  // Solicita la ubicación actual del navegador y la coloca en el input
  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        // Si el usuario rechaza el permiso, no hacemos nada
      }
    );
  }

  // Al hacer clic en una sucurencia de sucursal, rellena el input
  function handleBranchSelect(branchAddress: string) {
    setAddress(branchAddress);
  }

  return (
    // Overlay oscuro — clic fuera cierra el modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={closeModal}
    >
      {/* Contenedor del modal — detiene la propagación para no cerrar al hacer clic dentro */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        {/* Título */}
        <h2 className="mb-1 text-xl font-bold text-neutral-900">¿Cómo quieres recibir tu pedido?</h2>
        <p className="mb-5 text-sm text-neutral-500">Elige una opción para continuar</p>

        {/* Toggle Pickup / Delivery */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = selectedMethod === value;
            return (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 py-5 px-3 transition-all",
                  isActive
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                )}
              >
                <Icon size={26} className={cn(isActive ? "text-orange-500" : "text-neutral-400")} />
                <span className={cn("text-sm font-semibold", isActive ? "text-orange-600" : "text-neutral-600")}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input de dirección con geolocalización */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            {selectedMethod === "pickup" ? "Buscar sucursal" : "Dirección de entrega"}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
            <Search size={16} className="shrink-0 text-neutral-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={
                selectedMethod === "pickup"
                  ? "Buscar por zona o nombre..."
                  : "Ingresa tu dirección..."
              }
              className="flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            />
            {/* Botón de geolocalización — solo relevante en modo delivery */}
            {selectedMethod === "delivery" && (
              <button
                onClick={handleGeolocate}
                title="Usar mi ubicación actual"
                className="shrink-0 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-orange-100 hover:text-orange-500"
              >
                <Locate size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de sucursales como sugerencias */}
        <ul className="mb-6 divide-y divide-neutral-100 rounded-xl border border-neutral-100 overflow-hidden">
          {BRANCHES.filter((b) =>
            address.trim() === ""
              ? true
              : b.name.toLowerCase().includes(address.toLowerCase()) ||
                b.address.toLowerCase().includes(address.toLowerCase())
          ).map((branch) => (
            <li key={branch.id}>
              <button
                onClick={() => handleBranchSelect(branch.address)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50"
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">{branch.name}</p>
                  <p className="text-xs text-neutral-500">{branch.address}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* Botón de confirmación — ejecuta el callback del contexto que abrió el modal */}
        <button
          onClick={() => { onConfirm?.(); closeModal(); }}
          disabled={address.trim() === ""}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all",
            address.trim() !== ""
              ? "bg-neutral-900 hover:bg-neutral-700 active:scale-95"
              : "cursor-not-allowed bg-neutral-300"
          )}
        >
          Comenzar
        </button>
      </div>
    </div>
  );
}
