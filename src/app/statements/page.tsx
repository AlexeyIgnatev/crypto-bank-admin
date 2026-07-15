"use client";

import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "@/lib/api";
import { exportRows } from "@/lib/exporters";
import { readableRejectionReason } from "@/lib/rejectionReason";
import { Transaction } from "@/types";

const ASSET_OPTIONS = [
  { label: "РЎРћРњ", value: "SOM" },
  { label: "РЎРђР›РђРњ", value: "SALAM" },
  { label: "USDT TRC20", value: "USDT" },
] as const;

const EXPORT_PAGE_SIZE = 200;

function asNumber(value: number | undefined): number {
  return Number(value ?? 0);
}

function txLabel(t: Transaction) {
  return t.kind ? `${t.kind} В· ${t.id}` : t.id;
}

async function fetchAllByRole(params: {
  search: string;
  asset: string;
  role: "sender" | "receiver";
}): Promise<Transaction[]> {
  const items: Transaction[] = [];
  let offset = 0;

  while (true) {
    const res = await getTransactions({
      [params.role]: params.search,
      offset,
      limit: EXPORT_PAGE_SIZE,
      sortBy: "createdAt",
      sortDir: "desc",
      currencies: [params.asset],
    } as any);

    items.push(...res.items);
    if (res.items.length < EXPORT_PAGE_SIZE) break;
    offset += EXPORT_PAGE_SIZE;
    if (offset > 5000) break;
  }

  return items;
}

