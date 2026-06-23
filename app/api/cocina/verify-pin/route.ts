import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "cocina_auth";
const SESSION_HOURS  = 12;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { pin } = body as { pin?: string };

  const correct = process.env.COCINA_PIN;
  if (!correct) {
    return NextResponse.json({ ok: false, error: "PIN no configurado" }, { status: 500 });
  }

  if (!pin || pin !== correct) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    maxAge: SESSION_HOURS * 60 * 60,
    path: "/",
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true });
}
