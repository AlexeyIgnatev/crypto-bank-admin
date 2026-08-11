import { NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminResponse = await upstreamFetch("/admin-management/me", {
    method: "GET",
  });
  const admin = await adminResponse.json().catch(() => null);
  if (!adminResponse.ok || admin?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet")?.trim() || "tron-wallet";
  const suffixByWallet: Record<string, string> = {
    "tron-wallet": "",
    "tron-wallet1": "_1",
    "tron-wallet2": "_2",
    "tron-wallet3": "_3",
  };
  const suffix = suffixByWallet[wallet];
  if (suffix === undefined) {
    return NextResponse.json({ error: "Unknown wallet" }, { status: 404 });
  }

  const privateKey =
    process.env[`TRON_WALLET_PRIVATE_KEY${suffix}`]?.trim() || "";
  const customerId = Number(process.env[`TRON_WALLET_CUSTOMER_ID${suffix}`]);
  if (
    !/^[0-9a-fA-F]{64}$/.test(privateKey) ||
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    return NextResponse.json(
      { error: `Server wallet ${wallet} is not configured` },
      { status: 503 },
    );
  }

  const registerRes = await upstreamFetch("/users/browser-wallet", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      private_key: privateKey,
    }),
    cache: "no-store",
  });
  if (!registerRes.ok) {
    const details = await registerRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: "Wallet registration failed", details },
      { status: registerRes.status },
    );
  }
  const registeredWallet = await registerRes.json().catch(() => null);
  const address = String(registeredWallet?.address || "");
  if (!address) {
    return NextResponse.json(
      { error: "Wallet registration returned no address" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    privateKey,
    address,
    rpcUrl: "http://192.168.255.121:8090",
    customerId,
  });
}
