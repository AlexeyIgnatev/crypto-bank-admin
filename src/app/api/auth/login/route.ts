import { NextRequest, NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export async function POST(req: NextRequest) {
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
    const isHttps = new URL(req.url).protocol === "https:";
    res.cookies.set("accessToken", data.accessToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isHttps });
    res.cookies.set("refreshToken", data.refreshToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isHttps });
    return res;
  }
  return NextResponse.json({ message: data?.message || "Ошибка авторизации" }, { status: upstream.status || 401 });
}
