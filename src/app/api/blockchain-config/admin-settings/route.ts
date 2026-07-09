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

export async function GET() {
  const upstream = await upstreamFetch(`/blockchain-config/admin-settings`, {
    method: "GET",
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/blockchain-config/admin-settings`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
