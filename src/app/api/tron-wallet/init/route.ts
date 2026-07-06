import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const providedPk = url.searchParams.get("privateKey")?.trim().replace(/^0x/, "");
  const { TronWeb } = await import("tronweb");
  const privateKey = /^[a-fA-F0-9]{64}$/.test(providedPk || "")
    ? providedPk
    : randomBytes(32).toString("hex");
  const address = TronWeb.address.fromPrivateKey(privateKey);

  return NextResponse.json({
    privateKey,
    address,
    rpcUrl: "http://192.168.255.121:8090",
  });
}
