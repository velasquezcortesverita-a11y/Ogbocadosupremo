"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Upload, Loader2, CheckCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const CLAVE          = "producto_del_mes_imagen";

export default function ProductoDelMesUploader() {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [subiendo, setSubiendo]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [exito, setExito]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", CLAVE)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.valor) setImagenUrl(data.valor);
      });
  }, []);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo se permiten archivos JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("El archivo supera el máximo de 5MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setExito(false);
    setSubiendo(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "bocado-supremo/producto-del-mes");
      form.append("publicId", "banner");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Error al subir la imagen a Cloudinary.");

      const { url } = (await res.json()) as { url: string };

      const { error: dbErr } = await supabase
        .from("configuracion")
        .upsert({ clave: CLAVE, valor: url }, { onConflict: "clave" });

      if (dbErr) throw new Error(dbErr.message);

      URL.revokeObjectURL(objectUrl);
      setImagenUrl(url);
      setPreview(null);
      setExito(true);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const visible = preview ?? imagenUrl;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Star size={15} className="text-orange-500" />
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Producto del mes
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 max-w-xs">
        <p className="text-sm font-semibold text-gray-700 mb-3">Imagen del banner</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />

        {visible ? (
          <div
            className="relative w-full h-48 rounded-xl overflow-hidden group cursor-pointer"
            onClick={() => !subiendo && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Image
              src={visible}
              alt="Producto del mes"
              fill
              className="object-cover"
              sizes="300px"
              unoptimized={!!preview}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {subiendo ? (
                <div className="flex items-center gap-2 text-white text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Subiendo...
                </div>
              ) : (
                <span className="text-white text-sm font-medium">Cambiar imagen</span>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => !subiendo && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`w-full h-48 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer select-none ${
              subiendo
                ? "border-gray-200 opacity-60 cursor-not-allowed"
                : "border-gray-200 hover:border-orange-400 text-gray-400 hover:text-orange-500"
            }`}
          >
            {subiendo ? (
              <>
                <Loader2 size={24} className="animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span className="text-sm font-medium">Subir imagen del banner</span>
                <span className="text-xs text-gray-300">JPG, PNG, WEBP · Máx. 5MB</span>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {exito && (
          <p className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircle size={13} />
            Imagen actualizada correctamente
          </p>
        )}
      </div>
    </section>
  );
}
