import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/notifications/push/broadcast`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