export default function StatementsPage() {
  const [fioSearch, setFioSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [asset, setAsset] = useState<string>("SALAM");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<
    "all-pdf" | "all-csv" | "all-txt" | "selected-pdf" | "selected-csv" | "selected-txt" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const searchSummary = useMemo(() => {
    const parts = [
      fioSearch.trim() ? `Р¤РРћ: ${fioSearch.trim()}` : "",
      phoneSearch.trim() ? `РўРµР»РµС„РѕРЅ: ${phoneSearch.trim()}` : "",
      walletSearch.trim() ? `РљРѕС€РµР»С‘Рє: ${walletSearch.trim()}` : "",
    ].filter(Boolean);

    return parts.length ? parts.join(" В· ") : "Р‘РµР· С„РёР»СЊС‚СЂР°";
  }, [fioSearch, phoneSearch, walletSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  async function load() {
    const terms = [fioSearch.trim(), phoneSearch.trim(), walletSearch.trim()].filter(Boolean);
    if (!terms.length) {
      setError("Р—Р°РїРѕР»РЅРё С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕ РїРѕР»Рµ: Р¤РРћ, С‚РµР»РµС„РѕРЅ РёР»Рё РєРѕС€РµР»С‘Рє");
      setItems([]);
      setSelectedIds(new Set());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uniq = new Map<string, Transaction>();

      for (const term of terms) {
        const [sent, received] = await Promise.all([
          fetchAllByRole({ search: term, asset, role: "sender" }),
          fetchAllByRole({ search: term, asset, role: "receiver" }),
        ]);

        for (const tx of [...sent, ...received]) uniq.set(tx.id, tx);
      }

      const sorted = Array.from(uniq.values()).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );

      setItems(sorted);
      setSelectedIds(new Set());
      if (!sorted.length) {
        setError("РџРѕ СЌС‚РёРј С„РёР»СЊС‚СЂР°Рј РЅРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ");
      }
    } catch {
      setError("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РІС‹РїРёСЃРєСѓ");
      setItems([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (items.length && prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  }

  async function exportTransactions(
    rows: Transaction[],
    format: "pdf" | "csv" | "txt",
    fileBaseName: string,
  ) {
    if (!rows.length) return;

    await exportRows({
      format,
      fileBaseName,
      title: "Р’С‹РїРёСЃРєР° РїРѕ РѕРїРµСЂР°С†РёСЏРј",
      periodLabel: `Р’С‹Р±РѕСЂРєР°: ${searchSummary} В· ${asset}`,
      columns: [
        { header: "Р”Р°С‚Р°", getValue: (row) => new Date(row.createdAt).toLocaleString() },
        { header: "Tx / ID", getValue: (row) => row.id },
        { header: "РЎС‚Р°С‚СѓСЃ", getValue: (row) => row.status },
        { header: "РђРєС‚РёРІ", getValue: (row) => row.currency },
        { header: "РЎСѓРјРјР°", getValue: (row) => row.amount },
        { header: "РљРѕРјРёСЃСЃРёСЏ Р±Р°РЅРєР°", getValue: (row) => row.feeAmount ?? 0 },
        {
          header: "РЎРµС‚РµРІР°СЏ РєРѕРјРёСЃСЃРёСЏ",
          getValue: (row) => `${asNumber(row.networkFeeAmount)} ${row.networkFeeAsset || ""}`.trim(),
        },
        { header: "Р“Р°Р· (energy)", getValue: (row) => asNumber(row.energyUsed) },
        { header: "Р”РІРёРіР°СЋС‰Р°СЏ СЃРёР»Р°", getValue: (row) => asNumber(row.bandwidthUsed) },
        { header: "РЎРѕР¶Р¶РµРЅРѕ BRICS", getValue: (row) => asNumber(row.bricsBurnedAmount) },
        { header: "РћС‚РїСЂР°РІРёС‚РµР»СЊ", getValue: (row) => row.sender },
        { header: "РџРѕР»СѓС‡Р°С‚РµР»СЊ", getValue: (row) => row.recipient },
        { header: "РџСЂРёС‡РёРЅР° РѕС‚РєР»РѕРЅРµРЅРёСЏ", getValue: (row) => readableRejectionReason(row) },
      ],
      rows,
    });
  }

  async function exportAll(format: "pdf" | "csv" | "txt") {
    if (!items.length) return;
    setExporting(`all-${format}`);
    try {
      await exportTransactions(items, format, `statements_all_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  async function exportSelected(format: "pdf" | "csv" | "txt") {
    if (!selectedItems.length) return;
    setExporting(`selected-${format}`);
    try {
      await exportTransactions(selectedItems, format, `statements_selected_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  const hasAnySearch = Boolean(fioSearch.trim() || phoneSearch.trim() || walletSearch.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="card rounded-xl border border-soft p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1.1fr_1.1fr_0.9fr_auto] md:items-end">
          <label className="grid gap-1">
            <div className="text-sm mb-1">Р¤РРћ</div>
            <input
              className="ui-input w-full"
              value={fioSearch}
              onChange={(e) => setFioSearch(e.target.value)}
              placeholder="РРІР°РЅРѕРІ РРІР°РЅ РРІР°РЅРѕРІРёС‡"
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">РўРµР»РµС„РѕРЅ</div>
            <input
              className="ui-input w-full"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              placeholder="+996..."
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">РљРѕС€РµР»С‘Рє</div>
            <input
              className="ui-input w-full"
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              placeholder="TRVh3... / 0x..."
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">РђРєС‚РёРІ</div>
            <select className="ui-input w-full" value={asset} onChange={(e) => setAsset(e.target.value)}>
              {ASSET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary h-10 px-5" onClick={load} disabled={loading}>
            {loading ? "Р—Р°РіСЂСѓР·РєР°..." : "РџРѕРєР°Р·Р°С‚СЊ РІС‹РїРёСЃРєСѓ"}
          </button>
        </div>

        <div className="mt-3 text-xs text-muted">Р¤РёР»СЊС‚СЂ РёС‰РµС‚ РѕС‚РґРµР»СЊРЅРѕ РїРѕ Р¤РРћ, С‚РµР»РµС„РѕРЅСѓ Рё РєРѕС€РµР»СЊРєСѓ, Р·Р°С‚РµРј РѕР±СЉРµРґРёРЅСЏРµС‚ РЅР°Р№РґРµРЅРЅС‹Рµ РѕРїРµСЂР°С†РёРё.</div>

        {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soft p-3 text-sm text-muted">
          <div>РћРїРµСЂР°С†РёРё: {items.length}</div>
          <div>Р’С‹Р±СЂР°РЅРѕ: {selectedItems.length}</div>
          <div>{searchSummary}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn h-9 px-3" onClick={toggleAllVisible} disabled={!items.length}>
              {selectedIds.size === items.length && items.length ? "РЎРЅСЏС‚СЊ РІС‹Р±РѕСЂ" : "Р’С‹Р±СЂР°С‚СЊ РІСЃРµ"}
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("pdf")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-pdf" ? "PDF..." : "Р­РєСЃРїРѕСЂС‚ РІС‹Р±РѕСЂРєРё PDF"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("csv")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-csv" ? "CSV..." : "Р­РєСЃРїРѕСЂС‚ РІС‹Р±РѕСЂРєРё CSV"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("txt")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-txt" ? "TXT..." : "Р­РєСЃРїРѕСЂС‚ РІС‹Р±РѕСЂРєРё TXT"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("pdf")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-pdf" ? "PDF..." : "Р’С‹Р±СЂР°РЅРЅС‹Рµ PDF"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("csv")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-csv" ? "CSV..." : "Р’С‹Р±СЂР°РЅРЅС‹Рµ CSV"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("txt")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-txt" ? "TXT..." : "Р’С‹Р±СЂР°РЅРЅС‹Рµ TXT"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-[72vh] flex-1 overflow-auto">
          <table className="min-w-[1800px] w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-soft">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-4 py-3 text-left">Р”Р°С‚Р°</th>
                <th className="px-4 py-3 text-left">Tx / ID</th>
                <th className="px-4 py-3 text-left">РЎС‚Р°С‚СѓСЃ</th>
                <th className="px-4 py-3 text-left">РђРєС‚РёРІ</th>
                <th className="px-4 py-3 text-right">РЎСѓРјРјР°</th>
                <th className="px-4 py-3 text-right">РљРѕРјРёСЃСЃРёСЏ Р±Р°РЅРєР°</th>
                <th className="px-4 py-3 text-right">РЎРµС‚РµРІР°СЏ РєРѕРјРёСЃСЃРёСЏ</th>
                <th className="px-4 py-3 text-right">Р“Р°Р· (energy)</th>
                <th className="px-4 py-3 text-right">Р”РІРёРіР°СЋС‰Р°СЏ СЃРёР»Р°</th>
                <th className="px-4 py-3 text-right">РЎРѕР¶Р¶РµРЅРѕ BRICS</th>
                <th className="px-4 py-3 text-left">РћС‚РїСЂР°РІРёС‚РµР»СЊ</th>
                <th className="px-4 py-3 text-left">РџРѕР»СѓС‡Р°С‚РµР»СЊ</th>
                <th className="px-4 py-3 text-left">РџСЂРёС‡РёРЅР° РѕС‚РєР»РѕРЅРµРЅРёСЏ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const rejectionReason = readableRejectionReason(t);
                return (
                  <tr key={t.id} className="border-b border-soft">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 break-all">{txLabel(t)}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="px-4 py-3">{t.currency}</td>
                    <td className="px-4 py-3 text-right">{t.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{Number(t.feeAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {`${asNumber(t.networkFeeAmount).toLocaleString()} ${t.networkFeeAsset || ""}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-right">{asNumber(t.energyUsed).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{asNumber(t.bandwidthUsed).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{asNumber(t.bricsBurnedAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 break-words">{t.sender}</td>
                    <td className="px-4 py-3 break-words">{t.recipient}</td>
                    <td className="px-4 py-3 break-words">{rejectionReason}</td>
                  </tr>
                );
              })}
              {!loading && !hasAnySearch && items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={15}>
                    Р—Р°РїРѕР»РЅРё С„РёР»СЊС‚СЂ Рё РЅР°Р¶РјРё В«РџРѕРєР°Р·Р°С‚СЊ РІС‹РїРёСЃРєСѓВ»
                  </td>
                </tr>
              )}
              {!loading && hasAnySearch && items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={15}>
                    РќРµС‚ РґР°РЅРЅС‹С…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

