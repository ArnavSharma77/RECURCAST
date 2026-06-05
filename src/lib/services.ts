export type ServiceName = "windows" | "refresh" | "sani" | "scrub" | "nonrestroom" | "oneoffs";

export const SERVICES: { key: ServiceName; label: string; color: string; icon: string }[] = [
  { key: "sani", label: "Sani", color: "#B8860B", icon: "S" },
  { key: "scrub", label: "Scrub", color: "#065F46", icon: "B" },
  { key: "windows", label: "Windows (RPM)", color: "#1E3A8A", icon: "W" },
  { key: "refresh", label: "Refresh", color: "#4338CA", icon: "R" },
  { key: "nonrestroom", label: "Non-Restroom/Janitorial", color: "#0891B2", icon: "N" },
  { key: "oneoffs", label: "One-Offs", color: "#7C3AED", icon: "O" },
];

export interface ServicePeriodData {
  periodNum: number;
  dataType: "budget" | "actual" | "forecast";
  revenue: number;
  cogs: number;
  grossProfit: number;
  franchiseFee: number;
  routeLabor: number;
  vehicleExpense: number;
  agp: number;
  laborCost: number;
  salesCost: number;
  operatingCost: number;
  overheadCost: number;
  totalExpense: number;
  netIncome: number;
  contributionMargin: number;
  customerCount: number;
}

export interface ServiceMetrics {
  service: ServiceName;
  budget: ServicePeriodData[];
  actuals: ServicePeriodData[];
  forecast: ServicePeriodData[];
}

export function getServiceLabel(key: ServiceName): string {
  return SERVICES.find(s => s.key === key)?.label ?? key;
}

export function getServiceColor(key: ServiceName): string {
  return SERVICES.find(s => s.key === key)?.color ?? "#1E3A8A";
}
