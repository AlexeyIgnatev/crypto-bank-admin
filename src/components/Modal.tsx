"use client";
import { useEffect } from "react";

export default function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative w-[90vw] max-w-xl rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-xl animate-pop-in">
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <div className="font-semibold">{title}</div>
          <button aria-label="Close" className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={onClose}>✕</button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
