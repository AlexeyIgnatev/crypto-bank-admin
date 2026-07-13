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
      <button
        aria-label="Close overlay"
        className="absolute inset-0 animate-fade-in cursor-default"
        style={{ background: "color-mix(in srgb, var(--foreground) 58%, transparent)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-soft shadow-[0_30px_80px_rgba(15,23,42,0.22)] animate-pop-in card">
        <div className="flex items-center justify-between border-b border-soft px-5 py-4 sm:px-6">
          <div>
            <div className="hero-label">Окно</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">{title}</div>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-[var(--bg-soft)] text-xl leading-none transition hover-surface"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="max-h-[72vh] overflow-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
