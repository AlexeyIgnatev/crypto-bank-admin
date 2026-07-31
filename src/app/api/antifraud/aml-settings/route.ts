import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const upstream = await upstreamFetch("/antifraud/aml-settings", {
    cache: "no-store",
  });
  const json = await upstream.json().catch(() => ({}));
  return NextResponse.json(json, { status: upstream.status });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const upstream = await upstreamFetch("/antifraud/aml-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const json = await upstream.json().catch(() => ({}));
  return NextResponse.json(json, { status: upstream.status });
}
