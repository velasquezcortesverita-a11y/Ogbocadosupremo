"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  productoId: string;
  imagenActual: string | null;
};

export default function ImageUploader({ productoId, imagenActual }: Props) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(imagenActual);
  const [preview, setPreview]     = useState<string | null>(null);
  const [subiendo, setSubiendo]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview inmediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setSubiendo(true);

    try {
      // 1. Subir a Cloudinary vía API route
      const form = new FormData();
      form.append("file", file);
      form.append("productoId", productoId);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Error en la subida");

      const { url } = (await res.json()) as { url: string };

      // 2. Guardar URL en Supabase
      const { error: dbError } = await supabase
        .from("productos")
        .update({ imagen_url: url })
        .eq("id", productoId);

      if (dbError) throw new Error(dbError.message);

      setImagenUrl(url);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setSubiendo(false);
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const imagenVisible = preview ?? imagenUrl;

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {imagenVisible ? (
        /* Vista con imagen */
        <div
          className="relative w-full h-40 rounded-xl overflow-hidden group cursor-pointer"
          onClick={() => !subiendo && inputRef.current?.click()}
        >
          <Image
            src={imagenVisible}
            alt="Imagen del producto"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 300px"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {subiendo ? (
              <div className="flex items-center gap-2 text-white text-sm">
                <Loader2 size={16} className="animate-spin" />
                Subiendo...
              </div>
            ) : (
              <span className="text-white text-sm font-medium">
                Cambiar imagen
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Área de drop / sin imagen */
        <button
          type="button"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
          className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {subiendo ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload size={24} />
              <span className="text-sm font-medium">Subir imagen</span>
              <span className="text-xs text-gray-300">JPG, PNG, WEBP</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
