import { NextRequest, NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

function withCookies(upstream: any, json: any, status: number) {
  const res = NextResponse.json(json, { status });
  if ((upstream as any)?.__newCookies) {
    // @ts-expect-error - internal helper carries a CookieStore
    for (const c of (upstream as any).__newCookies.getAll()) res.cookies.set(c);
  }
  return res;
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await upstreamFetch(`/admin-management/${id}`, { method: "GET" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const upstream = await upstreamFetch(`/admin-management/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const upstream = await upstreamFetch(`/admin-management/${id}`, { method: "PUT", body: JSON.stringify(body) });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await upstreamFetch(`/admin-management/${id}`, { method: "DELETE" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
