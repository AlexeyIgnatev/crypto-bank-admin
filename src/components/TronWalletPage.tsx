"use client";

import { useEffect, useRef, useState } from "react";

function formatUsdt(value: number) {
  return `${value.toFixed(6)} USDT TRC20`;
}

type TronWalletPageProps = {
  storageKey: string;
  customerIdKey: string;
  title: string;
  badgeLabel: string;
  subtitle: string;
};

export default function TronWalletPage({
  storageKey,
  customerIdKey,
  title,
  badgeLabel,
  subtitle,
}: TronWalletPageProps) {
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("http://192.168.255.121:8090");
  const [balanceUsdt, setBalanceUsdt] = useState(0);
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStatus, setTransferStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Подготавливаю тестовый кошелёк...");
  const initOnce = useRef(false);

  async function refreshBalance(nextAddress = address, nextCustomerId = customerId) {
    if (!nextAddress && !nextCustomerId) return;

    const params = new URLSearchParams();
    if (nextAddress) params.set("address", nextAddress);
    if (nextCustomerId) params.set("customerId", nextCustomerId);

    const res = await fetch(`/api/tron-wallet/balance?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Не удалось получить баланс");
    }

    if (typeof data.balanceUsdt === "number") {
      setBalanceUsdt(Number(data.balanceUsdt || 0));
      return;
    }

    setBalanceUsdt(Number(data.balanceTrx || 0));
  }

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    (async () => {
      try {
        const savedPk = localStorage.getItem(storageKey);
        const savedCustomerId = localStorage.getItem(customerIdKey);
        const initUrl = savedPk
          ? `/api/tron-wallet/init?privateKey=${encodeURIComponent(savedPk)}${
              savedCustomerId ? `&customerId=${encodeURIComponent(savedCustomerId)}` : ""
            }`
          : "/api/tron-wallet/init";
        const initRes = await fetch(initUrl, { cache: "no-store" });
        const initData = await initRes.json().catch(() => ({}));
        const pk = String(initData?.privateKey || savedPk || "");
        const addr = String(initData?.address || "");
        const nextCustomerId = String(initData?.customerId || savedCustomerId || "");

        if (!pk) {
          throw new Error("Не удалось создать тестовый кошелёк");
        }

        localStorage.setItem(storageKey, pk);
        if (nextCustomerId) localStorage.setItem(customerIdKey, nextCustomerId);

        setPrivateKey(pk);
        setAddress(addr);
        setCustomerId(nextCustomerId);
        if (initData?.rpcUrl) setRpcUrl(String(initData.rpcUrl));
        setMessage(savedPk ? "Загружен сохранённый тестовый кошелёк" : "Создан новый тестовый кошелёк");

        if (addr || nextCustomerId) {
          await refreshBalance(addr, nextCustomerId);
        }
      } catch (error) {
        setMessage(`Ошибка инициализации: ${String(error)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyHeight = document.body.style.height;
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  return (
    <main className="min-h-[100svh] overflow-y-auto bg-[#06111f] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-6 pb-14 md:py-10">
        <section className="sticky top-4 z-20 rounded-3xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {badgeLabel}
              </div>
              <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
            </div>

            <div className="min-w-[240px] rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">Баланс сверху</div>
              <div className="mt-1 text-2xl font-semibold text-cyan-50">
                {loading ? "Loading..." : formatUsdt(balanceUsdt)}
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
                <input value={address} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Private key</div>
                <textarea value={privateKey} readOnly className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Customer ID</div>
                <input value={customerId} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">RPC</div>
                <input value={rpcUrl} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Balance</div>
                <input value={loading ? "Loading..." : formatUsdt(balanceUsdt)} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none" />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Перевод</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Кошелёк получателя</div>
                <input
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="TR..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Сумма</div>
                <input
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="10"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm outline-none"
                />
              </div>
              <button
                type="button"
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!customerId || !transferAddress || !transferAmount}
                onClick={async () => {
                  try {
                    setTransferStatus("Отправляю...");
                    const res = await fetch("/api/tron-wallet/transfer", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        customer_id: Number(customerId),
                        address: transferAddress.trim(),
                        amount: Number(transferAmount),
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data?.message || data?.error || "Перевод не удался");
                    }
                    setTransferStatus(`Готово. transaction_id=${data?.transaction_id ?? "OK"}`);
                    await refreshBalance();
                  } catch (error) {
                    setTransferStatus(`Ошибка: ${String(error)}`);
                  }
                }}
              >
                Send USDT TRC20
              </button>
              <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm text-slate-300">
                {transferStatus || "Можно отправлять на другой внутренний или внешний TRON-адрес."}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
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
                localStorage.removeItem(storageKey);
                localStorage.removeItem(customerIdKey);
                setPrivateKey("");
                setAddress("");
                setCustomerId("");
                setBalanceUsdt(0);
                setTransferAddress("");
                setTransferAmount("");
                setTransferStatus("");
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
    </main>
  );
}
