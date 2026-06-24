"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Leaf, Clock, Tag, MapPin,
  UtensilsCrossed,
  Flame, ShoppingBag,
} from "lucide-react";
import HorarioBadge from "@/components/HorarioBadge";
import HorarioCerradoModal from "@/components/HorarioCerradoModal";
import { useCartStore } from "@/store/carstore";
import { supabase } from "@/lib/supabase";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

// ─── Datos ───────────────────────────────────────────────────────────────────

const CHIPS: { Icon: IconComponent; label: string }[] = [
  { Icon: Leaf,  label: "Ingredientes frescos" },
  { Icon: Clock, label: "Listo en 25 min"      },
  { Icon: Tag,   label: "Sin comisión"          },
];

const CATEGORIAS = [
  { emoji: "🍔", label: "Hamburguesas",         href: "/menu?c=hamburguesas"        },
  { emoji: "🍔", label: "Hamburguesas Premium", href: "/menu?c=hamburguesas-premium" },
  { emoji: "🌮", label: "Antojitos",            href: "/menu?c=antojitos"            },
  { emoji: "🍗", label: "Pollo",                href: "/menu?c=pollo"                },
  { emoji: "📦", label: "Súper Combos",         href: "/menu?c=super-combos"         },
  { emoji: "⚽", label: "Combos Futboleros",    href: "/menu?c=combos-futboleros"    },
  { emoji: "🍗", label: "Combos de Pollo",      href: "/menu?c=combos-de-pollo"      },
  { emoji: "🥤", label: "Bebidas",              href: "/menu?c=bebidas"              },
];

const PROPUESTAS: { Icon: IconComponent; titulo: string; texto: string }[] = [
  {
    Icon: Flame,
    titulo: "Ingredientes frescos",
    texto: "Carne angus, vegetales del día y salsas artesanales.",
  },
  {
    Icon: Clock,
    titulo: "Listo en 25 min",
    texto: "Preparamos tu pedido al momento, sin demoras.",
  },
  {
    Icon: ShoppingBag,
    titulo: "Fácil de pedir",
    texto: "Selecciona, personaliza y confirma en segundos.",
  },
];

// ─── Redes sociales ──────────────────────────────────────────────────────────

const INSTAGRAM_URL = "https://www.instagram.com/bocadosupremo?igsh=MXA2dnhmN252ZHprcA==";
const FACEBOOK_URL  = "https://www.facebook.com/share/1QPhTJ4qSL/?mibextid=wwXIfr";

// ─── Tokens glass para secciones inferiores ──────────────────────────────────

const GLASS_CAT: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const GLASS_PROP: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const GLASS_CTA: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
};

const ICON_BG: React.CSSProperties = {
  background: "rgba(249,115,22,0.15)",
};

// ─── Producto del mes ─────────────────────────────────────────────────────────
// Actualizar `id` con el UUID real del producto en Supabase → tabla productos
const PRODUCTO_DEL_MES = {
  id:          "00000000-0000-0000-0000-000000000000",
  nombre:      "Bocado Supremo",
  descripcion: "Doble carne, queso fundido y salsa especial de la casa",
  precio:      5500,
  imagen:      "",
};

// ─── Página ──────────────────────────────────────────────────────────────────

