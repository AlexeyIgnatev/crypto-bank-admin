import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE } from "./config";

export async function upstreamFetch(path: string, init?: RequestInit & { auth?: boolean }) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const hdrs: HeadersInit = { "Content-Type": "application/json" };

  // Next 15 Dynamic APIs are async
  try {
    const h = await headers();
    const forwardedFor = h.get("x-forwarded-for");
    if (forwardedFor) (hdrs as any)["x-forwarded-for"] = forwardedFor;
  } catch {}

  let access: string | undefined;
  let refresh: string | undefined;
  try {
    const cookieStore = await cookies();
    access = cookieStore.get("accessToken")?.value;
    refresh = cookieStore.get("refreshToken")?.value;
  } catch {}

  if (init?.auth !== false && access) (hdrs as any)["Authorization"] = `Bearer ${access}`;

  const res = await fetch(url, { ...init, headers: { ...hdrs, ...(init?.headers || {}) } });
  if (res.status !== 401) return res;

  // try refresh
  if (!refresh) return res;
  const rf = await fetch(`${API_BASE}/admin-management/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: refresh }) });
  if (!rf.ok) return res; // unable to refresh
  const data = await rf.json().catch(() => null) as any;
  if (!data?.accessToken || !data?.refreshToken) return res;

  // set new cookies; caller route should merge these into response
  const nextRes = NextResponse.next();
  nextRes.cookies.set("accessToken", data.accessToken, { httpOnly: true, path: "/", sameSite: "lax" });
  nextRes.cookies.set("refreshToken", data.refreshToken, { httpOnly: true, path: "/", sameSite: "lax" });

  // retry original
  const retry = await fetch(url, { ...init, headers: { ...hdrs, Authorization: `Bearer ${data.accessToken}`, ...(init?.headers || {}) } });
  return Object.assign(retry, { __newCookies: nextRes.cookies });
}

export function forwardCookiesIfAny(resp: Response, upstream: any) {
  const r = NextResponse.json(null, { status: resp.status });
  if ((upstream as any)?.__newCookies) {
    // @ts-ignore - next cookies API
    for (const c of (upstream as any).__newCookies.getAll()) r.cookies.set(c);
  }
  return r;
}
