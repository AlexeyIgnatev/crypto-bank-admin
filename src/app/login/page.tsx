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
        // Хард-редирект гарантирует, что браузер отправит свежие куки на следующий запрос
        if (typeof window !== "undefined") window.location.assign(next);
        else router.replace(next);
      } else {
        const data = await res.json().catch(() => ({ message: "Ошибка авторизации" }));
        setError(data.message || "Ошибка авторизации");
      }
    } catch (err) {
      setError("Сетевая ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full grid place-items-center">
      <form onSubmit={handleSubmit} className="w-[360px] p-6 rounded-2xl border border-soft card shadow-sm">
        <div className="text-2xl font-semibold mb-1">Вход администратора</div>
        <div className="text-sm text-muted mb-4">Введите email и пароль</div>
        <label className="text-sm mb-1 block">Email</label>
        <input className="ui-input w-full mb-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
        <label className="text-sm mb-1 block">Пароль</label>
        <input className="ui-input w-full mb-4" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
        {error && <div className="mb-3 text-sm text-[color:var(--danger)]">{error}</div>}
        <button className="btn btn-primary w-full h-10" disabled={loading}>{loading ? "Вход..." : "Войти"}</button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full h-full grid place-items-center text-sm text-muted">Загрузка…</div>}>
      <LoginContent />
    </Suspense>
  );
}