export default function Home() {
  const agregarProducto = useCartStore((s) => s.agregarProducto);
  const [imagenPDM,     setImagenPDM]     = useState<string>("");
  const [pdmDisponible, setPdmDisponible] = useState<boolean>(true);

  useEffect(() => {
    supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", "producto_del_mes_imagen")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.valor) setImagenPDM(data.valor);
      });

    // Verificar si el PDM está marcado como agotado
    supabase
      .from("productos")
      .select("disponible")
      .eq("id", PRODUCTO_DEL_MES.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data !== null) setPdmDisponible(data.disponible ?? true);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#141414]">

      {/* Modal de horario — solo aparece cuando el local está cerrado */}
      <HorarioCerradoModal />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[calc(100vh-4rem)] px-4 py-20 overflow-hidden">

        {/* Glow naranja sutil en la parte superior */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(ellipse at 50% 0%, rgba(180,60,0,0.40) 0%, rgba(10,5,0,0) 65%)",
              "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 60%)",
            ].join(", "),
          }}
        />

        {/* Contenido del hero — z-10 para quedar sobre el glow */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto gap-6">

          {/* Badge "Abierto ahora" */}
          <HorarioBadge />

          {/* Logo circular con ring naranja */}
          <div className="ring-2 ring-orange-500/30 rounded-full p-0.5">
            <Image
              src="/images/logo-bocado-supremo.png"
              alt="Bocado Supremo"
              width={112}
              height={112}
              className="w-28 h-28 rounded-full object-contain"
              priority
            />
          </div>

          {/* Bloque de texto */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-white/40 text-xs tracking-widest uppercase font-semibold">
              Bocado Supremo
            </p>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
              La mejor comida
              <br />
              <span className="text-orange-500">rápida</span>
            </h1>
            <p className="text-white/55 text-sm mt-1 leading-relaxed">
              Hamburguesas artesanales, combos y más.<br />
              Ingredientes frescos, listos en minutos.
            </p>
            <p className="flex items-center gap-1.5 text-white/35 text-xs mt-0.5">
              <MapPin size={12} className="text-orange-500/60 shrink-0" />
              Santa Eulalia, Atenas
            </p>
          </div>

          {/* Botones principales */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/menu"
              className="flex-1 text-center text-white bg-white/8 border border-white/15 rounded-2xl px-6 py-3.5 text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Ver menú completo
            </Link>
            <Link
              href="/carrito"
              className="flex-1 text-center text-white bg-orange-500 hover:bg-orange-600 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-colors"
            >
              Mi pedido
            </Link>
          </div>

          {/* Grid de accesos rápidos */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Link
              href="/menu"
              className="flex flex-col gap-2 bg-white/5 border border-white/8 rounded-2xl p-4 text-left hover:bg-white/10 transition-colors"
            >
              <UtensilsCrossed size={20} className="text-orange-500" />
              <span className="text-white text-sm font-semibold leading-tight">Menú</span>
              <span className="text-white/40 text-xs leading-snug">Ver todos los platillos</span>
            </Link>
            <div className="flex flex-col gap-2 bg-white/5 border border-white/8 rounded-2xl p-4 text-left">
              <span style={{ fontSize: 14, fontWeight: 500, color: "white", lineHeight: 1.2 }}>Síguenos</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>Promos y novedades</span>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                {/* Instagram */}
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center rounded-[10px] p-[10px] border-[0.5px] border-white/[0.08] bg-white/[0.03] transition-colors duration-200 hover:border-orange-500/30"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                </a>
                {/* Facebook */}
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center rounded-[10px] p-[10px] border-[0.5px] border-white/[0.08] bg-white/[0.03] transition-colors duration-200 hover:border-orange-500/30"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Chips inferiores */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CHIPS.map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white/55 text-xs"
              >
                <Icon size={14} className="text-orange-500 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTO DEL MES ─────────────────────────────────────────────── */}
      <section className="px-4 pb-2 w-full">
        <div className="max-w-4xl mx-auto">
          <div
            style={{
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: "16px",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              minHeight: "120px",
            }}
          >
            {/* Resplandor radial en la derecha */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse at 85% 50%, rgba(249,115,22,0.09) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />

            {/* Columna izquierda */}
            <div
              style={{
                flex: 1,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                position: "relative",
              }}
            >
              {/* Badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(249,115,22,0.15)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  borderRadius: "20px",
                  padding: "3px 10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#f97316",
                  letterSpacing: "0.06em",
                  width: "fit-content",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#f97316",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                PRODUCTO DEL MES
              </span>

              {/* Nombre */}
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: 500,
                  color: pdmDisponible ? "white" : "rgba(255,255,255,0.35)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {PRODUCTO_DEL_MES.nombre}
              </p>

              {/* Descripción */}
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {PRODUCTO_DEL_MES.descripcion}
              </p>

              {/* Precio + botón */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{ fontSize: "20px", color: pdmDisponible ? "#f97316" : "rgba(255,255,255,0.3)", fontWeight: 600 }}
                >
                  ₡{PRODUCTO_DEL_MES.precio.toLocaleString("es-CR")}
                </span>
                {pdmDisponible ? (
                  <button
                    onClick={() =>
                      agregarProducto({
                        id:     PRODUCTO_DEL_MES.id,
                        nombre: PRODUCTO_DEL_MES.nombre,
                        precio: PRODUCTO_DEL_MES.precio,
                      })
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#f97316",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Agregar
                  </button>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)",
                    border: "none", borderRadius: "8px", padding: "8px 14px",
                    fontSize: "13px", fontWeight: 500, cursor: "not-allowed",
                  }}>
                    No disponible
                  </span>
                )}
              </div>
            </div>

            {/* Columna derecha — imagen */}
            <div
              style={{
                width: 130,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(249,115,22,0.07)",
                borderLeft: "1px solid rgba(249,115,22,0.15)",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative", display: "inline-block" }}>
                {imagenPDM ? (
                  <Image
                    src={imagenPDM}
                    alt={PRODUCTO_DEL_MES.nombre}
                    width={100}
                    height={100}
                    className="object-contain"
                    style={{ filter: pdmDisponible ? "none" : "grayscale(1)", opacity: pdmDisponible ? 1 : 0.4 }}
                  />
                ) : (
                  <span style={{ fontSize: "64px", lineHeight: 1, opacity: pdmDisponible ? 1 : 0.35 }}>🍔</span>
                )}
                {!pdmDisponible && (
                  <span style={{
                    position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.7)", color: "#fff",
                    borderRadius: 4, fontSize: 9, fontWeight: 600,
                    padding: "2px 6px", whiteSpace: "nowrap",
                  }}>
                    Agotado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          ¿Qué quieres hoy?
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {CATEGORIAS.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="flex flex-col items-center gap-2 rounded-2xl py-5 px-3 transition-all text-center hover:bg-white/10"
              style={GLASS_CAT}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-xs font-semibold text-white/70">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PROPUESTA DE VALOR ───────────────────────────────────────────── */}
      <section className="py-16 max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          ¿Por qué Bocado Supremo?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROPUESTAS.map(({ Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="rounded-2xl p-6 text-center"
              style={GLASS_PROP}
            >
              <div className="p-3 rounded-xl inline-flex" style={ICON_BG}>
                <Icon size={22} className="text-orange-500" />
              </div>
              <p className="text-white font-semibold mt-4 mb-1">{titulo}</p>
              <p className="text-white/45 text-sm leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-20 text-center px-4 w-full">
        <div className="max-w-lg mx-auto p-10" style={GLASS_CTA}>
          <h2 className="text-3xl font-bold text-white mb-2">¿Listo para pedir?</h2>
          <p className="text-white/55 mb-6">
            Explora el menú completo y arma tu pedido.
          </p>
          <Link
            href="/menu"
            className="inline-block text-white bg-orange-500 hover:bg-orange-600 font-semibold px-10 py-4 rounded-2xl text-base transition-colors"
          >
            Ver menú →
          </Link>
        </div>
      </section>
    </div>
  );
}
