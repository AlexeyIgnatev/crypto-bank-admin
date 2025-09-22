"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Initial theme: saved -> system -> light
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const system: Theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const next = saved ?? system;
    setTheme(next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Animate theme switch
    const root = document.documentElement;
    root.classList.add("theme-switching");
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    const id = window.setTimeout(() => root.classList.remove("theme-switching"), 350);
    return () => window.clearTimeout(id);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }), [theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
