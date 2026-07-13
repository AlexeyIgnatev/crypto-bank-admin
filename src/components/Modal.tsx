"use client";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.42), rgba(2,6,23,0.62))",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />
      <div className="relative w-[min(960px,calc(100vw-1.5rem))] max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[var(--card)] shadow-[0_40px_120px_rgba(15,23,42,0.28)] animate-pop-in">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              Детали
            </div>
            <div className="mt-1 truncate text-lg font-semibold text-fg">
              {title}
            </div>
          </div>
          <button
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_78%,var(--bg-soft))] text-lg transition hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
