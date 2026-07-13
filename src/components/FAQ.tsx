"use client";

import Link from "next/link";
import { useEffect } from "react";
import { faqSections } from "@/lib/faq";

export default function FAQ() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div
      className="faq-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="space-y-6">
        <header className="faq-hero rounded-2xl p-6 md:p-7">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-soft bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              FAQ
            </div>
            <div>
              <h1 className="text-3xl font-bold text-fg md:text-4xl">
                FAQ по разделам админки
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base">
                Здесь собраны короткие и понятные объяснения по каждому разделу.
                Если не ясно, что делает страница, нажмите значок <span className="font-semibold text-fg">?</span> справа сверху в нужном разделе
                или перейдите по ссылке ниже.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {faqSections.map((section) => (
              <Link
                key={section.id}
                href={`/faq#${section.id}`}
                className="pill text-sm"
              >
                {section.title}
              </Link>
            ))}
          </div>
        </header>

        <div className="space-y-4">
          {faqSections.map((section) => (
            <section
              id={section.id}
              key={section.id}
              className="card rounded-2xl border border-soft p-5 md:p-6 scroll-mt-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-fg md:text-2xl">
                    {section.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-muted md:text-[15px]">
                    {section.summary}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {section.items.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-xl border border-soft bg-[color-mix(in_srgb,var(--bg-soft)_50%,transparent)] p-4"
                  >
                    <h3 className="text-sm font-semibold text-fg md:text-base">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted md:text-[15px]">
                      {item.answer}
                    </p>
                    {item.bullets && item.bullets.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-sm text-muted">
                        {item.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
