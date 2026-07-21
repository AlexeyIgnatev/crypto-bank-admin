"use client";

import { faqSections } from "@/lib/faq";

export default function Terms() {
  const termsSection = faqSections.find((section) => section.id === "terms");

  if (!termsSection) {
    return (
      <div className="card rounded-2xl border border-soft p-6">
        <div className="text-lg font-semibold">Термины</div>
        <p className="mt-2 text-sm text-muted">Раздел терминов пока не настроен.</p>
      </div>
    );
  }

  return (
    <div className="faq-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth" style={{ scrollbarGutter: "stable" }}>
      <div className="space-y-6">
        <header className="faq-hero rounded-2xl p-6 md:p-7">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-soft bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Термины
            </div>
            <div>
              <h1 className="text-3xl font-bold text-fg md:text-4xl">{termsSection.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base">
                {termsSection.summary}
              </p>
            </div>
          </div>
        </header>

        <section className="card rounded-2xl border border-soft p-5 md:p-6">
          <div className="grid gap-3">
            {termsSection.items.map((item) => (
              <article
                key={item.question}
                className="rounded-xl border border-soft bg-[color-mix(in_srgb,var(--bg-soft)_50%,transparent)] p-4"
              >
                <h3 className="text-sm font-semibold text-fg md:text-base">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted md:text-[15px]">{item.answer}</p>
                {item.bullets && item.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
