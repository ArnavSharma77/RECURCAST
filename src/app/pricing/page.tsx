"use client";

import { TIERS, type Tier } from "@/lib/tiers";
import { Nav } from "@/components/nav";
import { Check, Star } from "lucide-react";

export default function PricingPage() {
  const tiers: Tier[] = ["base", "premium"];

  return (
    <div className="page-ambient min-h-screen">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">Simple, Transparent Pricing</h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-md mx-auto font-light">
            Start with Base. Upgrade to Premium when you&apos;re ready for deeper insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {tiers.map(tierKey => {
            const config = TIERS[tierKey];
            const isPremium = tierKey === "premium";
            return (
              <div
                key={tierKey}
                className={`relative spotlight-card p-7 sm:p-8 flex flex-col ${
                  isPremium
                    ? "!border-indigo-200 ring-1 ring-indigo-100"
                    : ""
                }`}
              >
                {isPremium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-md bg-gradient-to-r from-[#1E2A5E] to-[#4338CA] text-white">
                    <Star className="w-2.5 h-2.5" />
                    Full Power
                  </span>
                )}
                <h2 className="text-lg font-semibold text-slate-900">{config.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-slate-900 tabular-nums">${config.price}</span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  or <span className="text-slate-600 font-medium">${config.annualPrice.toLocaleString()}/year</span> (save 10%)
                </p>
                <ul className="mt-6 space-y-3 flex-1">
                  {config.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-slate-600">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-7 w-full py-3 rounded-lg font-medium text-sm cursor-pointer
                    transition-all duration-200 ${
                    isPremium
                      ? "btn-primary justify-center"
                      : "border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 hover:bg-indigo-50"
                  }`}
                >
                  Get Started
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm text-slate-400 pt-4">
          All plans include email support, data security with row-level access, and monthly PDF reports.
        </div>
      </main>
    </div>
  );
}
