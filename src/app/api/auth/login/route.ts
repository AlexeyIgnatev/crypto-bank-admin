import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Try upstream first
  try {
    const upstreamBody = { email: (body as any).email || (body as any).login, password: (body as any).password };
    const upstream = await upstreamFetch("/admin-management/auth/login", { method: "POST", body: JSON.stringify(upstreamBody), auth: false });
    const data = await upstream.json().catch(() => null) as any;
    if (upstream.ok && data?.accessToken && data?.refreshToken) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("accessToken", data.accessToken, { httpOnly: true, path: "/", sameSite: "lax" });
      res.cookies.set("refreshToken", data.refreshToken, { httpOnly: true, path: "/", sameSite: "lax" });
      return res;
    }
  } catch {}

  // Fallback demo auth (no backend): admin/admin
  if (body?.login === "admin" && body?.password === "admin") {
    const res = NextResponse.json({ ok: true, demo: true });
    res.cookies.set("admin_auth", "1", { httpOnly: true, path: "/", sameSite: "lax" });
    return res;
  }
  return NextResponse.json({ message: "Ошибка авторизации" }, { status: 401 });
}
