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

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const path = category
    ? `/antifraud/rules?category=${encodeURIComponent(category)}`
    : `/antifraud/rules`;
  const upstream = await upstreamFetch(path, { method: "GET" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
