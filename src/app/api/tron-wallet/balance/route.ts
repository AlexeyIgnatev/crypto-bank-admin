import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") || "";
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const rpcUrl = "http://192.168.255.121:8090";
  const res = await fetch(`${rpcUrl}/wallet/getaccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  const balanceSun = Number(data?.balance || 0);

  return NextResponse.json({
    balanceSun,
    balanceTrx: balanceSun / 1_000_000,
    raw: data,
  });
}
