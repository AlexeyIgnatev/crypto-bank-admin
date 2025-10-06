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

export async function PATCH(_: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const upstream = await upstreamFetch(`/antifraud/cases/${encodeURIComponent(id)}/approve`, { method: "PATCH" });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
