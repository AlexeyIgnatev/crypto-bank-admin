"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return (
      <div className="flex" style={{ height: "100svh", overflow: "hidden" }}>
        <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
          <Topbar title="Вход" />
          <main className="grid place-items-center p-6" style={{ background: "var(--bg-soft)", height: "calc(100svh - 3.5rem - 1px)", overflow: "hidden" }}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ height: "100svh", overflow: "hidden" }}>
        <Topbar title="Главная" />
        <main className="min-h-0 flex-1 overflow-hidden p-4 max-w-[1400px] mx-auto flex flex-col gap-4">{children}</main>
      </div>
    </div>
  );
}
