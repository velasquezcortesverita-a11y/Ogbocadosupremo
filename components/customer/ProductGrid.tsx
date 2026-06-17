import ProductCard from "./ProductCard";

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria?: string;
};

const SECCIONES = [
  { key: "hamburguesas",         label: "Hamburguesas" },
  { key: "hamburguesas_premium", label: "Hamburguesas Premium" },
  { key: "antojitos",            label: "Antojitos" },
  { key: "pollo",                label: "Pollo" },
  { key: "super_combos",         label: "Super Combos" },
  { key: "combos_futboleros",    label: "Combos Futboleros" },
  { key: "combos_de_pollo",      label: "Combos de Pollo" },
  { key: "bebidas",              label: "Bebidas" },
  { key: "extras",               label: "Extras" },
] as const;

function ProductoGrid({ productos }: { productos: Producto[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {productos.map((p) => (
        <ProductCard
          key={p.id}
          id={p.id}
          nombre={p.nombre}
          descripcion={p.descripcion}
          precio={p.precio}
        />
      ))}
    </div>
  );
}

function SeccionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-5">
      <div className="w-1 h-6 bg-orange-500 rounded-full" />
      <h2 className="text-xl font-bold text-gray-900">{label}</h2>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function ProductGrid({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-6xl mb-4">🍽️</span>
        <p className="font-semibold text-lg text-gray-500">
          No hay productos disponibles
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Vuelve pronto, estamos actualizando el menú.
        </p>
      </div>
    );
  }

  const porCategoria = productos.reduce<Record<string, Producto[]>>(
    (acc, p) => {
      const cat = p.categoria ?? "__none__";
      acc[cat] = [...(acc[cat] ?? []), p];
      return acc;
    },
    {}
  );

  const seccionesActivas = SECCIONES.filter(
    (s) => (porCategoria[s.key]?.length ?? 0) > 0
  );

  if (seccionesActivas.length === 0) {
    return <ProductoGrid productos={productos} />;
  }

  return (
    <div className="space-y-2">
      {seccionesActivas.map((seccion) => (
        <section key={seccion.key} id={seccion.key} className="scroll-mt-32">
          <SeccionHeader label={seccion.label} />
          <ProductoGrid productos={porCategoria[seccion.key]} />
        </section>
      ))}
    </div>
  );
}
