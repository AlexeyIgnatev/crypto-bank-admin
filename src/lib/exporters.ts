export type ExportFormat = "excel" | "pdf" | "txt" | "csv";

export type ExportColumn<T> = {
  header: string;
  getValue: (row: T, index: number) => string | number | null | undefined;
};

export type ExportSummaryItem = {
  label: string;
  value: string | number;
};

type ExportOptions<T> = {
  format: ExportFormat;
  fileBaseName: string;
  title: string;
  periodLabel?: string;
  summary?: ExportSummaryItem[];
  columns: ExportColumn<T>[];
  rows: T[];
};

function normalizeCell(
  value: string | number | null | undefined,
): string | number {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  return String(value);
}

function stampFileName(base: string, ext: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${base}_${stamp}.${ext}`;
}

function downloadText(
  content: string,
  fileName: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function csvEscape(value: string): string {
  if (/[",\n\r;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function exportTxt<T>(opts: ExportOptions<T>): Promise<void> {
  const lines: string[] = [];
  lines.push(opts.title);
  if (opts.periodLabel) lines.push(`Period: ${opts.periodLabel}`);
  if (opts.summary?.length) {
    lines.push("");
    lines.push("Summary:");
    for (const item of opts.summary)
      lines.push(`- ${item.label}: ${item.value}`);
  }
  lines.push("");
  lines.push(opts.columns.map((c) => c.header).join("\t"));
  opts.rows.forEach((row, index) => {
    const cells = opts.columns.map((c) =>
      String(normalizeCell(c.getValue(row, index))),
    );
    lines.push(cells.join("\t"));
  });
  downloadText(lines.join("\n"), stampFileName(opts.fileBaseName, "txt"));
}

async function exportCsv<T>(opts: ExportOptions<T>): Promise<void> {
  const lines: string[] = [];

  if (opts.periodLabel || (opts.summary && opts.summary.length)) {
    lines.push("Summary");
    if (opts.periodLabel) {
      lines.push(
        ["Period", opts.periodLabel].map((cell) => csvEscape(cell)).join(";"),
      );
    }
    for (const item of opts.summary || []) {
      lines.push(
        [item.label, String(item.value)]
          .map((cell) => csvEscape(cell))
          .join(";"),
      );
    }
    lines.push("");
  }

  lines.push(opts.columns.map((c) => csvEscape(c.header)).join(";"));
  opts.rows.forEach((row, index) => {
    const cells = opts.columns.map((c) =>
      csvEscape(String(normalizeCell(c.getValue(row, index)))),
    );
    lines.push(cells.join(";"));
  });

  downloadText(
    "\uFEFF" + lines.join("\n"),
    stampFileName(opts.fileBaseName, "csv"),
    "text/csv;charset=utf-8",
  );
}

async function exportExcel<T>(opts: ExportOptions<T>): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const summaryRows: Array<{ Metric: string; Value: string | number }> = [];
  if (opts.periodLabel)
    summaryRows.push({ Metric: "Period", Value: opts.periodLabel });
  for (const item of opts.summary || []) {
    summaryRows.push({ Metric: item.label, Value: item.value });
  }
  if (summaryRows.length) {
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  }

  const dataRows = opts.rows.map((row, index) => {
    const out: Record<string, string | number> = {};
    for (const col of opts.columns) {
      out[col.header] = normalizeCell(col.getValue(row, index));
    }
    return out;
  });

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(wb, wsData, "Data");
  XLSX.writeFile(wb, stampFileName(opts.fileBaseName, "xlsx"));
}

async function exportPdf<T>(opts: ExportOptions<T>): Promise<void> {
  const pdfmakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake: any = (pdfmakeModule as any).default || pdfmakeModule;
  const pdfFonts: any = (pdfFontsModule as any).default || pdfFontsModule;
  pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;

  const body: any[] = [];
  body.push(opts.columns.map((c) => ({ text: c.header, bold: true })));
  opts.rows.forEach((row, index) => {
    body.push(
      opts.columns.map((c) => String(normalizeCell(c.getValue(row, index)))) ,
    );
  });

  const summaryText = [
    opts.periodLabel ? `Period: ${opts.periodLabel}` : null,
    ...(opts.summary || []).map((s) => `${s.label}: ${s.value}`),
  ].filter(Boolean);

  const docDefinition: any = {
    pageOrientation: "landscape",
    content: [
      { text: opts.title, style: "header" },
      ...(summaryText.length
        ? [{ text: summaryText.join("\n"), margin: [0, 0, 0, 8] }]
        : []),
      {
        table: {
          headerRows: 1,
          body,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
    },
    defaultStyle: {
      fontSize: 8,
    },
    pageMargins: [16, 16, 16, 16],
  };

  pdfMake
    .createPdf(docDefinition)
    .download(stampFileName(opts.fileBaseName, "pdf"));
}

export async function exportRows<T>(opts: ExportOptions<T>): Promise<void> {
  if (opts.format === "txt") {
    await exportTxt(opts);
    return;
  }
  if (opts.format === "csv") {
    await exportCsv(opts);
    return;
  }
  if (opts.format === "excel") {
    await exportExcel(opts);
    return;
  }
  await exportPdf(opts);
}
