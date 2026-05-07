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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/notifications/push/broadcast`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
