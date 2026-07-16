import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet")?.trim() || "tron-wallet";
  const providedPk = url.searchParams.get("privateKey")?.trim().replace(/^0x/, "");
  const providedCustomerIdRaw = url.searchParams.get("customerId")?.trim() || "";
  const { TronWeb } = await import("tronweb");
  const fixedAddressByWallet: Record<string, string> = {
    "tron-wallet": "TRVh3EuuWTkCfECfXM77SGZZZQwJT49WBm",
    "tron-wallet1": "TAkrzNdEsCbiHwBXzTKX72NLkoLtXh1SFv",
  };
  const fixedAddress = fixedAddressByWallet[wallet] || fixedAddressByWallet["tron-wallet"];
  const privateKey = /^[a-fA-F0-9]{64}$/.test(providedPk || "") ? providedPk : "";
  const address = privateKey ? TronWeb.address.fromPrivateKey(privateKey) : fixedAddress;

  const customerId = Number(providedCustomerIdRaw);
  let registeredCustomerId: number | null = null;
  if (privateKey) {
    try {
      const registerRes = await fetch(`${API_BASE}/users/browser-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Number.isInteger(customerId) && customerId > 0
            ? {
                customer_id: customerId,
                private_key: privateKey,
                address,
              }
            : {
                private_key: privateKey,
                address,
              },
        ),
        cache: "no-store",
      });
      const registerData = await registerRes.json().catch(() => ({}));
      registeredCustomerId =
        Number(registerData?.customer_id || registerData?.customerId || 0) ||
        null;
    } catch {}
  }

  return NextResponse.json({
    privateKey,
    address,
    rpcUrl: "http://192.168.255.121:8090",
    customerId: registeredCustomerId || (customerId > 0 ? customerId : null),
  });
}
