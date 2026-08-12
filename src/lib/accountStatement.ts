export type AccountStatementEntry = {
  date: string;
  document: string;
  correspondent: string;
  group: string;
  debit: number;
  credit: number;
  purpose: string;
};

export type AccountStatementOptions = {
  ownerName: string;
  account: string;
  currencyLabel: string;
  currencyCode: string;
  dateFrom: string;
  dateTo: string;
  closingBalance: number;
  entries: AccountStatementEntry[];
};

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "account";
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportAccountStatement(
  options: AccountStatementOptions,
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Салам Банк";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Выписка", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.15,
        footer: 0.15,
      },
    },
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = [
    { key: "date", width: 13 },
    { key: "document", width: 15 },
    { key: "correspondent", width: 28 },
    { key: "group", width: 20 },
    { key: "debit", width: 15 },
    { key: "debitNational", width: 17 },
    { key: "credit", width: 15 },
    { key: "creditNational", width: 17 },
    { key: "purpose", width: 62 },
  ];

  sheet.mergeCells("A1:I1");
  const title = sheet.getCell("A1");
  title.value = `Сводная выписка за период с ${options.dateFrom} по ${options.dateTo}`;
  title.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells("A3:B3");
  sheet.mergeCells("C3:I3");
  sheet.getCell("A3").value = "Счёт";
  sheet.getCell("C3").value = `${options.account}, ${options.currencyLabel} (${options.currencyCode})`;
  sheet.mergeCells("A4:B4");
  sheet.mergeCells("C4:I4");
  sheet.getCell("A4").value = "Наименование";
  sheet.getCell("C4").value = `${options.ownerName}, ${options.currencyLabel}`;

  const debitTurnover = options.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const creditTurnover = options.entries.reduce((sum, entry) => sum + entry.credit, 0);
  const openingBalance = options.closingBalance + debitTurnover - creditTurnover;

  sheet.mergeCells("A5:F5");
  sheet.mergeCells("G5:I5");
  sheet.getCell("A5").value = "Входящий остаток";
  sheet.getCell("G5").value = openingBalance;

  const headers = [
    "Дата",
    "Док",
    "Корреспондент",
    "Группа",
    "Дебет",
    "В нац. валюте",
    "Кредит",
    "В нац. валюте",
    "Назначение платежа",
  ];
  const headerRow = sheet.getRow(7);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });

  const isSom = options.currencyCode === "417";
  for (const entry of options.entries) {
    const row = sheet.addRow({
      date: entry.date,
      document: entry.document,
      correspondent: entry.correspondent,
      group: entry.group,
      debit: entry.debit || null,
      debitNational: isSom && entry.debit ? entry.debit : null,
      credit: entry.credit || null,
      creditNational: isSom && entry.credit ? entry.credit : null,
      purpose: entry.purpose,
    });
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFD1D5DB" } },
      };
    });
    for (const column of [5, 6, 7, 8]) {
      row.getCell(column).numFmt = "#,##0.00";
      row.getCell(column).alignment = { horizontal: "right", vertical: "top" };
    }
  }

  const totalsRow = sheet.addRow([
    "Итого оборотов за период",
    "",
    "",
    "",
    debitTurnover,
    isSom ? debitTurnover : null,
    creditTurnover,
    isSom ? creditTurnover : null,
    "",
  ]);
  sheet.mergeCells(`A${totalsRow.number}:D${totalsRow.number}`);
  totalsRow.font = { name: "Arial", size: 10, bold: true };

  const closingRow = sheet.addRow([
    "Исходящий остаток",
    "",
    "",
    "",
    "",
    "",
    options.closingBalance,
    "",
    "",
  ]);
  sheet.mergeCells(`A${closingRow.number}:F${closingRow.number}`);
  closingRow.font = { name: "Arial", size: 10, bold: true };

  for (const row of [totalsRow, closingRow]) {
    for (const column of [5, 6, 7, 8]) row.getCell(column).numFmt = "#,##0.00";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      cell.border = { top: { style: "thin", color: { argb: "FF6B7280" } } };
    });
  }

  const footerRow = sheet.addRow([]);
  sheet.mergeCells(`G${footerRow.number}:I${footerRow.number}`);
  sheet.getCell(`G${footerRow.number}`).value = `Дата печати ${new Date().toLocaleString("ru-RU")}`;
  sheet.getCell(`G${footerRow.number}`).alignment = { horizontal: "right" };
  sheet.getCell(`G${footerRow.number}`).font = { name: "Arial", size: 8, italic: true };

  for (const rowNumber of [3, 4, 5]) {
    sheet.getCell(rowNumber, 1).font = { name: "Arial", size: 10, bold: true };
    sheet.getCell(rowNumber, 3).font = { name: "Arial", size: 10 };
  }
  sheet.getCell("G5").numFmt = "#,##0.00";
  sheet.views = [{ state: "frozen", ySplit: 7 }];
  sheet.autoFilter = { from: "A7", to: "I7" };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `AccountStatementReport-${safeFilePart(options.account)}.xlsx`,
  );
}
