import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

// TODO: cambiar el remitente a algo@bocadosupremo.com una vez que el dominio
// bocadosupremo.com esté verificado en Resend.

type Payload = {
  sinpeTotal:     number;
  sinpeCantidad:  number;
  efectivoTotal:  number;
  efectivoCantidad: number;
  generalTotal:   number;
  generalCantidad: number;
  horaInicio:     string;
  horaCierre:     string;
  productoMasVendido: { nombre: string; cantidad: number } | null;
};

function fmt(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

function formatFechaCompleta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CR", {
    timeZone: "America/Costa_Rica",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function buildHtml(p: Payload): string {
  const fecha        = formatFechaCompleta(p.horaCierre);
  const horaCierre   = formatHora(p.horaCierre);
  const horaInicio   = formatHora(p.horaInicio);

  const tdBase = `font-family:Arial,sans-serif;`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:32px 16px;">

  <!-- Contenedor principal -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- HEADER naranja -->
    <tr>
      <td bgcolor="#f97316" style="padding:32px 32px 24px;text-align:center;">
        <p style="${tdBase}margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.85);text-transform:uppercase;">
          Bocado Supremo
        </p>
        <p style="${tdBase}margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;">
          Cierre del día
        </p>
        <p style="${tdBase}margin:0;font-size:14px;color:rgba(255,255,255,0.9);text-transform:capitalize;">
          ${fecha}
        </p>
      </td>
    </tr>

    <!-- CUERPO -->
    <tr>
      <td style="padding:28px 28px 8px;">

        <!-- Tarjetas SINPE + Efectivo -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
          <tr>

            <!-- SINPE Móvil -->
            <td width="48%" valign="top"
                style="${tdBase}background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                📱 SINPE Móvil
              </p>
              <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#2563eb;">
                ${fmt(p.sinpeTotal)}
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${p.sinpeCantidad} pedido${p.sinpeCantidad !== 1 ? "s" : ""}
              </p>
            </td>

            <td width="4%"></td>

            <!-- Efectivo -->
            <td width="48%" valign="top"
                style="${tdBase}background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                💵 Efectivo
              </p>
              <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#16a34a;">
                ${fmt(p.efectivoTotal)}
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${p.efectivoCantidad} pedido${p.efectivoCantidad !== 1 ? "s" : ""}
              </p>
            </td>

          </tr>
        </table>

        <!-- Total del día -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
          <tr>
            <td style="${tdBase}background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                      Total del día
                    </p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;">
                      ${p.generalCantidad} pedido${p.generalCantidad !== 1 ? "s" : ""} entregado${p.generalCantidad !== 1 ? "s" : ""}
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="${tdBase}margin:0;font-size:28px;font-weight:900;color:#f97316;">
                      ${fmt(p.generalTotal)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Producto más vendido -->
        ${p.productoMasVendido ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
          <tr>
            <td style="${tdBase}background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                🏆 Producto más vendido
              </p>
              <p style="margin:0 0 2px;font-size:16px;font-weight:700;color:#111827;">
                ${p.productoMasVendido.nombre}
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${p.productoMasVendido.cantidad} unidad${p.productoMasVendido.cantidad !== 1 ? "es" : ""} vendida${p.productoMasVendido.cantidad !== 1 ? "s" : ""}
              </p>
            </td>
          </tr>
        </table>
        ` : ""}

        <!-- Hora de cierre -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="${tdBase}border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                🕐 Jornada: <strong style="color:#6b7280;">${horaInicio}</strong>
                &nbsp;→&nbsp;
                <strong style="color:#6b7280;">${horaCierre}</strong>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td bgcolor="#f9fafb" style="${tdBase}padding:16px 28px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          Bocado Supremo &middot; Santa Eulalia, Atenas
        </p>
      </td>
    </tr>

  </table>
  <!-- fin contenedor -->

</td></tr>
</table>

</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Instanciar dentro del handler para que process.env esté disponible en runtime
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const payload = (await req.json()) as Payload;

    const { error } = await resend.emails.send({
      from:    "onboarding@resend.dev",
      to:      "sharoncortes519@gmail.com",
      subject: `Cierre del día — ${formatFechaCompleta(payload.horaCierre)}`,
      html:    buildHtml(payload),
    });

    if (error) {
      console.error("[enviar-reporte-cierre] Resend error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[enviar-reporte-cierre] Error inesperado:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
