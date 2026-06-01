"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { CheckCircle, Upload, Building2, BarChart3, DollarSign, Settings2 } from "lucide-react";

interface IntakeFormData {
  locationName: string;
  fiscalYear: number;
  periodsCompleted: number;
  customerCount: number;
  serviceRev: number;
  productRev: number;
  installRev: number;
  tripRev: number;
  totalCOGS: number;
  laborExpense: number;
  franchiseFees: number;
  otherExpense: number;
  franchiseFeeRate: number;
  cxRate: number;
  avgServicePrice: number;
  tripChargePerCust: number;
  commissionRate: number;
  numSalespeople: number;
  allocWin: number;
  allocRef: number;
  allocSan: number;
  uploadFile: File | null;
}

export default function IntakePage() {
  const [formData, setFormData] = useState<IntakeFormData>({
    locationName: "",
    fiscalYear: 2026,
    periodsCompleted: 0,
    customerCount: 0,
    serviceRev: 0,
    productRev: 0,
    installRev: 0,
    tripRev: 0,
    totalCOGS: 0,
    laborExpense: 0,
    franchiseFees: 0,
    otherExpense: 0,
    franchiseFeeRate: 13,
    cxRate: 10,
    avgServicePrice: 480,
    tripChargePerCust: 10,
    commissionRate: 10,
    numSalespeople: 1,
    allocWin: 30,
    allocRef: 40,
    allocSan: 30,
    uploadFile: null,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const updateField = <K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (submitted) {
    return (
      <div className="page-ambient min-h-screen text-slate-900 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold">Onboarding Complete</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your data has been submitted. In the full version, this will be saved to your account
            and your dashboard will be generated automatically.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Link href="/dashboard" className="btn-primary">
              View Dashboard
            </Link>
            <Link href="/whatif" className="btn-secondary">
              Try What-If
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allocTotal = formData.allocWin + formData.allocRef + formData.allocSan;
  const totalRevenue = formData.serviceRev + formData.productRev + formData.installRev + formData.tripRev;
  const totalExpenses = formData.laborExpense + formData.franchiseFees + formData.otherExpense;
  const grossProfit = totalRevenue - formData.totalCOGS;
  const netIncome = grossProfit - totalExpenses;

  return (
    <div className="page-ambient min-h-screen text-slate-900">
      <Nav />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">New Client Onboarding</h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Enter category totals from one recent period (4 weeks). The model will derive ratios and build the full forecast.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Location Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <SectionHeader icon={<Building2 className="w-3.5 h-3.5" />} number={1} title="Location Info" />

            <FormField label="Location / Business Name" required>
              <input
                type="text" required
                value={formData.locationName}
                onChange={e => updateField("locationName", e.target.value)}
                placeholder="e.g. EnviroMaster of St. Louis"
                className="input-field"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Fiscal Year">
                <input
                  type="number" min={2024} max={2030}
                  value={formData.fiscalYear}
                  onChange={e => updateField("fiscalYear", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Periods Completed">
                <input
                  type="number" min={0} max={13}
                  value={formData.periodsCompleted}
                  onChange={e => updateField("periodsCompleted", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Customer Count">
                <input
                  type="number" min={0}
                  value={formData.customerCount}
                  onChange={e => updateField("customerCount", Number(e.target.value))}
                  placeholder="e.g. 578"
                  className="input-field"
                />
              </FormField>
            </div>
          </section>

          {/* Section 2: P&L Upload */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <SectionHeader icon={<Upload className="w-3.5 h-3.5" />} number={2} title="P&L Upload (Optional)" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload a CSV or Excel P&L export. We&apos;ll auto-fill the fields below.
              Or skip this and enter totals manually.
            </p>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center
              hover:border-blue-600/30 transition-all duration-200 cursor-pointer hover:bg-indigo-900/[0.02]">
              <input
                type="file" accept=".csv,.xlsx,.xls"
                className="hidden" id="plUpload"
                onChange={e => updateField("uploadFile", e.target.files?.[0] ?? null)}
              />
              <label htmlFor="plUpload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                <div className="text-slate-400 text-xs">
                  {formData.uploadFile
                    ? <span className="text-emerald-600 font-medium">{formData.uploadFile.name}</span>
                    : <>Drop CSV/Excel here or <span className="text-indigo-900 underline">browse</span></>
                  }
                </div>
              </label>
            </div>
          </section>

          {/* Section 3: Revenue (Category Totals) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} number={3} title="Revenue & Costs (Per Period)" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Enter category totals for one representative period (4 weeks). Category totals only, no subcategories.
            </p>

            <div className="space-y-3">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Revenue</span>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Service Revenue">
                  <input
                    type="number" min={0} step={1}
                    value={formData.serviceRev || ""}
                    onChange={e => updateField("serviceRev", Number(e.target.value))}
                    placeholder="e.g. 232009"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Product Revenue">
                  <input
                    type="number" min={0} step={1}
                    value={formData.productRev || ""}
                    onChange={e => updateField("productRev", Number(e.target.value))}
                    placeholder="e.g. 19837"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Install Revenue">
                  <input
                    type="number" min={0} step={1}
                    value={formData.installRev || ""}
                    onChange={e => updateField("installRev", Number(e.target.value))}
                    placeholder="e.g. 3825"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Trip Charge Revenue">
                  <input
                    type="number" min={0} step={1}
                    value={formData.tripRev || ""}
                    onChange={e => updateField("tripRev", Number(e.target.value))}
                    placeholder="e.g. 15181"
                    className="input-field"
                  />
                </FormField>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Costs & Expenses</span>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Total COGS">
                  <input
                    type="number" min={0} step={1}
                    value={formData.totalCOGS || ""}
                    onChange={e => updateField("totalCOGS", Number(e.target.value))}
                    placeholder="e.g. 23250"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Labor Expense">
                  <input
                    type="number" min={0} step={1}
                    value={formData.laborExpense || ""}
                    onChange={e => updateField("laborExpense", Number(e.target.value))}
                    placeholder="e.g. 120000"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Franchise Fees">
                  <input
                    type="number" min={0} step={1}
                    value={formData.franchiseFees || ""}
                    onChange={e => updateField("franchiseFees", Number(e.target.value))}
                    placeholder="e.g. 38000"
                    className="input-field"
                  />
                </FormField>
                <FormField label="Other Operating Expenses">
                  <input
                    type="number" min={0} step={1}
                    value={formData.otherExpense || ""}
                    onChange={e => updateField("otherExpense", Number(e.target.value))}
                    placeholder="e.g. 35000"
                    className="input-field"
                  />
                </FormField>
              </div>
            </div>

            {/* Live P&L Summary */}
            {totalRevenue > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-3">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Period Summary</span>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <MiniStat label="Revenue" value={totalRevenue} />
                  <MiniStat label="Gross Profit" value={grossProfit} />
                  <MiniStat label="Net Income" value={netIncome} highlight />
                  <MiniStat label="COGS %" value={totalRevenue > 0 ? Math.round((formData.totalCOGS / totalRevenue) * 100) : 0} suffix="%" />
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Model Parameters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <SectionHeader icon={<Settings2 className="w-3.5 h-3.5" />} number={4} title="Model Parameters" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              These are used for the What-If scenario engine. Most can be derived from the P&L data above.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cancellation Rate (%)">
                <input
                  type="number" min={0} max={50} step={1}
                  value={formData.cxRate}
                  onChange={e => updateField("cxRate", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Franchise Fee Rate (%)">
                <input
                  type="number" min={0} max={30} step={1}
                  value={formData.franchiseFeeRate}
                  onChange={e => updateField("franchiseFeeRate", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Trip Charge ($/customer)">
                <input
                  type="number" min={0} step={1}
                  value={formData.tripChargePerCust}
                  onChange={e => updateField("tripChargePerCust", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Commission Rate (%)">
                <input
                  type="number" min={0} max={30} step={1}
                  value={formData.commissionRate}
                  onChange={e => updateField("commissionRate", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="Avg Service Price ($/customer)">
                <input
                  type="number" min={0} step={10}
                  value={formData.avgServicePrice}
                  onChange={e => updateField("avgServicePrice", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
              <FormField label="# Salespeople (current)">
                <input
                  type="number" min={0} max={20} step={1}
                  value={formData.numSalespeople}
                  onChange={e => updateField("numSalespeople", Number(e.target.value))}
                  className="input-field"
                />
              </FormField>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                Service Allocation (must total 100%)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "allocWin" as const, label: "Windows/RPM" },
                  { key: "allocRef" as const, label: "Refresh" },
                  { key: "allocSan" as const, label: "Sani" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
                    <input
                      type="number" min={0} max={100}
                      value={formData[key]}
                      onChange={e => updateField(key, Number(e.target.value))}
                      className="input-field text-sm"
                    />
                  </div>
                ))}
              </div>
              {allocTotal !== 100 && (
                <p className="text-[10px] text-amber-600 mt-1.5">
                  Total is {allocTotal}% (should be 100%)
                </p>
              )}
            </div>
          </section>

          <button type="submit" className="btn-primary w-full">
            Submit & Generate Forecast
          </button>
        </form>
      </main>
    </div>
  );
}

function SectionHeader({ icon, number, title }: { icon: React.ReactNode; number: number; title: string }) {
  return (
    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2.5">
      <span className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-900 text-xs flex items-center justify-center font-bold">{number}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-indigo-900">{icon}</span>
        {title}
      </span>
    </h2>
  );
}

function FormField({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ label, value, suffix, highlight }: {
  label: string; value: number; suffix?: string; highlight?: boolean;
}) {
  const formatted = suffix === "%"
    ? `${value}%`
    : `$${Math.abs(value).toLocaleString()}`;
  const color = highlight
    ? value >= 0 ? "text-emerald-600" : "text-red-500"
    : "text-slate-900";
  return (
    <div className="text-center">
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
      <div className={`text-xs font-bold tabular-nums ${color}`}>
        {value < 0 && !suffix ? "-" : ""}{formatted}
      </div>
    </div>
  );
}
