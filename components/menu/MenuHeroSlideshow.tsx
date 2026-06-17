"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const CLAVE        = "hero_menu_imagenes";
const INTERVALO_MS = 3500;  // tiempo entre cambios (cubre fade in + visible + inicio fade out)
const FADE_MS      = 1200;  // duración del CSS transition

export default function MenuHeroSlideshow() {
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [activo, setActivo]     = useState(0);

  useEffect(() => {
    supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", CLAVE)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.valor) return;
        try {
          const parsed = JSON.parse(data.valor) as unknown;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setImagenes(parsed as string[]);
          }
        } catch { /* JSON inválido — no mostrar nada */ }
      });
  }, []);

  useEffect(() => {
    if (imagenes.length <= 1) return;
    const id = setInterval(
      () => setActivo((prev) => (prev + 1) % imagenes.length),
      INTERVALO_MS,
    );
    return () => clearInterval(id);
  }, [imagenes.length]);

  if (imagenes.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Imagen activa — se hace fade entre índices */}
      {imagenes.map((url, i) => (
        <div
          key={url}
          style={{
            position:   "absolute",
            right:       0,
            top:         0,
            bottom:      0,
            width:       "65%",
            opacity:     i === activo ? 1 : 0,
            transition:  `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          {/* Wrapper para blur + scale sin afectar la opacidad del overlay */}
          <div
            style={{
              position:  "absolute",
              inset:      0,
              filter:    "blur(3px)",
              opacity:    0.35,
              transform: "scale(1.05)",
            }}
          >
            <Image
              src={url}
              alt=""
              fill
              className="object-cover"
              sizes="65vw"
              priority={i === 0}
            />
          </div>
        </div>
      ))}

      {/* Gradientes laterales para fundir con el fondo */}
      <div
        style={{
          position:   "absolute",
          inset:       0,
          background: "linear-gradient(90deg, #0d1117 35%, transparent 70%, #0d1117 100%)",
        }}
      />
    </div>
  );
}
