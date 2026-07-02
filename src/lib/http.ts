import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE } from "./config";

export type UpstreamResponse = Response & {
  __newCookies?: {
    getAll(): Array<{
      name: string;
      value: string;
      path?: string;
      domain?: string;
      expires?: Date;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
    }>;
  };
};

export async function upstreamFetch(
  path: string,
  init?: RequestInit & { auth?: boolean },
) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const hdrs: HeadersInit = { "Content-Type": "application/json" };

  try {
    const h = await headers();
    const forwardedFor = h.get("x-forwarded-for");
    if (forwardedFor)
      (hdrs as Record<string, string>)["x-forwarded-for"] = forwardedFor;
  } catch {}

  let access: string | undefined;
  let refresh: string | undefined;
  try {
    const cookieStore = await cookies();
    access = cookieStore.get("accessToken")?.value;
    refresh = cookieStore.get("refreshToken")?.value;
  } catch {}

  if (init?.auth !== false && access)
    (hdrs as Record<string, string>)["Authorization"] = `Bearer ${access}`;

  const res = await fetch(url, {
    ...init,
    headers: { ...hdrs, ...(init?.headers || {}) },
  });
  if (res.status !== 401) return res;

  if (!refresh) return res;
  const rf = await fetch(`${API_BASE}/admin-management/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!rf.ok) return res;
  const data = (await rf.json().catch(() => null)) as {
    accessToken?: string;
    refreshToken?: string;
  } | null;
  if (!data?.accessToken || !data?.refreshToken) return res;

  const nextRes = NextResponse.next();
  nextRes.cookies.set("accessToken", data.accessToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
  nextRes.cookies.set("refreshToken", data.refreshToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  const retry = await fetch(url, {
    ...init,
    headers: {
      ...hdrs,
      Authorization: `Bearer ${data.accessToken}`,
      ...(init?.headers || {}),
    },
  });
  return Object.assign(retry, {
    __newCookies: nextRes.cookies,
  }) as UpstreamResponse;
}

export function forwardCookiesIfAny(
  resp: Response,
  upstream: UpstreamResponse,
) {
  const r = NextResponse.json(null, { status: resp.status });
  const cookies = upstream.__newCookies?.getAll();
  if (cookies) {
    for (const c of cookies) r.cookies.set(c);
  }
  return r;
}
