import { supabase } from "@/lib/supabase";
import ImageUploader from "@/components/admin/ImageUploader";
import { ImageIcon } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  categoria_id: string | null;
};

type Categoria = {
  id: string;
  nombre: string;
};

export default async function AdminProductosPage() {
  const [{ data: rawProductos }, { data: rawCategorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio, imagen_url, categoria_id")
      .order("nombre"),
    supabase.from("categorias").select("id, nombre"),
  ]);

  const productos   = (rawProductos  ?? []) as Producto[];
  const categorias  = (rawCategorias ?? []) as Categoria[];

  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));

  // Agrupar por categoría
  const grupos = categorias.map((cat) => ({
    ...cat,
    productos: productos.filter((p) => p.categoria_id === cat.id),
  }));

  const sinCategoria = productos.filter((p) => !p.categoria_id);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <ImageIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Imágenes de Productos
            </h1>
            <p className="text-sm text-gray-500">
              {productos.length} productos · haz clic en una imagen para cambiarla
            </p>
          </div>
        </div>

        {/* Grupos por categoría */}
        {grupos.map((grupo) => {
          if (grupo.productos.length === 0) return null;
          return (
            <section key={grupo.id} className="mb-10">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {grupo.nombre}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {grupo.productos.map((p) => (
                  <ProductoItem key={p.id} producto={p} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Sin categoría */}
        {sinCategoria.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Sin categoría
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sinCategoria.map((p) => (
                <ProductoItem key={p.id} producto={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ProductoItem({ producto }: { producto: Producto }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
      <ImageUploader
        productoId={producto.id}
        imagenActual={producto.imagen_url}
      />
      <div>
        <p className="text-sm font-semibold text-gray-900 truncate">
          {producto.nombre}
        </p>
        <p className="text-xs text-gray-400">
          ₡{Number(producto.precio).toLocaleString("es-CR")}
        </p>
      </div>
    </div>
  );
}
