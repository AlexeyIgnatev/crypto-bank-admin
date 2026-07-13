"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const next = params.get("next") || "/";
        if (typeof window !== "undefined") window.location.assign(next);
        else router.replace(next);
      } else {
        const data = await res
          .json()
          .catch(() => ({ message: "Ошибка авторизации" }));
        setError(data.message || "Ошибка авторизации");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1120px] px-4">
      <div className="grid overflow-hidden rounded-[32px] border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] shadow-[0_36px_100px_rgba(15,23,42,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative overflow-hidden p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_40%)]" />
          <div className="relative flex h-full min-h-[320px] flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                <BankMark />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                  BRICS Bank
                </div>
                <div className="text-lg font-semibold text-fg">Admin Console</div>
              </div>
            </div>

            <div className="max-w-md">
              <div className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] px-3 py-1 text-xs font-semibold text-[color:var(--primary-hover)]">
                Secure access only
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-fg lg:text-5xl">
                Красивый административный вход без лишнего шума
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted lg:text-base">
                Лёгкая и аккуратная форма входа с той же рабочей логикой, но
                в более дорогой, спокойной и собранной визуальной оболочке.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
              <InfoPill title="Транзакции" value="В реальном времени" />
              <InfoPill title="Комиссии" value="Под контролем" />
              <InfoPill title="Роли" value="По правам доступа" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_98%,white),color-mix(in_srgb,var(--bg-soft)_55%,transparent))] p-6 lg:p-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-[28px] border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-muted">
              Авторизация
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-fg">
              Вход в панель
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Используйте учётные данные администратора.
            </p>

            <label className="mt-5 block text-sm font-medium text-fg">
              Email
            </label>
            <input
              className="ui-input mt-2 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />

            <label className="mt-4 block text-sm font-medium text-fg">
              Пароль
            </label>
            <input
              className="ui-input mt-2 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
            />

            {error && (
              <div className="mt-4 rounded-2xl border border-[color:var(--danger)]/20 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--danger)]">
                {error}
              </div>
            )}

            <button className="btn btn-primary mt-6 h-11 w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface rounded-[22px] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {title}
      </div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function BankMark() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 6l8 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V18M10 10.5V18M14 10.5V18M18 10.5V18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full grid place-items-center text-sm text-muted">
          Загрузка…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
