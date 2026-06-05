"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NUM_PERIODS, fmtCurrency, fmtPct } from "@/lib/model";
import { supabase } from "@/lib/supabase/client";
import { getClientServiceData } from "@/lib/service-data";
import { SERVICES, getServiceLabel, getServiceColor } from "@/lib/services";
import type { ServiceName, ServicePeriodData } from "@/lib/services";
import type { ClientRow, SavedScenarioRow } from "@/lib/supabase/types";
import { Nav } from "@/components/nav";
import { KpiRow } from "@/components/kpi-cards";
import { ArrowLeft, Save, FolderOpen, Trash2, Loader2 } from "lucide-react";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface ServiceWhatIfInputs {
  priceChangePct: number;
  priceChangeStart: number;
  cogsChangePct: number;
  laborChangePct: number;
  vehicleChangePct: number;
  volumeChangePerWeek: number;
  volumeChangeStart: number;
  addRouteTech: boolean;
  routeTechCost: number;
  routeTechStart: number;
}

function runServiceWhatIf(
  budget: ServicePeriodData[],
  actuals: ServicePeriodData[],
  inputs: ServiceWhatIfInputs,
  periodsCompleted: number
) {
  const basePeriods = Array.from({ length: 13 }, (_, i) =>
    i < periodsCompleted && actuals[i] ? actuals[i] : budget[i] ?? { revenue: 0, cogs: 0, franchiseFee: 0, routeLabor: 0, vehicleExpense: 0, netIncome: 0 }
  );

  const scenario = basePeriods.map((p, i) => {
    const pn = i + 1;
    if (pn <= periodsCompleted) return { ...p, scenarioRevenue: p.revenue, scenarioNetIncome: p.netIncome };

    let rev = p.revenue;
    let cogs = p.cogs;
    let labor = p.routeLabor;
    let vehicle = p.vehicleExpense;
    const franchiseFee = p.franchiseFee;

    // Price change
    if (inputs.priceChangePct !== 0 && pn >= inputs.priceChangeStart) {
      rev *= (1 + inputs.priceChangePct / 100);
    }

    // Volume change (additional customers)
    if (inputs.volumeChangePerWeek > 0 && pn >= inputs.volumeChangeStart) {
      const periodsActive = pn - inputs.volumeChangeStart + 1;
      const additionalRev = inputs.volumeChangePerWeek * 4 * periodsActive;
      rev += additionalRev;
    }

    // COGS change (rate adjustment)
    if (inputs.cogsChangePct !== 0) {
      cogs = rev * (p.revenue > 0 ? (p.cogs / p.revenue) + inputs.cogsChangePct / 100 : inputs.cogsChangePct / 100);
      if (cogs < 0) cogs = 0;
    }

    // Labor change
    if (inputs.laborChangePct !== 0) {
      labor = p.routeLabor * (1 + inputs.laborChangePct / 100);
    }

    // Vehicle change
    if (inputs.vehicleChangePct !== 0) {
      vehicle = p.vehicleExpense * (1 + inputs.vehicleChangePct / 100);
    }

    // Route tech addition
    if (inputs.addRouteTech && pn >= inputs.routeTechStart) {
      labor += inputs.routeTechCost;
    }

    const netIncome = rev - cogs - franchiseFee - labor - vehicle;
    return { ...p, scenarioRevenue: rev, scenarioNetIncome: netIncome, scenarioCogs: cogs, scenarioLabor: labor, scenarioVehicle: vehicle };
  });

  return scenario;
}

