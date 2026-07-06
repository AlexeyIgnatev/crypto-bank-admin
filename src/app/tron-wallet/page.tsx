"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type TronWebCtor = {
  new (options: { fullHost: string; privateKey?: string }): {
    address: { fromPrivateKey(pk: string): string };
    trx: {
      getBalance(address: string): Promise<number>;
      sendTransaction(to: string, amountSun: number): Promise<any>;
    };
    contract(): {
      at(address: string): Promise<{
        transfer(to: string, amount: string | number): {
          send(options: { feeLimit: number }): Promise<any>;
        };
      }>;
    };
  };
  address: {
    fromPrivateKey(pk: string): string;
  };
};

declare global {
  interface Window {
    TronWeb?: TronWebCtor;
  }
}

const STORAGE_KEY = "tron-wallet-private-key";
const RPC_HOST = "http://192.168.255.121:8090";

function randomPk() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatTrx(sun: number) {
  return `${(sun / 1_000_000).toFixed(6)} TRX (${sun} sun)`;
}

export default function TronWalletPage() {
  const [scriptReady, setScriptReady] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [tokenContract, setTokenContract] = useState("");
  const [tokenRecipient, setTokenRecipient] = useState("");
  const [tokenAmount, setTokenAmount] = useState("10");
  const [log, setLog] = useState<string[]>([]);
  const initOnce = useRef(false);

  const wallet = useMemo(() => {
    const TronWeb = typeof window !== "undefined" ? window.TronWeb : undefined;
    if (!privateKey || !TronWeb) return null;
    const cleanPk = privateKey.trim().replace(/^0x/, "");
    if (!/^[a-fA-F0-9]{64}$/.test(cleanPk)) return null;
    const tronWeb = new TronWeb({ fullHost: RPC_HOST, privateKey: cleanPk });
    return { tronWeb, cleanPk };
  }, [privateKey]);

  useEffect(() => {
    if (!scriptReady || initOnce.current) return;
    initOnce.current = true;

    const saved = localStorage.getItem(STORAGE_KEY);
    const pk = saved && /^[a-fA-F0-9]{64}$/.test(saved.trim()) ? saved.trim() : randomPk();
    localStorage.setItem(STORAGE_KEY, pk);
    setPrivateKey(pk);

    const TronWeb = window.TronWeb;
    if (TronWeb) {
      const addr = TronWeb.address.fromPrivateKey(pk);
      setAddress(addr);
      setLog([saved ? `Loaded wallet: ${addr}` : `Created wallet: ${addr}`]);
    }
  }, [scriptReady]);

  useEffect(() => {
    if (!wallet) return;
    const addr = wallet.tronWeb.address.fromPrivateKey(wallet.cleanPk);
    setAddress(addr);
  }, [wallet]);

  useEffect(() => {
    if (!wallet || !address) return;
    wallet.tronWeb.trx.getBalance(address).then((sun) => {
      setBalance(formatTrx(sun));
    }).catch(() => {
      setBalance("-");
    });
  }, [wallet, address]);

  async function sendTrx() {
    if (!wallet) throw new Error("Wallet not ready");
    const value = Number(amount.replace(",", "."));
    if (!recipient) throw new Error("Recipient empty");
    if (!Number.isFinite(value) || value <= 0) throw new Error("Amount must be > 0");
    const tx = await wallet.tronWeb.trx.sendTransaction(recipient, Math.round(value * 1_000_000));
    setLog((prev) => [`TRX tx: ${JSON.stringify(tx)}`, ...prev].slice(0, 30));
    const sun = await wallet.tronWeb.trx.getBalance(address);
    setBalance(formatTrx(sun));
  }

  async function sendToken() {
    if (!wallet) throw new Error("Wallet not ready");
    if (!tokenContract || !tokenRecipient || !tokenAmount) throw new Error("Fill token fields");
    const token = await wallet.tronWeb.contract().at(tokenContract);
    const tx = await token.transfer(tokenRecipient, tokenAmount).send({ feeLimit: 1_000_000_000 });
    setLog((prev) => [`TRC20 tx: ${JSON.stringify(tx)}`, ...prev].slice(0, 30));
    const sun = await wallet.tronWeb.trx.getBalance(address);
    setBalance(formatTrx(sun));
  }

  return (
    <main className="min-h-screen bg-[#06111f] text-slate-100">
      <Script
        src="https://cdn.jsdelivr.net/npm/tronweb/dist/TronWeb.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Tron wallet
            </div>
            <h1 className="mt-4 text-3xl font-semibold">Тестовый TRON-кошелек</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Страница не показывается в меню и открывается только по прямой ссылке. Кошелек создается автоматически при первом открытии.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">RPC</div>
            <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm">
              {RPC_HOST}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Кошелек</h2>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Private key</div>
              <textarea
                value={privateKey}
                readOnly
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
              />
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</div>
              <input
                value={address}
                readOnly
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
              />
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Balance</div>
              <input
                value={balance}
                readOnly
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Перевод TRX</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient address"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount TRX"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => sendTrx().catch((e) => setLog((prev) => [`TRX error: ${e.message}`, ...prev].slice(0, 30)))}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Send TRX
              </button>
            </div>

            <h2 className="mt-6 text-lg font-semibold">Перевод TRC20</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={tokenContract}
                onChange={(e) => setTokenContract(e.target.value)}
                placeholder="Token contract"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <input
                value={tokenRecipient}
                onChange={(e) => setTokenRecipient(e.target.value)}
                placeholder="Recipient address"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <input
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="Amount token"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => sendToken().catch((e) => setLog((prev) => [`Token error: ${e.message}`, ...prev].slice(0, 30)))}
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Send token
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Log</h2>
            <textarea
              value={log.join("\n")}
              readOnly
              className="mt-4 min-h-56 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-xs outline-none"
              placeholder="Тут будут адрес, баланс и tx"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
