import { NextResponse } from "next/server";
import { upstreamFetch, type UpstreamResponse } from "@/lib/http";

function withCookies(
  upstream: UpstreamResponse,
  json: unknown,
  status: number,
) {
  const res = NextResponse.json(json, { status });
  const cookies = upstream.__newCookies?.getAll();
  if (cookies) {
    for (const c of cookies) res.cookies.set(c);
  }
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.search;
  const upstream = await upstreamFetch(`/admin-management${q}`, {
    method: "GET",
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function POST(req: Request) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/admin-management`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
