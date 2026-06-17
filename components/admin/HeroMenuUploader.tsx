"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  Upload, Loader2, X, CheckCircle,
  ChevronLeft, ChevronRight, Images,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGENES   = 8;
const ALLOWED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const CLAVE          = "hero_menu_imagenes";

async function persistir(urls: string[]): Promise<string | null> {
  const { error } = await supabase
    .from("configuracion")
    .upsert({ clave: CLAVE, valor: JSON.stringify(urls) }, { onConflict: "clave" });
  return error ? error.message : null;
}

export default function HeroMenuUploader() {
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje]   = useState<{ texto: string; tipo: "ok" | "err" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          if (Array.isArray(parsed)) setImagenes(parsed as string[]);
        } catch { /* ignorar JSON inválido */ }
      });
  }, []);

  const flash = (texto: string, tipo: "ok" | "err") => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), tipo === "ok" ? 3000 : 5000);
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      flash("Solo se permiten archivos JPG, PNG o WEBP.", "err");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      flash("El archivo supera el máximo de 5MB.", "err");
      return;
    }
    if (imagenes.length >= MAX_IMAGENES) {
      flash(`Máximo ${MAX_IMAGENES} imágenes en el slideshow.`, "err");
      return;
    }

    setSubiendo(true);
    setMensaje(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "bocado-supremo/hero-menu");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Error al subir la imagen.");
      const { url } = (await res.json()) as { url: string };

      const nuevas = [...imagenes, url];
      const err = await persistir(nuevas);
      if (err) throw new Error(err);

      setImagenes(nuevas);
      flash("Imagen agregada al slideshow.", "ok");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error desconocido.", "err");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const eliminar = async (idx: number) => {
    const nuevas = imagenes.filter((_, i) => i !== idx);
    const err = await persistir(nuevas);
    if (err) { flash(err, "err"); return; }
    setImagenes(nuevas);
    flash("Imagen eliminada del slideshow.", "ok");
  };

  const mover = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= imagenes.length) return;
    const nuevas = [...imagenes];
    [nuevas[idx], nuevas[target]] = [nuevas[target], nuevas[idx]];
    const err = await persistir(nuevas);
    if (err) { flash(err, "err"); return; }
    setImagenes(nuevas);
  };

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Images size={15} className="text-orange-500" />
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Imágenes del hero — Menú
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">
            Slideshow{" "}
            <span className="font-normal text-gray-400">
              ({imagenes.length}/{MAX_IMAGENES})
            </span>
          </p>
          <button
            type="button"
            disabled={subiendo || imagenes.length >= MAX_IMAGENES}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subiendo ? (
              <><Loader2 size={13} className="animate-spin" /> Subiendo...</>
            ) : (
              <><Upload size={13} /> Agregar imagen</>
            )}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {/* Grid de miniaturas */}
        {imagenes.length === 0 ? (
          <div
            onClick={() => !subiendo && inputRef.current?.click()}
            className="h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-orange-500 cursor-pointer select-none text-sm"
          >
            <Upload size={18} />
            Sin imágenes · haz clic para agregar
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {imagenes.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative group"
                style={{ width: 80, height: 80, flexShrink: 0 }}
              >
                {/* Miniatura */}
                <Image
                  src={url}
                  alt={`Hero imagen ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover rounded-lg"
                />

                {/* Overlay de controles (visible al hover) */}
                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-between p-1">
                  {/* Botón X — eliminar */}
                  <button
                    onClick={() => eliminar(i)}
                    className="self-end w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Eliminar"
                  >
                    <X size={10} />
                  </button>

                  {/* Flechas reordenar */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      className="w-5 h-5 bg-white/20 hover:bg-white/40 disabled:opacity-30 text-white rounded flex items-center justify-center transition-colors"
                      title="Mover izquierda"
                    >
                      <ChevronLeft size={11} />
                    </button>
                    <button
                      onClick={() => mover(i, 1)}
                      disabled={i === imagenes.length - 1}
                      className="w-5 h-5 bg-white/20 hover:bg-white/40 disabled:opacity-30 text-white rounded flex items-center justify-center transition-colors"
                      title="Mover derecha"
                    >
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>

                {/* Número de posición */}
                <span
                  className="absolute top-0.5 left-1 text-[10px] font-bold text-white/70 leading-none pointer-events-none"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                >
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mensajes */}
        {mensaje?.tipo === "err" && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {mensaje.texto}
          </p>
        )}
        {mensaje?.tipo === "ok" && (
          <p className="mt-3 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircle size={13} />
            {mensaje.texto}
          </p>
        )}

        {/* Instrucciones */}
        {imagenes.length > 0 && (
          <p className="mt-3 text-xs text-gray-300">
            Pasa el cursor sobre una miniatura para ver los controles · máx. {MAX_IMAGENES} imágenes · JPG, PNG, WEBP, 5MB
          </p>
        )}
      </div>
    </section>
  );
}
