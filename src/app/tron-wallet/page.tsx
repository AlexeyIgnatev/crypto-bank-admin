"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "tron-wallet-private-key";

function formatTrx(value: number) {
  return `${value.toFixed(6)} TRX`;
}

export default function TronWalletPage() {
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [rpcUrl, setRpcUrl] = useState("http://192.168.255.121:8090");
  const [balanceTrx, setBalanceTrx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Подготавливаю тестовый кошелёк...");
  const initOnce = useRef(false);

  async function refreshBalance(nextAddress = address) {
    if (!nextAddress) return;

    const res = await fetch(`/api/tron-wallet/balance?address=${encodeURIComponent(nextAddress)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Не удалось получить баланс");
    }

    setBalanceTrx(Number(data.balanceTrx || 0));
  }

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    (async () => {
      try {
        const savedPk = localStorage.getItem(STORAGE_KEY);
        const initUrl = savedPk
          ? `/api/tron-wallet/init?privateKey=${encodeURIComponent(savedPk)}`
          : "/api/tron-wallet/init";
        const initRes = await fetch(initUrl, { cache: "no-store" });
        const initData = await initRes.json().catch(() => ({}));
        const pk = String(initData?.privateKey || savedPk || "");
        const addr = String(initData?.address || "");

        if (!pk) {
          throw new Error("Не удалось создать тестовый кошелёк");
        }

        localStorage.setItem(STORAGE_KEY, pk);
        setPrivateKey(pk);
        setAddress(addr);
        if (initData?.rpcUrl) setRpcUrl(String(initData.rpcUrl));
        setMessage(savedPk ? "Загружен сохранённый тестовый кошелёк" : "Создан новый тестовый кошелёк");

        if (addr) {
          await refreshBalance(addr);
        }
      } catch (error) {
        setMessage(`Ошибка инициализации: ${String(error)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen overflow-y-auto bg-[#06111f] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-6 pb-14 md:py-10">
        <section className="sticky top-4 z-20 rounded-3xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Tron wallet
              </div>
              <h1 className="mt-3 text-3xl font-semibold">Тестовый TRON-кошелёк</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Кошелёк создаётся автоматически и хранится локально в браузере. Страница открывается только по прямой ссылке.
              </p>
            </div>

            <div className="min-w-[240px] rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">Баланс сверху</div>
              <div className="mt-1 text-2xl font-semibold text-cyan-50">
                {loading ? "Loading..." : formatTrx(balanceTrx)}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Данные кошелька</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</div>
                <input
                  value={address}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Private key</div>
                <textarea
                  value={privateKey}
                  readOnly
                  className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">RPC</div>
                <input
                  value={rpcUrl}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Balance</div>
                <input
                  value={loading ? "Loading..." : formatTrx(balanceTrx)}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Статус</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm text-slate-300">
              {message}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={async () => {
                  try {
                    setLoading(true);
                    await refreshBalance();
                    setMessage("Баланс обновлён");
                  } catch (error) {
                    setMessage(`Ошибка обновления: ${String(error)}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Refresh balance
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setPrivateKey("");
                  setAddress("");
                  setBalanceTrx(0);
                  setMessage("Локальный кошелёк очищен");
                }}
              >
                Reset local wallet
              </button>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Если нужен новый кошелёк, очисти локальный и просто открой страницу снова.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
