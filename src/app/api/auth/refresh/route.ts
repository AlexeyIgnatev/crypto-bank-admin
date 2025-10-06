import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "@/lib/config";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const refresh = cookieStore.get("refreshToken")?.value;
  if (!refresh) return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  const upstream = await fetch(`${API_BASE}/admin-management/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: refresh }) });
  const data = await upstream.json().catch(() => null) as any;
  if (!upstream.ok || !data?.accessToken || !data?.refreshToken) return NextResponse.json({ message: "Refresh failed" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  const isHttps = new URL(req.url).protocol === "https:";
  res.cookies.set("accessToken", data.accessToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isHttps });
  res.cookies.set("refreshToken", data.refreshToken, { httpOnly: true, path: "/", sameSite: "lax", secure: isHttps });
  return res;
}
