import { supabase } from "@/lib/supabase";
import MenuClient from "@/components/menu/MenuClient";
import type { Categoria } from "@/components/menu/MenuClient";

export default async function MenuPage() {
  const { data, error } = await supabase
    .from("categorias")
    .select(`
      id, nombre, orden,
      productos (
        id, nombre, precio, descripcion,
        disponible, imagen_url, tiempo_prep_min
      )
    `)
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error query menú:", error.message);
  }

  const categorias = (data ?? []) as Categoria[];

  return (
    <main>
      <MenuClient categorias={categorias} />
    </main>
  );
}
