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

export async function PATCH(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const upstream = await upstreamFetch(
    `/support/admin/tickets/${encodeURIComponent(id)}/close`,
    { method: "PATCH" },
  );
  const json = await upstream.json().catch(() => null);
  return withCookies(upstream, json, upstream.status);
}