export default function PremiumServiceWhatIfPage() {
  const { service } = useParams<{ service: string }>();
  const serviceKey = service as ServiceName;
  const svc = SERVICES.find(s => s.key === serviceKey);

  const [loading, setLoading] = useState(true);
  const [periodsCompleted, setPeriodsCompleted] = useState(5);
  const [budget, setBudget] = useState<ServicePeriodData[]>([]);
  const [actuals, setActuals] = useState<ServicePeriodData[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");

  const [inputs, setInputs] = useState<ServiceWhatIfInputs>({
    priceChangePct: 0,
    priceChangeStart: 6,
    cogsChangePct: 0,
    laborChangePct: 0,
    vehicleChangePct: 0,
    volumeChangePerWeek: 0,
    volumeChangeStart: 6,
    addRouteTech: false,
    routeTechCost: 2500,
    routeTechStart: 6,
  });

  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioRow[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const cid = getClientId();
        setClientId(cid);
        if (!cid) { setLoading(false); return; }

        const { data: client } = await supabase.from("clients").select("*").eq("id", cid).single();
        if (!client) { setLoading(false); return; }
        const c = client as ClientRow;
        setPeriodsCompleted(c.periods_completed);
        setLocationName(c.name);

        const serviceData = await getClientServiceData(cid);
        if (serviceData && serviceData[serviceKey]) {
          setBudget(serviceData[serviceKey].budget);
          setActuals(serviceData[serviceKey].actuals);
        }

        const { data: scenarios } = await supabase
          .from("saved_scenarios")
          .select("*")
          .eq("client_id", cid)
          .eq("scope", "service")
          .eq("service_name", serviceKey)
          .order("created_at", { ascending: false });
        if (scenarios) setSavedScenarios(scenarios as SavedScenarioRow[]);
      } catch { /* fallback */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [serviceKey]);

  const scenario = useMemo(
    () => runServiceWhatIf(budget, actuals, inputs, periodsCompleted),
    [budget, actuals, inputs, periodsCompleted]
  );

  const baseYTDRev = scenario.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
  const baseFullRev = scenario.reduce((s, p) => s + p.revenue, 0);
  const scenarioFullRev = scenario.reduce((s, p) => s + (p.scenarioRevenue ?? p.revenue), 0);
  const baseFullNI = scenario.reduce((s, p) => s + p.netIncome, 0);
  const scenarioFullNI = scenario.reduce((s, p) => s + (p.scenarioNetIncome ?? p.netIncome), 0);
  const revImpact = scenarioFullRev - baseFullRev;
  const niImpact = scenarioFullNI - baseFullNI;
  const scenarioMargin = scenarioFullRev > 0 ? scenarioFullNI / scenarioFullRev : 0;

  async function handleSave() {
    if (!saveName.trim() || !clientId) return;
    const { data, error } = await supabase.from("saved_scenarios").insert({
      client_id: clientId,
      name: saveName.trim(),
      scope: "service",
      service_name: serviceKey,
      inputs: inputs as unknown as Record<string, unknown>,
      results_summary: { revImpact, niImpact, scenarioMargin },
    }).select().single();
    if (!error && data) {
      setSavedScenarios(prev => [data as SavedScenarioRow, ...prev]);
      setSaveName("");
      setShowSaveDialog(false);
    }
  }

  function loadScenario(sc: SavedScenarioRow) {
    const inp = sc.inputs as unknown as ServiceWhatIfInputs;
    setInputs(inp);
  }

  async function deleteScenario(id: string) {
    await supabase.from("saved_scenarios").delete().eq("id", id);
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="page-ambient min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
      </div>
    );
  }

  if (!svc) return <div className="p-8 text-red-500">Service not found</div>;

  return (
    <div className="page-ambient min-h-screen text-slate-900">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href={`/premium/${serviceKey}`} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: svc.color }}>{svc.icon}</span>
                {svc.label} — What-If
              </h2>
              <p className="text-xs text-slate-500">{locationName} · Service-level scenario modeling</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSaveDialog(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-900 font-medium transition-colors cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Save {svc.label} Scenario</h3>
            <input type="text" placeholder="Scenario name..." value={saveName} onChange={e => setSaveName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-4" autoFocus onKeyDown={e => e.key === "Enter" && handleSave()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="px-3 py-1.5 text-xs text-slate-500 cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={!saveName.trim()} className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-900 rounded-lg hover:bg-indigo-800 disabled:opacity-40 cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Saved Scenarios */}
        {savedScenarios.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap gap-2">
              {savedScenarios.map(sc => (
                <div key={sc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs">
                  <button onClick={() => loadScenario(sc)} className="font-medium text-slate-700 hover:text-indigo-900 cursor-pointer">{sc.name}</button>
                  <button onClick={() => deleteScenario(sc.id)} className="text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <KpiRow cards={[
          { label: "Revenue Impact", value: fmtCurrency(revImpact), sublabel: `Scenario vs base (full year)`, positive: revImpact === 0 ? null : revImpact > 0 },
          { label: "Net Income Impact", value: fmtCurrency(niImpact), sublabel: "Change in service profitability", positive: niImpact === 0 ? null : niImpact > 0 },
          { label: "Scenario Net Margin", value: fmtPct(scenarioMargin), sublabel: "Net income / revenue", positive: scenarioMargin > 0 ? true : scenarioMargin < 0 ? false : null },
          { label: "Scenario Revenue", value: fmtCurrency(scenarioFullRev, true), sublabel: "Full year with changes", positive: null },
        ]} />

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Controls */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: svc.color }} />
                Service Scenario Controls
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price Change %</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={-20} max={25} step={1} value={inputs.priceChangePct} onChange={e => setInputs(p => ({ ...p, priceChangePct: Number(e.target.value) }))} className="flex-1 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-900 w-10 text-right tabular-nums">{inputs.priceChangePct > 0 ? "+" : ""}{inputs.priceChangePct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Service price increase/decrease</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price Change Start Period</label>
                  <input type="range" min={1} max={13} step={1} value={inputs.priceChangeStart} onChange={e => setInputs(p => ({ ...p, priceChangeStart: Number(e.target.value) }))} className="w-full cursor-pointer" />
                  <span className="text-[10px] text-slate-500">P{inputs.priceChangeStart}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">COGS Rate Change %</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={-10} max={10} step={1} value={inputs.cogsChangePct} onChange={e => setInputs(p => ({ ...p, cogsChangePct: Number(e.target.value) }))} className="flex-1 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-900 w-10 text-right tabular-nums">{inputs.cogsChangePct > 0 ? "+" : ""}{inputs.cogsChangePct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Adjust COGS as % of revenue (+ = higher cost)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Labor Change %</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={-30} max={30} step={5} value={inputs.laborChangePct} onChange={e => setInputs(p => ({ ...p, laborChangePct: Number(e.target.value) }))} className="flex-1 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-900 w-10 text-right tabular-nums">{inputs.laborChangePct > 0 ? "+" : ""}{inputs.laborChangePct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Route labor cost adjustment</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Volume ($/wk new customers)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={500} step={25} value={inputs.volumeChangePerWeek} onChange={e => setInputs(p => ({ ...p, volumeChangePerWeek: Number(e.target.value) }))} className="flex-1 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-900 w-14 text-right tabular-nums">${inputs.volumeChangePerWeek}/wk</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Additional weekly revenue from new customers</span>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={inputs.addRouteTech} onChange={e => setInputs(p => ({ ...p, addRouteTech: e.target.checked }))} className="rounded border-slate-300 text-indigo-900 focus:ring-indigo-200 w-3.5 h-3.5" />
                    <span className="text-xs font-semibold text-slate-700">Add Route Tech</span>
                  </label>
                  {inputs.addRouteTech && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500">Cost/period</span>
                        <input type="number" value={inputs.routeTechCost} onChange={e => setInputs(p => ({ ...p, routeTechCost: Number(e.target.value) }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500">Start Period</span>
                        <input type="number" min={1} max={13} value={inputs.routeTechStart} onChange={e => setInputs(p => ({ ...p, routeTechStart: Number(e.target.value) }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts / Table */}
          <div className="lg:col-span-2 space-y-5">
            {/* Revenue comparison chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Revenue: Base vs Scenario</h4>
              <p className="text-[11px] text-slate-500 mb-4">Per-period revenue comparison</p>
              <div className="flex items-end gap-1 h-40">
                {scenario.map((p, i) => {
                  const base = p.revenue;
                  const scen = p.scenarioRevenue ?? p.revenue;
                  const maxVal = Math.max(...scenario.map(s => Math.max(s.revenue, s.scenarioRevenue ?? s.revenue)));
                  const baseH = maxVal > 0 ? (base / maxVal) * 100 : 0;
                  const scenH = maxVal > 0 ? (scen / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex items-end gap-[1px]" title={`P${i + 1}: Base ${fmtCurrency(base)}, Scenario ${fmtCurrency(scen)}`}>
                      <div className="flex-1 bg-slate-300 rounded-t" style={{ height: `${baseH}%` }} />
                      <div className="flex-1 rounded-t" style={{ height: `${scenH}%`, background: svc.color, opacity: 0.7 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-300" /> Base</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: svc.color, opacity: 0.7 }} /> Scenario</span>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                  {[1, 4, 7, 10, 13].map(p => <span key={p}>P{p}</span>)}
                </div>
              </div>
            </div>

            {/* Net Income comparison */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Net Income: Base vs Scenario</h4>
              <p className="text-[11px] text-slate-500 mb-4">Per-period net income comparison</p>
              <div className="flex items-end gap-1 h-40">
                {scenario.map((p, i) => {
                  const base = p.netIncome;
                  const scen = p.scenarioNetIncome ?? p.netIncome;
                  const allVals = scenario.flatMap(s => [s.netIncome, s.scenarioNetIncome ?? s.netIncome]);
                  const maxVal = Math.max(...allVals.map(Math.abs));
                  const baseH = maxVal > 0 ? (Math.abs(base) / maxVal) * 50 : 0;
                  const scenH = maxVal > 0 ? (Math.abs(scen) / maxVal) * 50 : 0;
                  return (
                    <div key={i} className="flex-1 flex items-center gap-[1px] flex-col justify-end h-full">
                      <div className="flex items-end gap-[1px] w-full" style={{ height: "50%" }}>
                        <div className={`flex-1 rounded-t ${base >= 0 ? "bg-slate-300" : ""}`} style={{ height: base >= 0 ? `${baseH * 2}%` : "0%" }} />
                        <div className={`flex-1 rounded-t`} style={{ height: scen >= 0 ? `${scenH * 2}%` : "0%", background: scen >= 0 ? svc.color : "", opacity: 0.7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 text-[10px] text-slate-500 mt-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-300" /> Base</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: svc.color, opacity: 0.7 }} /> Scenario</span>
              </div>
            </div>

            {/* Period detail table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 overflow-x-auto">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Period Detail</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-2 text-left font-medium">Period</th>
                    <th className="py-2 px-2 text-right font-medium">Base Rev</th>
                    <th className="py-2 px-2 text-right font-medium">Scenario Rev</th>
                    <th className="py-2 px-2 text-right font-medium">Base NI</th>
                    <th className="py-2 px-2 text-right font-medium">Scenario NI</th>
                    <th className="py-2 px-2 text-right font-medium">NI Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.map((p, i) => {
                    const niDiff = (p.scenarioNetIncome ?? p.netIncome) - p.netIncome;
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 font-medium text-slate-700">P{i + 1}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{fmtCurrency(p.revenue)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-medium">{fmtCurrency(p.scenarioRevenue ?? p.revenue)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{fmtCurrency(p.netIncome)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-medium">{fmtCurrency(p.scenarioNetIncome ?? p.netIncome)}</td>
                        <td className={`py-1.5 px-2 text-right tabular-nums font-semibold ${niDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{niDiff !== 0 ? fmtCurrency(niDiff) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="py-2 px-2 text-slate-700">Total</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtCurrency(baseFullRev)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtCurrency(scenarioFullRev)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtCurrency(baseFullNI)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtCurrency(scenarioFullNI)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums ${niImpact >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtCurrency(niImpact)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
