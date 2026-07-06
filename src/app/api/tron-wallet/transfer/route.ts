import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const upstream = await upstreamFetch(`/payments/browser-wallet/transfer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => ({}));
  return NextResponse.json(json, { status: upstream.status });
}
