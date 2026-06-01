"use client";

import { type Tier, TIERS, getUpgradeTier } from "@/lib/tiers";

interface FeatureGateProps {
  tier: Tier;
  requiredTier: Tier;
  featureName: string;
  children: React.ReactNode;
}

const TIER_RANK: Record<Tier, number> = {
  base: 1,
  premium: 2,
};

export function FeatureGate({ tier, requiredTier, featureName, children }: FeatureGateProps) {
  if (TIER_RANK[tier] >= TIER_RANK[requiredTier]) {
    return <>{children}</>;
  }

  const upgradeTo = getUpgradeTier(tier);
  const upgradeConfig = upgradeTo ? TIERS[upgradeTo] : null;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="card-panel p-6 text-center max-w-sm shadow-2xl">
          <div className="text-amber-600 text-2xl mb-2">&#128274;</div>
          <h3 className="text-slate-900 font-semibold text-sm mb-1">
            {featureName}
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            This feature requires the{" "}
            <span className="text-indigo-900 font-medium">{TIERS[requiredTier].name}</span>{" "}
            plan or higher.
          </p>
          {upgradeConfig && (
            <button className="btn-primary text-xs py-2 px-4">
              Upgrade to {upgradeConfig.name} (${upgradeConfig.price}/mo)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
