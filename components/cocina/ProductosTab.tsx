"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, Star } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
};

type SavedPayload = {
  id?: string;
  nombre?: string;
  precio?: number;
  imagen_url?: string;
  pdmUrl?: string;
};

const ALLOWED  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditModal({
  producto,
  pdmUrl,
  onClose,
  onSaved,
}: {
  producto: Producto | null; // null = Producto del mes
  pdmUrl: string | null;
  onClose: () => void;
  onSaved: (payload: SavedPayload) => void;
}) {
  const isPdm = producto === null;

  const [nombre,  setNombre]  = useState(producto?.nombre ?? "");
  const [precio,  setPrecio]  = useState(producto?.precio?.toString() ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [exito,   setExito]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const imagenActual = preview ?? (isPdm ? pdmUrl : producto?.imagen_url) ?? null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFile = (file: File) => {
    if (!ALLOWED.includes(file.type)) { setError("Solo se permiten JPG, PNG o WEBP."); return; }
    if (file.size > MAX_SIZE)         { setError("El archivo supera el máximo de 5 MB."); return; }
    setError(null);
    setImgFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!isPdm) {
      if (!nombre.trim())        { setError("El nombre no puede quedar vacío."); return; }
      const p = Number(precio);
      if (!p || p <= 0)          { setError("El precio debe ser mayor a 0."); return; }
    }

    setSaving(true);
    setError(null);

    try {
      let newImgUrl: string | undefined;

      if (imgFile) {
        const form = new FormData();
        form.append("file", imgFile);
        if (isPdm) {
          form.append("folder",   "bocado-supremo/producto-del-mes");
          form.append("publicId", "banner");
        } else {
          form.append("folder",   "bocado-supremo/productos");
          form.append("publicId", producto!.id);
        }
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error("No se pudo subir la imagen. Intentá de nuevo.");
        const json = await res.json() as { url?: string; error?: string };
        if (!json.url) throw new Error(json.error ?? "Error al subir imagen.");
        newImgUrl = json.url;
      }

      if (isPdm) {
        if (newImgUrl) {
          const { error: dbErr } = await supabase
            .from("configuracion")
            .upsert({ clave: "producto_del_mes_imagen", valor: newImgUrl }, { onConflict: "clave" });
          if (dbErr) throw new Error(dbErr.message);
        }
        onSaved({ pdmUrl: newImgUrl });
      } else {
        const updates: Record<string, unknown> = {
          nombre: nombre.trim(),
          precio: Number(precio),
        };
        if (newImgUrl) updates.imagen_url = newImgUrl;

        const { error: dbErr } = await supabase
          .from("productos")
          .update(updates)
          .eq("id", producto!.id);
        if (dbErr) throw new Error(dbErr.message);

        onSaved({
          id:     producto!.id,
          nombre: nombre.trim(),
          precio: Number(precio),
          ...(newImgUrl ? { imagen_url: newImgUrl } : {}),
        });
      }

      setExito(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111827",
          borderRadius: 16,
          maxWidth: 360,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            {isPdm ? "Producto del mes" : "Editar producto"}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Imagen */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div
            onClick={() => !saving && inputRef.current?.click()}
            style={{
              position: "relative",
              height: 90,
              borderRadius: 10,
              overflow: "hidden",
              background: "rgba(249,115,22,0.08)",
              cursor: "pointer",
            }}
          >
            {imagenActual && (
              <img
                src={imagenActual}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
            {saving && imgFile ? (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={18} className="animate-spin" style={{ color: "#fff" }} />
              </div>
            ) : (
              <div style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 9px", borderRadius: "8px 0 10px 0" }}>
                Cambiar foto
              </div>
            )}
          </div>

          {/* Nombre */}
          {!isPdm && (
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "8px 10px",
                  color: "rgba(255,255,255,0.85)", fontSize: 13, outline: "none",
                }}
              />
            </div>
          )}

          {/* Precio */}
          {!isPdm && (
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Precio (₡)</label>
              <input
                type="number"
                min="1"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "8px 10px",
                  color: "#f97316", fontSize: 15, fontWeight: 600, outline: "none",
                }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "7px 10px", margin: 0 }}>
              {error}
            </p>
          )}

          {/* Éxito */}
          {exito && (
            <p style={{ fontSize: 12, color: "#22c55e", background: "rgba(34,197,94,0.08)", borderRadius: 8, padding: "7px 10px", margin: 0, textAlign: "center" }}>
              ✓ Producto actualizado
            </p>
          )}

          {/* Guardar */}
          <button
            onClick={handleSave}
            disabled={saving || exito}
            style={{
              width: "100%", border: "none",
              background: exito ? "#22c55e" : "#f97316",
              color: "#fff", fontWeight: 600, fontSize: 14,
              borderRadius: 8, padding: "11px 0",
              cursor: saving || exito ? "default" : "pointer",
              opacity: saving ? 0.75 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s",
            }}
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              : exito
              ? "✓ Guardado"
              : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export default function ProductosTab() {
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [pdmUrl,      setPdmUrl]      = useState<string | null>(null);
  const [query,       setQuery]       = useState("");
  const [loading,     setLoading]     = useState(true);
  // undefined = cerrado, null = editando PDM, Producto = editando producto
  const [editTarget,  setEditTarget]  = useState<Producto | null | undefined>(undefined);

  const cargar = useCallback(async () => {
    const [{ data: prods }, { data: pdm }] = await Promise.all([
      supabase.from("productos").select("id, nombre, precio, imagen_url").order("nombre"),
      supabase.from("configuracion").select("valor").eq("clave", "producto_del_mes_imagen").maybeSingle(),
    ]);
    setProductos((prods ?? []) as Producto[]);
    if (pdm?.valor) setPdmUrl(pdm.valor as string);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(query.toLowerCase())
  );

  const handleSaved = (payload: SavedPayload) => {
    if (payload.pdmUrl !== undefined) setPdmUrl(payload.pdmUrl);
    if (payload.id) {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === payload.id
            ? {
                ...p,
                ...(payload.nombre      !== undefined ? { nombre:     payload.nombre }      : {}),
                ...(payload.precio      !== undefined ? { precio:     payload.precio }      : {}),
                ...(payload.imagen_url  !== undefined ? { imagen_url: payload.imagen_url }  : {}),
              }
            : p
        )
      );
    }
  };

  const rowBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 0", cursor: "pointer",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20 }}>

      {/* Modal */}
      {editTarget !== undefined && (
        <EditModal
          producto={editTarget}
          pdmUrl={pdmUrl}
          onClose={() => setEditTarget(undefined)}
          onSaved={handleSaved}
        />
      )}

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10, padding: "8px 10px 8px 30px",
            color: "#374151", fontSize: 13, outline: "none",
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      ) : (
        <div>
          {/* Fila Producto del mes */}
          <div
            style={{ ...rowBase, borderBottom: "1px solid rgba(249,115,22,0.15)", paddingBottom: 12, marginBottom: 6 }}
            onClick={() => setEditTarget(null)}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "rgba(249,115,22,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {pdmUrl
                ? <img src={pdmUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <Star size={15} style={{ color: "#f97316" }} />}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: "#111827", fontWeight: 500 }}>
              Producto del mes
            </span>
            <span style={{ fontSize: 11, color: "#f97316", opacity: 0.7 }}>banner</span>
          </div>

          {/* Lista de productos */}
          {filtrados.map((p) => (
            <div key={p.id} style={rowBase} onClick={() => setEditTarget(p)}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "rgba(249,115,22,0.07)", flexShrink: 0 }}>
                {p.imagen_url && (
                  <img
                    src={p.imagen_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
              <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{p.nombre}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#f97316" }}>
                ₡{Number(p.precio).toLocaleString("es-CR")}
              </span>
            </div>
          ))}

          {filtrados.length === 0 && query && (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
