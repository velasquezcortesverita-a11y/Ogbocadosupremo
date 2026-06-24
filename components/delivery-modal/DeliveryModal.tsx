"use client";

import { useState } from "react";
import { X, MapPin, Bike, Search } from "lucide-react";
import { useDeliveryStore, type DeliveryMethod } from "@/store/deliveryStore";
import { cn } from "@/lib/utils/cn";

const SUCURSAL = {
  nombre: "Bocado Supremo — Atenas",
  linea1: "700 m este de la Y, Santa Eulalia",
  linea2: "Atenas, Alajuela, 20507",
};

const ZONAS = [
  "Atenas Centro",
  "Santa Eulalia",
  "Jesús",
  "Mercedes",
  "San Isidro",
  "Concepción",
  "San José (Atenas)",
  "Escobal",
  "Morazán",
];

type MethodOption = {
  value: DeliveryMethod;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const METHOD_OPTIONS: MethodOption[] = [
  { value: "pickup",   label: "Pickup",   Icon: MapPin },
  { value: "delivery", label: "Delivery", Icon: Bike   },
];

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm " +
  "text-neutral-800 outline-none placeholder:text-neutral-400 " +
  "focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all";

export default function DeliveryModal() {
  const { isModalOpen, closeModal, onConfirm, selectedMethod, setMethod, address, setAddress } =
    useDeliveryStore();

  const [busqueda,       setBusqueda]       = useState(
    selectedMethod === "delivery" && address ? address : ""
  );
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);
  const [direccionExacta,  setDireccionExacta]  = useState("");
  const [referencia,       setReferencia]        = useState("");

  if (!isModalOpen) return null;

  // ── Derivados para la lista de zonas ────────────────────────────────────────
  const zonasFiltradas = ZONAS.filter((z) =>
    z.toLowerCase().includes(busqueda.toLowerCase())
  );
  const esCoincidenciaExacta = ZONAS.some(
    (z) => z.toLowerCase() === busqueda.trim().toLowerCase()
  );
  const mostrarOpcionPersonalizada = busqueda.trim() !== "" && !esCoincidenciaExacta;

  // ── Habilitación del botón ───────────────────────────────────────────────────
  const puedeComenzar =
    selectedMethod === "pickup" ||
    (zonaSeleccionada !== null && direccionExacta.trim() !== "") ||
    (zonaSeleccionada === null && address.trim() !== "");

  // ── Manejadores ─────────────────────────────────────────────────────────────
  function handleCambiarMetodo(metodo: DeliveryMethod) {
    setMethod(metodo);
    setAddress("");
    setBusqueda("");
    setZonaSeleccionada(null);
    setDireccionExacta("");
    setReferencia("");
  }

  function handleSeleccionarZona(zona: string) {
    setZonaSeleccionada(zona);
    setDireccionExacta("");
    setReferencia("");
  }

  function handleCambiarZona() {
    setZonaSeleccionada(null);
    setDireccionExacta("");
    setReferencia("");
    setBusqueda("");
    setAddress("");
  }

  function handleConfirmar() {
    if (selectedMethod === "pickup") {
      setAddress(`${SUCURSAL.nombre} · ${SUCURSAL.linea1}, ${SUCURSAL.linea2}`);
    } else if (zonaSeleccionada) {
      const partes = [zonaSeleccionada, direccionExacta.trim(), referencia.trim()].filter(Boolean);
      setAddress(partes.join(" · "));
    }
    // Si es dirección personalizada, address ya está en el store
    onConfirm?.();
    closeModal();
  }

  // ── Estilos inline para la transición lista ↔ campos ────────────────────────
  const listStyle: React.CSSProperties = {
    maxHeight: zonaSeleccionada ? 0 : "400px",
    opacity:   zonaSeleccionada ? 0 : 1,
    overflow:  "hidden",
    transition: "max-height 200ms ease, opacity 200ms ease",
    pointerEvents: zonaSeleccionada ? "none" : "auto",
  };

  const cardStyle: React.CSSProperties = {
    maxHeight: !zonaSeleccionada ? 0 : "400px",
    opacity:   !zonaSeleccionada ? 0 : 1,
    overflow:  "hidden",
    transition: "max-height 200ms ease, opacity 200ms ease",
    pointerEvents: !zonaSeleccionada ? "none" : "auto",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cierre */}
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        {/* Título */}
        <h2 className="mb-1 text-xl font-bold text-neutral-900">
          ¿Cómo quieres recibir tu pedido?
        </h2>
        <p className="mb-5 text-sm text-neutral-500">Elige una opción para continuar</p>

        {/* Toggle Pickup / Delivery */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = selectedMethod === value;
            return (
              <button
                key={value}
                onClick={() => handleCambiarMetodo(value)}
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

        {/* ── PICKUP: tarjeta única ── */}
        {selectedMethod === "pickup" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <MapPin size={18} className="mt-0.5 shrink-0 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{SUCURSAL.nombre}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{SUCURSAL.linea1}</p>
              <p className="text-xs text-neutral-500">{SUCURSAL.linea2}</p>
            </div>
          </div>
        )}

        {/* ── DELIVERY ── */}
        {selectedMethod === "delivery" && (
          <div className="mb-6">

            {/* Vista 1: buscador + lista de zonas */}
            <div style={listStyle}>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                <Search size={16} className="shrink-0 text-neutral-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setAddress("");
                  }}
                  placeholder="Buscar zona o ingresar dirección..."
                  className="flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                />
              </div>

              <ul className="max-h-52 overflow-y-auto divide-y divide-neutral-100 rounded-xl border border-neutral-100 overflow-hidden">
                {zonasFiltradas.map((zona) => (
                  <li key={zona}>
                    <button
                      onClick={() => handleSeleccionarZona(zona)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-orange-50"
                    >
                      <MapPin size={14} className="shrink-0 text-neutral-400" />
                      {zona}
                    </button>
                  </li>
                ))}

                {mostrarOpcionPersonalizada && (
                  <li>
                    <button
                      onClick={() => setAddress(busqueda.trim())}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                        address === busqueda.trim()
                          ? "bg-orange-50 font-medium text-orange-600"
                          : "text-neutral-500 hover:bg-orange-50"
                      )}
                    >
                      <MapPin size={14} className="shrink-0 text-neutral-400" />
                      <span>
                        Usar esta dirección:{" "}
                        <span className="font-medium text-neutral-800">{busqueda.trim()}</span>
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Vista 2: tarjeta de zona + campos de dirección */}
            <div style={cardStyle}>
              {/* Tarjeta de zona seleccionada */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-orange-400 bg-[#fff7f0] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="shrink-0 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700">
                    {zonaSeleccionada}
                  </span>
                </div>
                <button
                  onClick={handleCambiarZona}
                  className="text-xs font-medium text-orange-500 hover:text-orange-700 transition-colors ml-3 shrink-0"
                >
                  Cambiar
                </button>
              </div>

              {/* Campo: Dirección exacta */}
              <div className="mb-3">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Dirección exacta
                </label>
                <input
                  type="text"
                  value={direccionExacta}
                  onChange={(e) => setDireccionExacta(e.target.value)}
                  placeholder="Ej: 100m norte de la iglesia..."
                  className={inputCls}
                />
              </div>

              {/* Campo: Referencia */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Referencia{" "}
                  <span className="font-normal text-neutral-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: Casa blanca, portón negro..."
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Botón confirmar */}
        <button
          onClick={handleConfirmar}
          disabled={!puedeComenzar}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all",
            puedeComenzar
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
