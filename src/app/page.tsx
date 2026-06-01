"use client";

import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/nav";
import { ShinyButton } from "@/components/shiny-button";
import {
  BarChart3,
  Sliders,
  ClipboardCheck,
  Crown,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="page-ambient min-h-screen flex flex-col">
      <Nav />
      <div className="hero-glow" aria-hidden="true" />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-8 py-10 sm:py-14 relative z-10">
        <div className="max-w-4xl w-full space-y-12">

          {/* Hero */}
          <section className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-200/40 via-transparent to-blue-100/30 blur-2xl scale-150" aria-hidden="true" />
                <Image
                  src="/logo.png"
                  alt="RecurCast"
                  width={156}
                  height={156}
                  className="relative drop-shadow-xl"
                  priority
                  unoptimized
                />
              </div>
            </div>
            <span className="eyebrow-pill">Foresight Finance</span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight text-slate-900">
              Stop Hoping.{" "}
              <span className="gradient-text">Build a Strategy.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl mx-auto font-light">
              Model staffing, sales growth, and retention in real time.
              Watch revenue, costs, and net income update as you adjust the plan.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1">
              <Link href="/whatif" className="landing-cta-primary">
                <ShinyButton>Try What-If Scenarios</ShinyButton>
              </Link>
              <Link href="/premium" className="btn-premium-cta landing-cta-secondary">
                <Crown className="w-4 h-4" />
                Explore Premium
              </Link>
              <Link href="/dashboard" className="btn-secondary landing-cta-tertiary">
                <BarChart3 className="w-4 h-4" />
                View Dashboard
              </Link>
            </div>
          </section>

          {/* Tools grid */}
          <section className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Everything in one place</h2>
              <p className="text-sm text-slate-400">Four tools. One complete picture.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <StoryCard
                icon={<BarChart3 className="w-4 h-4" />}
                iconColor="text-[#1E3A8A]"
                iconBg="bg-blue-50 border-blue-100"
                title="Dashboard"
                description="Financials at a glance. Revenue vs budget, net profit, and expenses."
                href="/dashboard"
              />
              <StoryCard
                icon={<Sliders className="w-4 h-4" />}
                iconColor="text-[#4338CA]"
                iconBg="bg-indigo-50 border-indigo-100"
                title="Instant What-If"
                description="See revenue, costs, and net income update live. Model staff, sales, or payback."
                href="/whatif"
              />
              <StoryCard
                icon={<ClipboardCheck className="w-4 h-4" />}
                iconColor="text-[#065F46]"
                iconBg="bg-emerald-50 border-emerald-100"
                title="13-Period Rolling"
                description="Enter actuals each period. They blend into the forecast automatically."
                href="/actuals"
              />
              <StoryCard
                icon={<Crown className="w-4 h-4" />}
                iconColor="text-[#1E3A8A]"
                iconBg="bg-blue-50 border-blue-100"
                title="Premium Analytics"
                description="Per-service deep dive. Revenue, AGP, labor, and COGS by period."
                href="/premium"
                highlight
              />
            </div>
          </section>

          {/* Premium + Quick Start */}
          <section className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 premium-spotlight p-6 sm:p-7 shadow-lg shadow-[#1E3A8A]/5">
              <div className="premium-spotlight__inner space-y-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#4338CA] flex items-center justify-center shadow-lg shadow-[#1E3A8A]/20">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1E3A8A]">Premium</span>
                    <h3 className="text-base font-semibold text-slate-900 leading-tight mt-0.5">Service-Level Analytics</h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Dedicated charts per service line. Revenue, AGP, labor, and COGS in one view.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PremiumPill icon={<TrendingUp className="w-3 h-3" />} label="Revenue vs Budget" />
                  <PremiumPill icon={<DollarSign className="w-3 h-3" />} label="AGP Tracking" />
                  <PremiumPill icon={<Users className="w-3 h-3" />} label="Labor Analysis" />
                  <PremiumPill icon={<BarChart3 className="w-3 h-3" />} label="COGS Breakdown" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/premium" className="btn-premium-cta landing-cta-compact">
                    <Crown className="w-3.5 h-3.5" />
                    Explore Premium
                  </Link>
                  <Link href="/whatif" className="text-sm font-medium text-[#1E2A5E] hover:text-[#4338CA] inline-flex items-center gap-1">
                    Try What-If Scenarios <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 elegant-card p-5 sm:p-6 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Start</h3>
              <ol className="space-y-3 text-sm text-slate-500 flex-1">
                <li className="flex gap-3 items-start">
                  <StepNumber n={1} />
                  <Link href="/dashboard" className="hover:text-[#1E2A5E] transition-colors"><strong className="text-slate-800 font-medium hover:text-[#1E2A5E]">Dashboard</strong> - review financials at a glance.</Link>
                </li>
                <li className="flex gap-3 items-start">
                  <StepNumber n={2} />
                  <Link href="/whatif" className="hover:text-[#1E2A5E] transition-colors"><strong className="text-slate-800 font-medium hover:text-[#1E2A5E]">What-If</strong> - model staff, sales, or cancellation rate.</Link>
                </li>
                <li className="flex gap-3 items-start">
                  <StepNumber n={3} />
                  <Link href="/actuals" className="hover:text-[#1E2A5E] transition-colors"><strong className="text-slate-800 font-medium hover:text-[#1E2A5E]">Actuals</strong> - enter each period to keep the forecast accurate.</Link>
                </li>
              </ol>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-semibold flex items-center justify-center border border-indigo-100">
      {n}
    </span>
  );
}

function StoryCard({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  href,
  highlight,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="group block h-full">
      <div className={`spotlight-card relative p-5 h-full space-y-2.5 transition-all duration-300 ${highlight ? "premium-story-card" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>
        <span className="text-[11px] font-medium text-slate-400 group-hover:text-[#1E2A5E] transition-colors inline-flex items-center gap-1">
          Open <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

function PremiumPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/90 border border-[#1E3A8A]/10 px-2.5 py-1.5 shadow-sm">
      <span className="text-[#1E3A8A]">{icon}</span>
      <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">{label}</span>
    </div>
  );
}
