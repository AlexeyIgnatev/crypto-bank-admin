"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [login, setLogin] = useState("");
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
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      if (res.ok) {
        const next = params.get("next") || "/";
        router.replace(next);
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
        <div className="text-sm text-muted mb-4">Введите логин и пароль</div>
        <label className="text-sm mb-1 block">Логин</label>
        <input className="ui-input w-full mb-3" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="login" />
        <label className="text-sm mb-1 block">Пароль</label>
        <input className="ui-input w-full mb-4" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
        {error && <div className="mb-3 text-sm text-[color:var(--danger)]">{error}</div>}
        <button className="btn btn-primary w-full h-10" disabled={loading}>{loading ? "Вход..." : "Войти"}</button>
      </form>
    </div>
  );
}
