"use client";

import { useState, useEffect } from "react";
import { Nav } from "@/components/nav";
import { supabase } from "@/lib/supabase/client";
import { upsertActual, updatePeriodsCompleted } from "@/lib/supabase/data";
import type { ClientRow, PeriodDataRow } from "@/lib/supabase/types";
import type { PeriodData } from "@/lib/model";
import { fmtCurrency, NUM_PERIODS } from "@/lib/model";
import { Loader2, Save, CheckCircle, AlertCircle } from "lucide-react";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const EMPTY_PERIOD: PeriodData = {
  productRev: 0, serviceRev: 0, installRev: 0, tripRev: 0,
  totalIncome: 0, totalCOGS: 0, grossProfit: 0,
  totalExpense: 0, netIncome: 0, adjGrossProfit: 0,
};

const FIELDS: { key: keyof PeriodData | "otherIncome" | "autoExpense"; label: string }[] = [
  { key: "serviceRev", label: "Service Revenue" },
  { key: "productRev", label: "Product Revenue" },
  { key: "installRev", label: "Install Revenue" },
  { key: "tripRev", label: "Trip Revenue" },
  { key: "totalCOGS", label: "Total COGS" },
  { key: "totalExpense", label: "Total Operating Expenses" },
  { key: "otherIncome", label: "Net Other Income" },
  { key: "autoExpense", label: "Auto / Vehicle Expense" },
];

