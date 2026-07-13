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
    <div className="relative grid min-h-[calc(100vh-2rem)] w-full place-items-center overflow-hidden rounded-[32px] border border-soft bg-[color-mix(in_srgb,var(--card)_88%,transparent)] px-4 py-10 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_38%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_30%)]" />
      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden rounded-[28px] border border-white/50 bg-white/70 p-8 shadow-[0_20px_70px_rgba(185,28,28,0.12)] backdrop-blur xl:block">
          <div className="hero-label">Crypto Bank Admin</div>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-[color:var(--foreground)]">
            Управление банком в чистом, дорогом и спокойном интерфейсе
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Все данные, таблицы, фильтры и сценарии входа остаются прежними.
            Меняется только подача: меньше шума, больше структуры и аккуратных акцентов.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <MiniStat label="Роль" value="Admin / Finance" />
            <MiniStat label="Палитра" value="White / Red" />
            <MiniStat label="Режим" value="Secure dashboard" />
            <MiniStat label="Фокус" value="Operations first" />
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="surface-card rounded-[28px] border border-soft p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8"
        >
          <div className="hero-label">Авторизация</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            Вход администратора
          </div>
          <div className="mt-3 text-sm text-muted">
            Введите email и пароль, чтобы попасть в панель управления.
          </div>
          <div className="mt-7 space-y-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <input
                className="ui-input h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Пароль</span>
              <input
                className="ui-input h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="password"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button className="btn btn-primary mt-6 h-11 w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-soft bg-white/80 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[calc(100vh-2rem)] place-items-center text-sm text-muted">
          Загрузка...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
