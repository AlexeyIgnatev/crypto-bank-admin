import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";
import { isProd } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = (body as any).email;
  const password = (body as any).password;
  if (!email || !password) {
    return NextResponse.json({ message: "Email и пароль обязательны" }, { status: 400 });
  }

  const upstream = await upstreamFetch("/admin-management/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  const data = await upstream.json().catch(() => null as any);
  if (upstream.ok && data?.accessToken && data?.refreshToken) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("accessToken", data.accessToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isProd });
    res.cookies.set("refreshToken", data.refreshToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isProd });
    return res;
  }
  return NextResponse.json({ message: data?.message || "Ошибка авторизации" }, { status: upstream.status || 401 });
}
