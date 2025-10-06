import { NextRequest, NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

function withCookies(upstream: any, json: any, status: number) {
  const res = NextResponse.json(json, { status });
  if ((upstream as any)?.__newCookies) {
    // @ts-ignore
    for (const c of (upstream as any).__newCookies.getAll()) res.cookies.set(c);
  }
  return res;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const body = await req.json().catch(() => ({}));
  const { key } = await ctx.params;
  const upstream = await upstreamFetch(`/antifraud/rules/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body) });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