export default function ActualsPage() {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [formData, setFormData] = useState<PeriodData>({ ...EMPTY_PERIOD });
  const [otherIncome, setOtherIncome] = useState(0);
  const [autoExpense, setAutoExpense] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [existingActuals, setExistingActuals] = useState<Map<number, PeriodData>>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const clientId = getClientId();
        if (!clientId) return;
        const { data: c } = await supabase
          .from("clients").select("*").eq("id", clientId).single();
        if (!c) return;
        setClient(c as ClientRow);
        setSelectedPeriod(Math.min((c as ClientRow).periods_completed + 1, NUM_PERIODS));

        const { data: rows } = await supabase
          .from("period_data").select("*")
          .eq("client_id", (c as ClientRow).id)
          .eq("data_type", "actual")
          .order("period_num");
        if (rows) {
          const map = new Map<number, PeriodData>();
          for (const row of rows as PeriodDataRow[]) {
            map.set(row.period_num, {
              productRev: Number(row.product_rev),
              serviceRev: Number(row.service_rev),
              installRev: Number(row.install_rev),
              tripRev: Number(row.trip_rev),
              totalIncome: Number(row.total_income),
              totalCOGS: Number(row.total_cogs),
              grossProfit: Number(row.gross_profit),
              totalExpense: Number(row.total_expense),
              netIncome: Number(row.net_income),
              adjGrossProfit: Number(row.adj_gross_profit),
            });
          }
          setExistingActuals(map);
        }
      } catch { /* fallback */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const existing = existingActuals.get(selectedPeriod);
    if (existing) {
      setFormData({ ...existing });
    } else {
      setFormData({ ...EMPTY_PERIOD });
    }
  }, [selectedPeriod, existingActuals]);

  function updateField(key: keyof PeriodData | "otherIncome" | "autoExpense", value: number) {
    if (key === "otherIncome") {
      setOtherIncome(value);
      setFormData(prev => {
        const totalIncome = prev.serviceRev + prev.productRev + prev.installRev + prev.tripRev + value;
        const grossProfit = totalIncome - prev.totalCOGS;
        const netIncome = grossProfit - prev.totalExpense;
        const adjGrossProfit = Math.round(grossProfit - totalIncome * 0.13 - totalIncome * 0.24 - autoExpense);
        return { ...prev, totalIncome, grossProfit, netIncome, adjGrossProfit };
      });
      return;
    }
    if (key === "autoExpense") {
      setAutoExpense(value);
      setFormData(prev => {
        const adjGrossProfit = Math.round(prev.grossProfit - prev.totalIncome * 0.13 - prev.totalIncome * 0.24 - value);
        return { ...prev, adjGrossProfit };
      });
      return;
    }
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      const totalIncome = next.serviceRev + next.productRev + next.installRev + next.tripRev + otherIncome;
      const grossProfit = totalIncome - next.totalCOGS;
      const netIncome = grossProfit - next.totalExpense;
      const adjGrossProfit = Math.round(grossProfit - totalIncome * 0.13 - totalIncome * 0.24 - autoExpense);
      return { ...next, totalIncome, grossProfit, netIncome, adjGrossProfit };
    });
  }

  async function handleSave() {
    if (!client) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await upsertActual(client.id, selectedPeriod, formData, customerCount || undefined);
      if (selectedPeriod > client.periods_completed) {
        await updatePeriodsCompleted(client.id, selectedPeriod);
        setClient(prev => prev ? { ...prev, periods_completed: selectedPeriod } : prev);
      }
      setExistingActuals(prev => {
        const next = new Map(prev);
        next.set(selectedPeriod, { ...formData });
        return next;
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-ambient min-h-screen text-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="page-ambient min-h-screen text-slate-900">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-400">No client found. Please log in or set up a client first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-ambient min-h-screen text-slate-900">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Enter Period Actuals</h2>
          <p className="text-xs text-slate-500 mt-1">
            {client.name} &middot; FY{client.fiscal_year} &middot; {client.periods_completed} of {NUM_PERIODS} periods entered
          </p>
        </div>

        {/* Period Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3">Select Period</label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: NUM_PERIODS }, (_, i) => i + 1).map(p => {
              const hasData = existingActuals.has(p);
              const isActive = p === selectedPeriod;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer
                    ${isActive ? "bg-indigo-900 text-white shadow-sm shadow-indigo-900/20" :
                      hasData ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" :
                      "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"}`}
                >
                  P{p}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5">
            Green = saved &middot; Blue = editing
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <h3 className="text-sm font-semibold text-slate-800">Period {selectedPeriod} Data</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">{f.label}</label>
                <input
                  type="number"
                  step={1}
                  value={f.key === "otherIncome" ? (otherIncome || "") : (formData[f.key as keyof PeriodData] || "")}
                  onChange={e => updateField(f.key, Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-blue-500 transition"
                  placeholder="0"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">Customer Count</label>
              <input
                type="number"
                step={1}
                value={customerCount || ""}
                onChange={e => setCustomerCount(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900
                  placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-blue-500 transition"
                placeholder="0"
              />
            </div>
          </div>

          {/* Computed Summary */}
          <div className="border-t border-slate-100 pt-5 mt-5">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3">Computed Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Total Income" value={formData.totalIncome} />
              <SummaryCard label="Gross Profit" value={formData.grossProfit} />
              <SummaryCard label="Net Income" value={formData.netIncome} />
              <SummaryCard label="AGP" value={formData.adjGrossProfit} />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : `Save Period ${selectedPeriod}`}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Saved successfully
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </span>
            )}
          </div>
        </div>

        {/* Existing Actuals Summary Table */}
        {existingActuals.size > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mt-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Saved Actuals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-2 text-left font-medium">Period</th>
                    <th className="py-2 px-2 text-right font-medium">Revenue</th>
                    <th className="py-2 px-2 text-right font-medium">COGS</th>
                    <th className="py-2 px-2 text-right font-medium">Expenses</th>
                    <th className="py-2 px-2 text-right font-medium">Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(existingActuals.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([p, d]) => (
                      <tr key={p} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-2 font-medium text-slate-700">P{p}</td>
                        <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(d.totalIncome)}</td>
                        <td className="py-2 px-2 text-right text-red-500/80 tabular-nums">{fmtCurrency(d.totalCOGS)}</td>
                        <td className="py-2 px-2 text-right text-red-500/80 tabular-nums">{fmtCurrency(d.totalExpense)}</td>
                        <td className={`py-2 px-2 text-right font-semibold tabular-nums ${d.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {fmtCurrency(d.netIncome)}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-[0.1em] mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${value >= 0 ? "text-slate-900" : "text-red-500"}`}>
        {fmtCurrency(value)}
      </p>
    </div>
  );
}
