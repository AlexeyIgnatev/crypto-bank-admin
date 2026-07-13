"use client";

import { useMemo, useRef, useState } from "react";

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-soft bg-[var(--bg-soft)] text-xs font-semibold text-muted">
        ?
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-xl border border-soft bg-[var(--card)] px-3 py-2 text-xs leading-5 text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
        {text}
      </span>
    </span>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card rounded-2xl border border-soft shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
        <div className="text-lg font-semibold">{title}</div>
        <InfoHint text={hint} />
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FileDropzone({
  fileName,
  onFileChange,
}: {
  fileName: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onFileChange(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? "border-[var(--primary)]" : "border-soft"
        }`}
        style={{
          background: isDragging
            ? "color-mix(in srgb, var(--primary) 8%, var(--bg-soft))"
            : "var(--bg-soft)",
        }}
      >
        <div className="mb-3 text-sm font-semibold">
          Перетащите файл сюда или нажмите для выбора
        </div>
        <div className="text-sm text-muted">
          Поддерживается любой формат, который позже будет использоваться для AML-правил.
        </div>
        <div className="mt-4 rounded-full border border-soft px-3 py-1 text-xs text-muted">
          {fileName || "Файл пока не выбран"}
        </div>
      </button>
    </>
  );
}

export default function AmlRulesPage() {
  const [apiRules, setApiRules] = useState("");
  const [rulesUrl, setRulesUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const statusText = useMemo(
    () =>
      fileName
        ? `Выбран файл: ${fileName}`
        : "Раздел пока работает как заглушка без реального импорта.",
    [fileName],
  );

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4">
        <section className="card rounded-2xl border border-soft px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-soft bg-[var(--bg-soft)] px-4 py-2 text-sm text-muted">
              Черновой раздел для будущей загрузки AML-правил
            </div>
            <div className="rounded-full border border-soft bg-[var(--card)] px-4 py-2 text-sm text-muted">
              {statusText}
            </div>
          </div>
        </section>

        <SectionCard
          title="Вставить API правила"
          hint="Вставьте сюда текст правил, если получили его напрямую от AML-провайдера."
        >
          <textarea
            className="ui-input min-h-44 resize-y"
            value={apiRules}
            onChange={(e) => setApiRules(e.target.value)}
            placeholder="Например: JSON, текст или набор правил для будущей загрузки"
          />
        </SectionCard>

        <SectionCard
          title="Вставить через url"
          hint="Укажите ссылку на источник, откуда позже будем забирать AML-правила."
        >
          <textarea
            className="ui-input min-h-32 resize-y"
            value={rulesUrl}
            onChange={(e) => setRulesUrl(e.target.value)}
            placeholder="https://example.com/aml-rules"
          />
        </SectionCard>

        <SectionCard
          title="Вставить через файл"
          hint="Перетащите файл сюда или выберите его вручную, чтобы подготовить импорт."
        >
          <FileDropzone
            fileName={fileName}
            onFileChange={(file) => setFileName(file?.name ?? null)}
          />
        </SectionCard>
      </div>
    </div>
  );
}
