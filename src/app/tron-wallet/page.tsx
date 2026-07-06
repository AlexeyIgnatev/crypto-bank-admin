"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

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
const TEST_WALLETS_KEY = "tron-wallet-test-accounts";

function formatTrx(sun: number) {
  return `${(sun / 1_000_000).toFixed(6)} TRX (${sun} sun)`;
}

function randomPk() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function TronWalletPage() {
  const [rpcUrl, setRpcUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [tokenContract, setTokenContract] = useState("");
  const [tokenRecipient, setTokenRecipient] = useState("");
  const [tokenAmount, setTokenAmount] = useState("10");
  const [testWallets, setTestWallets] = useState<Array<{ name: string; pk: string; address: string }>>([]);
  const [log, setLog] = useState<string[]>([]);

  const wallet = (() => {
    const TronWeb = typeof window !== "undefined" ? window.TronWeb : undefined;
    if (!privateKey || !rpcUrl || !TronWeb) return null;
    try {
      const cleanPk = privateKey.trim().replace(/^0x/, "");
      if (!/^[a-fA-F0-9]{64}$/.test(cleanPk)) return null;
      const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: cleanPk });
      return { tronWeb, cleanPk };
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "192.168.255.121";
    setRpcUrl(`http://${host}:8090`);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPrivateKey(saved);
    }
    const savedTestWallets = localStorage.getItem(TEST_WALLETS_KEY);
    if (savedTestWallets) {
      try {
        setTestWallets(JSON.parse(savedTestWallets));
      } catch {
        localStorage.removeItem(TEST_WALLETS_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!wallet) return;
    try {
      const addr = wallet.tronWeb.address.fromPrivateKey(wallet.cleanPk);
      setAddress(addr);
    } catch {
      setAddress("");
    }
  }, [wallet]);

  async function refreshBalance() {
    if (!wallet || !address) return;
    const sun = await wallet.tronWeb.trx.getBalance(address);
    setBalance(formatTrx(sun));
  }

  async function connect() {
    if (!wallet) throw new Error("Нужен валидный private key");
    const addr = wallet.tronWeb.address.fromPrivateKey(wallet.cleanPk);
    setAddress(addr);
    localStorage.setItem(STORAGE_KEY, wallet.cleanPk);
    await refreshBalance();
    setLog((prev) => [`wallet connected: ${addr}`, ...prev].slice(0, 30));
  }

  async function generateWallet() {
    const pk = randomPk();
    setPrivateKey(pk);
    localStorage.setItem(STORAGE_KEY, pk);
    const TronWeb = window.TronWeb;
    if (TronWeb) {
      const addr = TronWeb.address.fromPrivateKey(pk);
      setAddress(addr);
      setLog((prev) => [`wallet generated: ${addr}`, ...prev].slice(0, 30));
    }
  }

  async function sendTrx() {
    if (!wallet) throw new Error("Сначала подключи кошелек");
    const value = Number(amount.replace(",", "."));
    if (!recipient) throw new Error("Recipient empty");
    if (!Number.isFinite(value) || value <= 0) throw new Error("Amount must be > 0");
    const tx = await wallet.tronWeb.trx.sendTransaction(recipient, Math.round(value * 1_000_000));
    setLog((prev) => [`trx tx: ${JSON.stringify(tx)}`, ...prev].slice(0, 30));
    await refreshBalance();
  }

  async function sendToken() {
    if (!wallet) throw new Error("Сначала подключи кошелек");
    if (!tokenContract || !tokenRecipient || !tokenAmount) throw new Error("Заполни contract, recipient и amount");
    const token = await wallet.tronWeb.contract().at(tokenContract);
    const tx = await token.transfer(tokenRecipient, tokenAmount).send({ feeLimit: 1_000_000_000 });
    setLog((prev) => [`token tx: ${JSON.stringify(tx)}`, ...prev].slice(0, 30));
    await refreshBalance();
  }

  async function generateTwoTestWallets() {
    const TronWeb = window.TronWeb;
    if (!TronWeb) throw new Error("TronWeb not loaded");
    const wallets = [
      { name: "Sender / user wallet", pk: randomPk() },
      { name: "Receiver / common wallet", pk: randomPk() },
    ].map((item) => ({
      ...item,
      address: TronWeb.address.fromPrivateKey(item.pk),
    }));
    setTestWallets(wallets);
    localStorage.setItem(TEST_WALLETS_KEY, JSON.stringify(wallets));
    setLog((prev) => [
      `test wallets generated: ${wallets[0].address} / ${wallets[1].address}`,
      ...prev,
    ].slice(0, 30));
  }

  function selectTestWallet(pk: string) {
    setPrivateKey(pk);
    localStorage.setItem(STORAGE_KEY, pk);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Script src="https://cdn.jsdelivr.net/npm/tronweb/dist/TronWeb.js" strategy="afterInteractive" />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Tron Wallet
            </div>
            <h1 className="text-3xl font-semibold">Браузерный TRON-кошелек для тестовой сети</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Открывается на том же сервере, где крутится админка. Используй его для тестовых TRX / TRC20 переводов
              без реальных денег.
            </p>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm text-slate-400">RPC node</div>
            <input
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
              placeholder="http://192.168.255.121:8090"
            />
            <div className="mt-3 text-xs text-slate-500">
              Если Tron node открыт на этом же сервере, порт обычно <span className="font-mono">8090</span>.
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Кошелек</h2>
            <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-slate-400">Private key</label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm outline-none"
              placeholder="64 hex chars"
            />
            <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-slate-400">Address</label>
            <input
              value={address}
              readOnly
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm outline-none"
            />
            <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-slate-400">Balance</label>
            <input
              value={balance}
              readOnly
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm outline-none"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateWallet}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Generate wallet
              </button>
              <button
                type="button"
                onClick={() => connect().catch((e) => setLog((prev) => [`connect error: ${e.message}`, ...prev].slice(0, 30)))}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                Connect / refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setPrivateKey("");
                  setAddress("");
                  setBalance("");
                  setLog((prev) => ["wallet cleared", ...prev].slice(0, 30));
                }}
                className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => generateTwoTestWallets().catch((e) => setLog((prev) => [`generate test wallets error: ${e.message}`, ...prev].slice(0, 30)))}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100"
              >
                Generate 2 test wallets
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Тестовые кошельки</h2>
            <p className="mt-2 text-sm text-slate-300">
              Сгенерируй пару адресов, затем выбери нужный и нажми <span className="font-semibold">Connect / refresh</span>.
            </p>
            <div className="mt-4 space-y-3">
              {testWallets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                  Пока кошельков нет. Нажми Generate 2 test wallets.
                </div>
              ) : (
                testWallets.map((wallet) => (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => selectTestWallet(wallet.pk)}
                    className="block w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition hover:bg-slate-900"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{wallet.name}</div>
                    <div className="mt-2 font-mono text-sm break-all">{wallet.address}</div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Переводы</h2>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-sm font-medium text-cyan-200">Send TRX</div>
              <div className="mt-3 grid gap-3">
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient address"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
                />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount TRX"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => sendTrx().catch((e) => setLog((prev) => [`TRX error: ${e.message}`, ...prev].slice(0, 30)))}
                  className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Send TRX
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-sm font-medium text-cyan-200">Send TRC20</div>
              <div className="mt-3 grid gap-3">
                <input
                  value={tokenContract}
                  onChange={(e) => setTokenContract(e.target.value)}
                  placeholder="Token contract"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
                />
                <input
                  value={tokenRecipient}
                  onChange={(e) => setTokenRecipient(e.target.value)}
                  placeholder="Recipient address"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
                />
                <input
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Amount token"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => sendToken().catch((e) => setLog((prev) => [`Token error: ${e.message}`, ...prev].slice(0, 30)))}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Send token
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Log</h2>
            <textarea
              value={log.join("\n")}
              readOnly
              className="mt-4 min-h-56 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-xs outline-none"
              placeholder="Здесь будут транзакции и ошибки"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
