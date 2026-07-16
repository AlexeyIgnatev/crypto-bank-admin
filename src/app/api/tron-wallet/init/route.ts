import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet")?.trim() || "tron-wallet";
  const { TronWeb } = await import("tronweb");
  const presets: Record<
    string,
    { address: string; privateKey: string; customerId: number }
  > = {
    "tron-wallet": {
      address: "TRVh3EuuWTkCfECfXM77SGZZZQwJT49WBm",
      privateKey: "275857fc71f175075d7703bffd5018be7f3e196fb95a2c528dd060aaa3f96bf2",
      customerId: 922686094,
    },
    "tron-wallet1": {
      address: "TT1DfhAby43Xya5pR4XYKRhy93gSFWByXg",
      privateKey: "7dd79b709f1a056c6a794b6be343dd6b61c9cc4ba7400ca15814ad2d31ffdb08",
      customerId: 944629427,
    },
  };
  const preset = presets[wallet] || presets["tron-wallet"];
  const privateKey = preset.privateKey;
  const address = TronWeb.address.fromPrivateKey(privateKey);

  try {
    const registerRes = await fetch(`${API_BASE}/users/browser-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: preset.customerId,
        private_key: privateKey,
        address,
      }),
      cache: "no-store",
    });
    await registerRes.json().catch(() => ({}));
  } catch {}

  return NextResponse.json({
    privateKey,
    address,
    rpcUrl: "http://192.168.255.121:8090",
    customerId: preset.customerId,
  });
}
