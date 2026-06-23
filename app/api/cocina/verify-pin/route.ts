import { NextResponse } from "next/server";

const SESSION_COOKIE = "cocina_auth";
const SESSION_SECONDS = 12 * 60 * 60; // 12 horas

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { pin } = body as { pin?: string };

  const correct = process.env.COCINA_PIN;

  if (!correct) {
    return NextResponse.json(
      { ok: false, error: "COCINA_PIN no está configurado en el servidor" },
      { status: 500 }
    );
  }

  if (!pin || pin !== correct) {
    return NextResponse.json({ ok: false, error: "PIN incorrecto" }, { status: 401 });
  }

  // PIN correcto — establecer cookie de sesión en la respuesta
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    maxAge: SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
