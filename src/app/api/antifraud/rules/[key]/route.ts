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

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  const body = await req.json().catch(() => ({}));
  const { key } = await ctx.params;
  const category = req.nextUrl.searchParams.get("category");
  const path = category
    ? `/antifraud/rules/${encodeURIComponent(key)}?category=${encodeURIComponent(category)}`
    : `/antifraud/rules/${encodeURIComponent(key)}`;
  const upstream = await upstreamFetch(
    path,
    { method: "PUT", body: JSON.stringify(body) },
  );
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
