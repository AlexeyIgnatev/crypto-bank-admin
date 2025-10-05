import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

function withCookies(upstream: any, json: any, status: number) {
  const res = NextResponse.json(json, { status });
  if ((upstream as any)?.__newCookies) {
    // @ts-ignore
    for (const c of (upstream as any).__newCookies.getAll()) res.cookies.set(c);
  }
  return res;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const upstream = await upstreamFetch(`/admin-management/${params.id}`, { method: "GET" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/admin-management/${params.id}`, { method: "PATCH", body: JSON.stringify(body) });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/admin-management/${params.id}`, { method: "PUT", body: JSON.stringify(body) });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const upstream = await upstreamFetch(`/admin-management/${params.id}`, { method: "DELETE" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
