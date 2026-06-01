/**
 * Tier-based feature gating for RecurCast.
 * Base ($100/mo) and Premium ($175/mo), 10% annual discount.
 */

export type Tier = "base" | "premium";

export interface TierConfig {
  name: string;
  price: number;
  annualPrice: number;
  features: string[];
  maxScenarios: number;
  hasWhatIf: boolean;
  hasServiceProfitability: boolean;
  hasPDFReports: boolean;
  hasCustomBranding: boolean;
}

export const TIERS: Record<Tier, TierConfig> = {
  base: {
    name: "Base",
    price: 100,
    annualPrice: 1080,
    features: [
      "Dashboard with KPIs & charts",
      "Monthly PDF report (emailed)",
      "Rolling forecast (actual + budget blend)",
      "Revenue vs Budget tracking",
      "Year-end run rate projection",
      "Revenue, AGP, & Net Profit graphs",
      "What-If scenario tool (1 change/month included)",
      "Salesperson payback calculator",
      "$50 per additional scenario change",
    ],
    maxScenarios: 1,
    hasWhatIf: true,
    hasServiceProfitability: false,
    hasPDFReports: true,
    hasCustomBranding: false,
  },
  premium: {
    name: "Premium",
    price: 175,
    annualPrice: 1890,
    features: [
      "Everything in Base, plus:",
      "Unlimited What-If scenarios",
      "Per-service profitability analysis",
      "Labor breakdown by service category",
      "Project ROI calculator",
      "Premium pricing sheet (AGP by price point)",
      "Custom branding on reports",
      "Priority support",
    ],
    maxScenarios: Infinity,
    hasWhatIf: true,
    hasServiceProfitability: true,
    hasPDFReports: true,
    hasCustomBranding: true,
  },
};

export function canAccessFeature(
  tier: Tier,
  feature: keyof Omit<TierConfig, "name" | "price" | "annualPrice" | "features" | "maxScenarios">
): boolean {
  return TIERS[tier][feature];
}

export function canSaveScenario(tier: Tier, currentCount: number): boolean {
  return currentCount < TIERS[tier].maxScenarios;
}

export function getUpgradeTier(currentTier: Tier): Tier | null {
  if (currentTier === "base") return "premium";
  return null;
}
