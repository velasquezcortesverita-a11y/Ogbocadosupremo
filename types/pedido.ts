export interface CierreDia {
  id: string;
  fecha: string;
  total_sinpe: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_general: number;
  cantidad_pedidos: number;
  created_at: string;
}

export type PedidoItem = {
  id: string;
  nombre_producto: string;
  cantidad: number;
  precio: number;
  extras?: { nombre: string; precio: number; cantidad?: number }[];
};

export type Pedido = {
  id: string;
  numero_pedido: number;
  nombre_cliente: string;
  telefono: string;
  comentarios: string | null;
  metodo_pago: string;
  total: number | string;
  estado: string;
  created_at: string;
  delivery_method: "pickup" | "delivery" | null;
  delivery_address: string | null;
  comprobante_url?: string | null;
  comprobante_revisado?: boolean | null;
  origen?: string | null;
  pedido_items?: PedidoItem[];
};
