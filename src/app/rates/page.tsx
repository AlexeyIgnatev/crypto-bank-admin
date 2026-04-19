"use client";
import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/Modal";

type Settings = {
  esom_per_usd: string;
  esom_som_conversion_fee_pct: string;
  esom_som_conversion_fee_min: string;
  btc_trade_fee_pct: string;
  eth_trade_fee_pct: string;
  usdt_trade_fee_pct: string;
  btc_withdraw_fee_fixed: string;
  eth_withdraw_fee_fixed: string;
  usdt_withdraw_fee_fixed: string;
  min_withdraw_btc: string;
  min_withdraw_eth: string;
  min_withdraw_usdt_trc20: string;
};

import { getSettings, putSettings } from "@/lib/api";

export default function RatesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getSettings();
        if (alive) setSettings(s as unknown as Settings);
      } catch {
        setError("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const [modal, setModal] = useState<{ open: boolean; key: keyof Settings | null; title: string; suffix?: string; step?: string }>({ open: false, key: null, title: "" });
  const value = useMemo(() => (modal.key && settings ? settings[modal.key] : ""), [modal.key, settings]);

  const openEdit = (key: keyof Settings, title: string, opts?: { suffix?: string; step?: string }) => setModal({ open: true, key, title, suffix: opts?.suffix, step: opts?.step });
  const closeEdit = () => setModal({ open: false, key: null, title: "" });
  const saveValue = async (next: string) => {
    if (!modal.key || !settings) return;
    const updated = { ...settings, [modal.key]: sanitizeNumber(next) } as Settings;
    setSettings(updated);
    closeEdit();
    try {
      await putSettings(updated as any);
    } catch {
      // revert on failure?
    }
  };

  if (loading) return <div className="flex-1 grid place-items-center text-muted">Р—Р°РіСЂСѓР·РєР°...</div>;
  if (error) return <div className="flex-1 grid place-items-center text-red-500">{error}</div>;
  if (!settings) return <div className="flex-1 grid place-items-center text-muted">РќРµС‚ РґР°РЅРЅС‹С…</div>;

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="m-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
            <header className="p-4 border-b border-soft flex items-center justify-between">
              <div className="text-lg font-semibold">РљРѕРјРёСЃСЃРёРё (РІ РїСЂРѕС†РµРЅС‚Р°С…)</div>
            </header>
            <div className="p-4 space-y-3">
              <SettingRow label="РљСѓСЂСЃ РЎРђР›РђРњ Р·Р° 1 USD" value={`${fmt2(settings.esom_per_usd)} РЎРђР›РђРњ`} onEdit={() => openEdit("esom_per_usd", "РљСѓСЂСЃ РЎРђР›РђРњ Р·Р° 1 USD", { step: "0.01" })} />
              <SettingRow label="РљРѕРЅРІРµСЂС‚Р°С†РёСЏ РЎРћРњ в†” РЎРђР›РђРњ" value={`${fmtPct(settings.esom_som_conversion_fee_pct)}`} onEdit={() => openEdit("esom_som_conversion_fee_pct", "РљРѕРјРёСЃСЃРёСЏ Р·Р° РєРѕРЅРІРµСЂС‚Р°С†РёСЋ РЎРћРњ в†” РЎРђР›РђРњ (%)", { suffix: "%", step: "0.01" })} />
              <SettingRow label="Мин. комиссия конвертации СОМ ↔ САЛАМ" value={`${fmt(settings.esom_som_conversion_fee_min)} СОМ/САЛАМ`} onEdit={() => openEdit("esom_som_conversion_fee_min", "Минимальная комиссия конвертации СОМ ↔ САЛАМ", { step: "0.01" })} />
              <div className="pt-2 text-sm font-medium text-muted">РўРѕСЂРіРѕРІР»СЏ</div>
              <SettingRow label="BTC С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ" value={`${fmtPct(settings.btc_trade_fee_pct)}`} onEdit={() => openEdit("btc_trade_fee_pct", "BTC С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ (%)", { suffix: "%", step: "0.01" })} />
              <SettingRow label="ETH С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ" value={`${fmtPct(settings.eth_trade_fee_pct)}`} onEdit={() => openEdit("eth_trade_fee_pct", "ETH С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ (%)", { suffix: "%", step: "0.01" })} />
              <SettingRow label="USDT С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ" value={`${fmtPct(settings.usdt_trade_fee_pct)}`} onEdit={() => openEdit("usdt_trade_fee_pct", "USDT С‚РѕСЂРіРѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ (%)", { suffix: "%", step: "0.01" })} />
            </div>
          </section>

          <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
            <header className="p-4 border-b border-soft flex items-center justify-between">
              <div className="text-lg font-semibold">РљРѕРјРёСЃСЃРёРё Рё РјРёРЅРёРјСѓРјС‹ РІС‹РІРѕРґР°</div>
            </header>
            <div className="p-4 space-y-3">
              <div className="pt-0 text-sm font-medium text-muted">BTC</div>
              <SettingRow label="Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° BTC" value={`${fmt(settings.btc_withdraw_fee_fixed)} BTC`} onEdit={() => openEdit("btc_withdraw_fee_fixed", "Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° BTC", { step: "0.00000001" })} />
              <SettingRow label="РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° BTC" value={`${fmt(settings.min_withdraw_btc)} BTC`} onEdit={() => openEdit("min_withdraw_btc", "РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° BTC", { step: "0.00000001" })} />
              <div className="pt-2 text-sm font-medium text-muted">ETH</div>
              <SettingRow label="Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° ETH" value={`${fmt(settings.eth_withdraw_fee_fixed)} ETH`} onEdit={() => openEdit("eth_withdraw_fee_fixed", "Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° ETH", { step: "0.00000001" })} />
              <SettingRow label="РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° ETH" value={`${fmt(settings.min_withdraw_eth)} ETH`} onEdit={() => openEdit("min_withdraw_eth", "РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° ETH", { step: "0.00000001" })} />
              <div className="pt-2 text-sm font-medium text-muted">USDT (TRC20)</div>
              <SettingRow label="Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° USDT" value={`${fmt(settings.usdt_withdraw_fee_fixed)} USDT`} onEdit={() => openEdit("usdt_withdraw_fee_fixed", "Р¤РёРєСЃ РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° USDT (TRC20)", { step: "0.01" })} />
              <SettingRow label="РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° USDT" value={`${fmt(settings.min_withdraw_usdt_trc20)} USDT`} onEdit={() => openEdit("min_withdraw_usdt_trc20", "РњРёРЅ. СЃСѓРјРјР° РІС‹РІРѕРґР° USDT (TRC20)", { step: "0.01" })} />
            </div>
          </section>
        </div>
      </div>

      <EditModal open={modal.open} title={modal.title} value={value} suffix={modal.suffix} step={modal.step} onClose={closeEdit} onSave={saveValue} fieldKey={modal.key} />
    </div>
  );
}

function SettingRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-soft bg-[var(--card)]">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted text-sm truncate" title={value}>{value}</div>
      </div>
      <button className="btn btn-edit whitespace-nowrap" onClick={onEdit}>вњЋ РР·РјРµРЅРёС‚СЊ</button>
    </div>
  );
}

function EditModal({ open, onClose, onSave, title, value, suffix, step, fieldKey }: { open: boolean; onClose: () => void; onSave: (v: string) => void; title: string; value: string; suffix?: string; step?: string; fieldKey: keyof Settings | null; }) {
  const [v, setV] = useState<string>(value);
  const [err, setErr] = useState<string | null>(null);

  // reset input on open / field change
  const opened = open ? fieldKey + "" + title : "";
  useMemo(() => { if (open) { setV(value); setErr(null); } }, [opened, value, open]);

  const validate = (val: string) => {
    const s = sanitizeNumber(val);
    if (!s) return "Р’РІРµРґРёС‚Рµ Р·РЅР°С‡РµРЅРёРµ";
    const num = Number(s);
    if (!Number.isFinite(num)) return "РќРµРєРѕСЂСЂРµРєС‚РЅРѕРµ С‡РёСЃР»Рѕ";
    // percentage fields must be >= 0
    if (title.toLowerCase().includes("РєРѕРјРёСЃСЃРёСЏ") && title.includes("%")) {
      if (num < 0) return "РџСЂРѕС†РµРЅС‚ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј";
      if (num > 1000) return "РЎР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ РїСЂРѕС†РµРЅС‚";
    }
    // fixed/amount fields must be >= 0
    if (!title.includes("%") && num < 0) return "Р—РЅР°С‡РµРЅРёРµ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј";
    return null;
  };

  const onSaveClick = () => {
    const e = validate(v);
    if (e) { setErr(e); return; }
    onSave(sanitizeNumber(v));
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Р—РЅР°С‡РµРЅРёРµ{suffix ? `, ${suffix}` : ""}</span>
          <div className="flex items-center gap-2 mt-1">
            <input className={`ui-input w-full ${err ? 'border-red-500' : ''}`} inputMode="decimal" step={step} value={v} onChange={e => { setV(e.target.value); if (err) setErr(null); }} placeholder="0" />
            {suffix && <span className="px-2 text-sm text-muted">{suffix}</span>}
          </div>
        </label>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn h-9" onClick={onClose}>РћС‚РјРµРЅР°</button>
          <button className="btn btn-primary h-9" onClick={onSaveClick}>РЎРѕС…СЂР°РЅРёС‚СЊ</button>
        </div>
      </div>
    </Modal>
  );
}

function fmt(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return n.toLocaleString(); } catch {} return x; }
function fmt2(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch {} return x; }
function fmtPct(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return `${n.toLocaleString()}%`; } catch {} return `${x}%`; }
function sanitizeNumber(x: string) { return x.replace(/[^0-9.,-]/g, "").replace(",", "."); }

