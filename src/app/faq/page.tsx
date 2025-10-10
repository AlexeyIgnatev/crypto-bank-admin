"use client";
import FAQ from "@/components/FAQ";

export default function FAQPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden w-full">
      <div className="card border border-soft rounded-xl p-4">
        <FAQ />
      </div>
    </div>
  );
}
