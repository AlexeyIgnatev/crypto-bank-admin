import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") || "";
  const customerIdRaw = url.searchParams.get("customerId") || "";

  if (customerIdRaw) {
    const customerId = Number(customerIdRaw);
    if (Number.isInteger(customerId) && customerId > 0) {
      const upstream = await upstreamFetch(`/user-management/${customerId}`, {
        method: "GET",
      });
      const data = await upstream.json().catch(() => ({}));
      const balanceUsdt = Number(data?.balances?.USDT_TRC20 ?? 0);
      return NextResponse.json({
        balanceUsdt,
        raw: data,
      });
    }
  }

  if (!address) {
    return NextResponse.json({ error: "address or customerId is required" }, { status: 400 });
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
    balanceTrx: balanceSun / 1_000_000,
    raw: data,
  });
}