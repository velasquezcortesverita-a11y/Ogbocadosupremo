"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Pencil, Search, Star, Trash2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  extras_permitidos?: string[] | null;
  disponible?: boolean;
};

type Extra = { id: string; nombre: string; precio: number };

type SavedPayload = {
  id?: string;
  nombre?: string;
  precio?: number;
  imagen_url?: string;
  pdmUrl?: string;
};

const ALLOWED  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

// ─── Helper: obtener categoria_id de "Extras" ─────────────────────────────────

async function getExtrasCatId(): Promise<string | null> {
  const { data } = await supabase
    .from("categorias")
    .select("id")
    .ilike("nombre", "%extra%")
    .maybeSingle();
  return data?.id ?? null;
}

// ─── Modal de Agregar/Editar extra (CRUD admin) ───────────────────────────────

function ExtraModal({
  extra,
  onClose,
  onSaved,
  onDeleted,
  initialConfirmDel = false,
}: {
  extra: Extra | null;
  onClose: () => void;
  onSaved: (saved: Extra) => void;
  onDeleted: () => void;
  initialConfirmDel?: boolean;
}) {
  const [nombre,     setNombre]     = useState(extra?.nombre  ?? "");
  const [precio,     setPrecio]     = useState(extra?.precio?.toString() ?? "");
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(initialConfirmDel);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSave = async () => {
    if (!nombre.trim()) { setError("El nombre no puede quedar vacío."); return; }
    const p = Number(precio);
    if (!p || p <= 0)   { setError("El precio debe ser mayor a 0."); return; }
    setSaving(true); setError(null);
    try {
      if (extra) {
        const { error: dbErr } = await supabase.from("productos").update({ nombre: nombre.trim(), precio: p }).eq("id", extra.id);
        if (dbErr) throw new Error(dbErr.message);
        onSaved({ ...extra, nombre: nombre.trim(), precio: p });
      } else {
        const catId = await getExtrasCatId();
        if (!catId) throw new Error("No se encontró la categoría 'Extras'. Creala primero en el admin.");
        const { data, error: dbErr } = await supabase.from("productos").insert({ nombre: nombre.trim(), precio: p, categoria_id: catId }).select("id, nombre, precio").single();
        if (dbErr) throw new Error(dbErr.message);
        onSaved(data as Extra);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!extra) return;
    setDeleting(true); setError(null);
    try {
      const { error: dbErr } = await supabase.from("productos").delete().eq("id", extra.id);
      if (dbErr) throw new Error(dbErr.message);

      // Quitar este ID de extras_permitidos de todos los platillos que lo tengan
      const { data: afectados } = await supabase
        .from("productos")
        .select("id, extras_permitidos")
        .not("extras_permitidos", "is", null);

      for (const p of (afectados ?? []) as { id: string; extras_permitidos: string[] }[]) {
        if (!Array.isArray(p.extras_permitidos)) continue;
        if (!p.extras_permitidos.includes(extra.id)) continue;
        const nuevos = p.extras_permitidos.filter((id) => id !== extra.id);
        await supabase.from("productos").update({ extras_permitidos: nuevos.length ? nuevos : null }).eq("id", p.id);
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "8px 10px", color: "rgba(255,255,255,0.85)", fontSize: 13, outline: "none",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", borderRadius: 16, maxWidth: 320, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{extra ? "Editar extra" : "Nuevo extra"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Precio (₡)</label>
            <input type="number" min="1" value={precio} onChange={(e) => setPrecio(e.target.value)} style={{ ...inp, color: "#f97316", fontWeight: 600, fontSize: 15 }} />
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "7px 10px", margin: 0 }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} style={{ width: "100%", border: "none", background: "#f97316", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 8, padding: "11px 0", cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar"}
          </button>

          {extra && !confirmDel && (
            <button onClick={() => setConfirmDel(true)} style={{ width: "100%", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontWeight: 500, fontSize: 13, borderRadius: 8, padding: "9px 0", cursor: "pointer" }}>
              Eliminar extra
            </button>
          )}

          {extra && confirmDel && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: 11, color: "#ef4444", margin: "0 0 8px" }}>
                ¿Eliminar <strong>{extra.nombre}</strong>? Esta acción no se puede deshacer. Si este extra está asignado a algún platillo, también se quitará de ahí.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDel(false)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", borderRadius: 7, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, background: "#ef4444", border: "none", color: "#fff", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? "Eliminando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-pestaña Extras ───────────────────────────────────────────────────────

function ExtrasSubTab() {
  const [extras,    setExtras]    = useState<Extra[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [creating,  setCreating]  = useState(false);
  const [editState, setEditState] = useState<{ extra: Extra; confirmDel: boolean } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const catId = await getExtrasCatId();
    if (!catId) { setLoading(false); return; }
    const { data } = await supabase.from("productos").select("id, nombre, precio").eq("categoria_id", catId).order("nombre");
    setExtras((data ?? []) as Extra[]);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = extras.filter((e) => e.nombre.toLowerCase().includes(query.toLowerCase()));

  const handleSaved = (saved: Extra) => {
    setExtras((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) return prev.map((e) => (e.id === saved.id ? saved : e));
      return [...prev, saved].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  };

  const handleDeleted = (id: string) => {
    setExtras((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div>
      {creating && (
        <ExtraModal extra={null} onClose={() => setCreating(false)} onSaved={handleSaved} onDeleted={() => {}} />
      )}
      {editState && (
        <ExtraModal
          extra={editState.extra}
          initialConfirmDel={editState.confirmDel}
          onClose={() => setEditState(null)}
          onSaved={handleSaved}
          onDeleted={() => handleDeleted(editState.extra.id)}
        />
      )}

      {/* Buscador + agregar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar extra..." style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 10px 8px 30px", color: "#374151", fontSize: 13, outline: "none" }} />
        </div>
        <button type="button" onClick={() => setCreating(true)} style={{ background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 12, padding: "0 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
          + Agregar extra
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 36 }}>
          <Loader2 size={18} className="animate-spin" style={{ color: "rgba(0,0,0,0.2)" }} />
        </div>
      ) : filtrados.length === 0 ? (
        <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
          {query ? `Sin resultados para "${query}"` : "No hay extras configurados"}
        </p>
      ) : (
        <div>
          {filtrados.map((extra) => (
            <div key={extra.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(249,115,22,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧀</div>
              <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{extra.nombre}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#f97316" }}>₡{Number(extra.precio).toLocaleString("es-CR")}</span>
              <button type="button" onClick={() => setEditState({ extra, confirmDel: false })} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 4 }} title="Editar">
                <Pencil size={13} />
              </button>
              <button type="button" onClick={() => setEditState({ extra, confirmDel: true })} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4, borderRadius: 4 }} title="Eliminar">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de edición de PLATILLO ─────────────────────────────────────────────

function EditModal({
  producto,
  pdmUrl,
  onClose,
  onSaved,
}: {
  producto: Producto | null;
  pdmUrl: string | null;
  onClose: () => void;
  onSaved: (payload: SavedPayload) => void;
}) {
  const isPdm = producto === null;

  const [nombre,   setNombre]   = useState(producto?.nombre  ?? "");
  const [precio,   setPrecio]   = useState(producto?.precio?.toString() ?? "");
  const [preview,  setPreview]  = useState<string | null>(null);
  const [imgFile,  setImgFile]  = useState<File | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [exito,    setExito]    = useState(false);

  // Extras para este platillo
  const [allExtras,         setAllExtras]         = useState<Extra[]>([]);
  const [extrasPermitidos,  setExtrasPermitidos]  = useState<Set<string>>(new Set());
  const [loadingExtras,     setLoadingExtras]      = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const imagenActual = preview ?? (isPdm ? pdmUrl : producto?.imagen_url) ?? null;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  // Cargar extras disponibles + configuración de este platillo
  useEffect(() => {
    if (isPdm) return;
    setLoadingExtras(true);
    (async () => {
      const catId = await getExtrasCatId();
      if (!catId) { setLoadingExtras(false); return; }
      const { data } = await supabase.from("productos").select("id, nombre, precio").eq("categoria_id", catId).order("nombre");
      const extrasData = (data ?? []) as Extra[];
      setAllExtras(extrasData);

      // extras_permitidos: null → todos; array → solo esos IDs
      const permitidos = producto?.extras_permitidos;
      if (permitidos == null) {
        setExtrasPermitidos(new Set(extrasData.map((e) => e.id)));
      } else {
        setExtrasPermitidos(new Set(permitidos));
      }
      setLoadingExtras(false);
    })();
  }, [isPdm, producto?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = (file: File) => {
    if (!ALLOWED.includes(file.type)) { setError("Solo se permiten JPG, PNG o WEBP."); return; }
    if (file.size > MAX_SIZE)         { setError("El archivo supera el máximo de 5 MB."); return; }
    setError(null);
    setImgFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const toggleExtra = (id: string) => {
    setExtrasPermitidos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!isPdm) {
      if (!nombre.trim())     { setError("El nombre no puede quedar vacío."); return; }
      const p = Number(precio);
      if (!p || p <= 0)       { setError("El precio debe ser mayor a 0."); return; }
    }
    setSaving(true); setError(null);
    try {
      let newImgUrl: string | undefined;
      if (imgFile) {
        const form = new FormData();
        form.append("file", imgFile);
        if (isPdm) {
          form.append("folder", "bocado-supremo/producto-del-mes");
          form.append("publicId", "banner");
        } else {
          form.append("folder", "bocado-supremo/productos");
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
          const { error: dbErr } = await supabase.from("configuracion").upsert({ clave: "producto_del_mes_imagen", valor: newImgUrl }, { onConflict: "clave" });
          if (dbErr) throw new Error(dbErr.message);
        }
        onSaved({ pdmUrl: newImgUrl });
      } else {
        const updates: Record<string, unknown> = {
          nombre: nombre.trim(),
          precio: Number(precio),
          extras_permitidos: Array.from(extrasPermitidos),
        };
        if (newImgUrl) updates.imagen_url = newImgUrl;
        const { error: dbErr } = await supabase.from("productos").update(updates).eq("id", producto!.id);
        if (dbErr) throw new Error(dbErr.message);
        onSaved({ id: producto!.id, nombre: nombre.trim(), precio: Number(precio), ...(newImgUrl ? { imagen_url: newImgUrl } : {}) });
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", borderRadius: 16, maxWidth: 360, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            {isPdm ? "Producto del mes" : "Editar platillo"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>✕</button>
        </div>

        <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Imagen */}
          <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div onClick={() => !saving && inputRef.current?.click()} style={{ position: "relative", height: 90, borderRadius: 10, overflow: "hidden", background: "rgba(249,115,22,0.08)", cursor: "pointer" }}>
            {imagenActual && <img src={imagenActual} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            {saving && imgFile ? (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={18} className="animate-spin" style={{ color: "#fff" }} />
              </div>
            ) : (
              <div style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 9px", borderRadius: "8px 0 10px 0" }}>Cambiar foto</div>
            )}
          </div>

          {/* Nombre */}
          {!isPdm && (
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "rgba(255,255,255,0.85)", fontSize: 13, outline: "none" }} />
            </div>
          )}

          {/* Precio */}
          {!isPdm && (
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "block" }}>Precio (₡)</label>
              <input type="number" min="1" value={precio} onChange={(e) => setPrecio(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "#f97316", fontSize: 15, fontWeight: 600, outline: "none" }} />
            </div>
          )}

          {/* Extras disponibles para este platillo */}
          {!isPdm && (
            <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", paddingTop: 10, marginTop: 2 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.7)", margin: "0 0 8px" }}>
                Extras disponibles para este platillo
              </p>
              {loadingExtras ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: "#f97316" }} />
                </div>
              ) : allExtras.length === 0 ? (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "8px 0" }}>No hay extras creados todavía</p>
              ) : (
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {allExtras.map((extra) => {
                    const checked = extrasPermitidos.has(extra.id);
                    return (
                      <div
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px", cursor: "pointer", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                      >
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{extra.nombre}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#f97316" }}>₡{Number(extra.precio).toLocaleString("es-CR")}</span>
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? "#f97316" : "rgba(255,255,255,0.2)"}`, background: checked ? "#f97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                            {checked && <svg viewBox="0 0 10 8" width="10" height="8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "7px 10px", margin: 0 }}>{error}</p>}
          {exito  && <p style={{ fontSize: 12, color: "#22c55e", background: "rgba(34,197,94,0.08)",  borderRadius: 8, padding: "7px 10px", margin: 0, textAlign: "center" }}>✓ Guardado</p>}

          <button
            onClick={handleSave}
            disabled={saving || exito}
            style={{ width: "100%", border: "none", background: exito ? "#22c55e" : "#f97316", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 8, padding: "11px 0", cursor: saving || exito ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : exito ? "✓ Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export default function ProductosTab() {
  const [subTab,      setSubTab]      = useState<"platillos" | "extras">("platillos");
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [pdmUrl,      setPdmUrl]      = useState<string | null>(null);
  const [query,       setQuery]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [editTarget,  setEditTarget]  = useState<Producto | null | undefined>(undefined);

  const cargar = useCallback(async () => {
    setLoading(true);
    const extrasCatId = await getExtrasCatId();
    const [{ data: prods, error: prodsErr }, { data: pdm }] = await Promise.all([
      // select("*") para no fallar si columnas nuevas (disponible, extras_permitidos)
      // todavía no existen en la tabla de Supabase
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("configuracion").select("valor").eq("clave", "producto_del_mes_imagen").maybeSingle(),
    ]);

    if (prodsErr) console.error("ProductosTab: error al cargar productos:", prodsErr.message);

    // Excluir extras de la lista de platillos
    type RawProd = Producto & { categoria_id?: string | null; [key: string]: unknown };
    const todos = (prods ?? []) as RawProd[];
    const platillos: Producto[] = todos
      .filter((p) => !extrasCatId || p.categoria_id !== extrasCatId)
      .map(({ id, nombre, precio, imagen_url, extras_permitidos, disponible }) => ({
        id:               id as string,
        nombre:           nombre as string,
        precio:           precio as number,
        imagen_url:       (imagen_url as string | null) ?? null,
        extras_permitidos: (extras_permitidos as string[] | null) ?? null,
        disponible:       (disponible as boolean | undefined) ?? undefined,
      }));

    setProductos(platillos);
    if (pdm?.valor) setPdmUrl(pdm.valor as string);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = productos.filter((p) => p.nombre.toLowerCase().includes(query.toLowerCase()));

  const handleSaved = (payload: SavedPayload) => {
    if (payload.pdmUrl !== undefined) setPdmUrl(payload.pdmUrl);
    if (payload.id) {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === payload.id
            ? { ...p, ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}), ...(payload.precio !== undefined ? { precio: payload.precio } : {}), ...(payload.imagen_url !== undefined ? { imagen_url: payload.imagen_url } : {}) }
            : p
        )
      );
    }
  };

  const toggleDisponible = async (p: Producto, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !(p.disponible ?? true);
    // Actualización optimista
    setProductos((prev) => prev.map((prod) => prod.id === p.id ? { ...prod, disponible: next } : prod));
    const { error } = await supabase.from("productos").update({ disponible: next }).eq("id", p.id);
    if (error) {
      // Revertir si falla
      setProductos((prev) => prev.map((prod) => prod.id === p.id ? { ...prod, disponible: !next } : prod));
    }
  };

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0 0 8px",
    marginRight: 20,
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? "#f97316" : "#6b7280",
    background: "none",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: `2px solid ${active ? "#f97316" : "transparent"}`,
    cursor: "pointer",
    outline: "none",
  });

  const rowBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 0", cursor: "pointer",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20 }}>

      {/* Modal de platillo */}
      {editTarget !== undefined && (
        <EditModal producto={editTarget} pdmUrl={pdmUrl} onClose={() => setEditTarget(undefined)} onSaved={handleSaved} />
      )}

      {/* Sub-pestañas */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)", marginBottom: 16 }}>
        <button type="button" style={subTabStyle(subTab === "platillos")} onClick={() => setSubTab("platillos")}>Platillos</button>
        <button type="button" style={subTabStyle(subTab === "extras")}    onClick={() => setSubTab("extras")}>Extras</button>
      </div>

      {/* ── Sub-pestaña Platillos ─────────────────────────────────────────── */}
      {subTab === "platillos" && (
        <>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 10px 8px 30px", color: "#374151", fontSize: 13, outline: "none" }} />
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.25)" }} />
            </div>
          ) : (
            <div>
              {/* Producto del mes */}
              <div style={{ ...rowBase, borderBottom: "1px solid rgba(249,115,22,0.15)", paddingBottom: 12, marginBottom: 6 }} onClick={() => setEditTarget(null)}>
                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "rgba(249,115,22,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {pdmUrl ? <img src={pdmUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Star size={15} style={{ color: "#f97316" }} />}
                </div>
                <span style={{ flex: 1, fontSize: 12, color: "#111827", fontWeight: 500 }}>Producto del mes</span>
                <span style={{ fontSize: 11, color: "#f97316", opacity: 0.7 }}>banner</span>
              </div>

              {filtrados.map((p) => {
                const disponible = p.disponible ?? true;
                return (
                  <div key={p.id} style={rowBase} onClick={() => setEditTarget(p)}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "rgba(249,115,22,0.07)", flexShrink: 0 }}>
                      {p.imagen_url && <img src={p.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: disponible ? "none" : "grayscale(1)", opacity: disponible ? 1 : 0.5 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: disponible ? "#374151" : "#9ca3af" }}>{p.nombre}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#f97316", opacity: disponible ? 1 : 0.4 }}>₡{Number(p.precio).toLocaleString("es-CR")}</span>
                    {/* Toggle disponible */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} onClick={(e) => toggleDisponible(p, e)}>
                      <span style={{ fontSize: 9, fontWeight: 500, color: disponible ? "#22c55e" : "#ef4444" }}>
                        {disponible ? "Disponible" : "Agotado"}
                      </span>
                      <div style={{ width: 32, height: 18, borderRadius: 10, background: disponible ? "#22c55e" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 2, left: disponible ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtrados.length === 0 && query && (
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
                  Sin resultados para &ldquo;{query}&rdquo;
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Sub-pestaña Extras ────────────────────────────────────────────── */}
      {subTab === "extras" && <ExtrasSubTab />}
    </div>
  );
}
