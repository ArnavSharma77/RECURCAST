/**
 * Warren's actual data hardcoded for demo purposes.
 * Sourced from EnviroMaster_Budget_Base_WARREN.xlsx.
 */
import type { ClientParameters, PeriodData } from "./model";

export const DEMO_PARAMS: ClientParameters = {
  locationName: "EnviroMaster of St. Louis",
  fiscalYear: 2026,
  periodsCompleted: 4,
  cxRate: 0.10,
  avgServicePrice: 480,
  tripChargePerCust: 10,
  allocWin: 0.30,
  allocRef: 0.40,
  allocSan: 0.30,
  instRateWin: 2.0,
  instRateRef: 0.10,
  instRateSan: 0.50,
  commissionRate: 0.10,
};

// All 13 periods from CX sheet (original budget). One-off revenue is NOT carried forward.
export const DEMO_BUDGET: PeriodData[] = [
  { productRev: 18280, serviceRev: 219155, installRev: 7253, tripRev: 11993, totalIncome: 258081, totalCOGS: 19426, grossProfit: 238655, totalExpense: 243554, netIncome: -2652, adjGrossProfit: 202621 },
  { productRev: 18640, serviceRev: 226548, installRev: 990,  tripRev: 12148, totalIncome: 259726, totalCOGS: 14073, grossProfit: 245653, totalExpense: 226615, netIncome: 19038, adjGrossProfit: 209404 },
  { productRev: 19924, serviceRev: 234664, installRev: 1089, tripRev: 12317, totalIncome: 269394, totalCOGS: 14873, grossProfit: 254520, totalExpense: 231329, netIncome: 23192, adjGrossProfit: 217004 },
  { productRev: 20284, serviceRev: 243140, installRev: 1139, tripRev: 12495, totalIncome: 278457, totalCOGS: 15220, grossProfit: 263237, totalExpense: 235511, netIncome: 27727, adjGrossProfit: 224534 },
  { productRev: 20644, serviceRev: 252338, installRev: 1238, tripRev: 12688, totalIncome: 288307, totalCOGS: 15623, grossProfit: 272684, totalExpense: 263902, netIncome: 8781,  adjGrossProfit: 232691 },
  { productRev: 21004, serviceRev: 262257, installRev: 1337, tripRev: 12896, totalIncome: 298893, totalCOGS: 16039, grossProfit: 282855, totalExpense: 274255, netIncome: 8599,  adjGrossProfit: 241475 },
  { productRev: 21364, serviceRev: 273021, installRev: 1436, tripRev: 13120, totalIncome: 310340, totalCOGS: 16466, grossProfit: 293874, totalExpense: 264964, netIncome: 28910, adjGrossProfit: 250994 },
  { productRev: 21724, serviceRev: 284383, installRev: 1535, tripRev: 13359, totalIncome: 322400, totalCOGS: 16906, grossProfit: 305494, totalExpense: 270925, netIncome: 34569, adjGrossProfit: 261035 },
  { productRev: 22084, serviceRev: 296105, installRev: 1584, tripRev: 13606, totalIncome: 334779, totalCOGS: 17307, grossProfit: 317471, totalExpense: 276475, netIncome: 40997, adjGrossProfit: 271390 },
  { productRev: 22444, serviceRev: 307828, installRev: 1584, tripRev: 13853, totalIncome: 347108, totalCOGS: 17664, grossProfit: 329444, totalExpense: 282462, netIncome: 46982, adjGrossProfit: 281748 },
  { productRev: 22804, serviceRev: 319550, installRev: 1584, tripRev: 14099, totalIncome: 359438, totalCOGS: 18022, grossProfit: 341416, totalExpense: 286449, netIncome: 54967, adjGrossProfit: 292105 },
  { productRev: 23164, serviceRev: 331273, installRev: 1584, tripRev: 14346, totalIncome: 371767, totalCOGS: 18379, grossProfit: 353387, totalExpense: 291436, netIncome: 61951, adjGrossProfit: 302461 },
  { productRev: 23524, serviceRev: 342995, installRev: 1584, tripRev: 14593, totalIncome: 384096, totalCOGS: 18737, grossProfit: 365359, totalExpense: 296423, netIncome: 68936, adjGrossProfit: 312817 },
];

// P1-P4 actuals. Revenue/COGS from RF; Expenses/Net Income from Actuals Input sheet
// (RF has expense formula bug for P3/P4 that understates expenses by ~$40K).
export const DEMO_ACTUALS: PeriodData[] = [
  { productRev: 18351, serviceRev: 215530, installRev: 2964, tripRev: 14692, totalIncome: 251537, totalCOGS: 41070, grossProfit: 210467, totalExpense: 214682, netIncome: -5291, adjGrossProfit: 176234 },
  { productRev: 19837, serviceRev: 232009, installRev: 3825, tripRev: 15181, totalIncome: 270852, totalCOGS: 23250, grossProfit: 247602, totalExpense: 254355, netIncome: 23574, adjGrossProfit: 170496 },
  { productRev: 22474, serviceRev: 270411, installRev: 4242, tripRev: 15137, totalIncome: 312264, totalCOGS: 19200, grossProfit: 293064, totalExpense: 242994, netIncome: 50973, adjGrossProfit: 249102 },
  { productRev: 22185, serviceRev: 266282, installRev: 2690, tripRev: 15677, totalIncome: 306834, totalCOGS: 34712, grossProfit: 272122, totalExpense: 237373, netIncome: 35837, adjGrossProfit: 231150 },
];

// Rolling Forecast projections for P5-P13 (from corrected V11 with Mgmt/Bonus fix).
const DEMO_RF_PROJECTIONS: PeriodData[] = [
  { productRev: 22585, serviceRev: 256332, installRev: 1238, tripRev: 14097, totalIncome: 295652, totalCOGS: 16106, grossProfit: 279546, totalExpense: 260788, netIncome: 18758, adjGrossProfit: 238598 },
  { productRev: 22985, serviceRev: 267182, installRev: 1336, tripRev: 14329, totalIncome: 307232, totalCOGS: 16562, grossProfit: 290670, totalExpense: 271543, netIncome: 19127, adjGrossProfit: 248206 },
  { productRev: 23385, serviceRev: 278832, installRev: 1436, tripRev: 14577, totalIncome: 319630, totalCOGS: 17031, grossProfit: 302599, totalExpense: 262637, netIncome: 39962, adjGrossProfit: 258512 },
  { productRev: 23785, serviceRev: 291282, installRev: 1534, tripRev: 14843, totalIncome: 332845, totalCOGS: 17514, grossProfit: 315331, totalExpense: 269067, netIncome: 46263, adjGrossProfit: 269514 },
  { productRev: 24185, serviceRev: 304132, installRev: 1584, tripRev: 15117, totalIncome: 346418, totalCOGS: 17959, grossProfit: 328460, totalExpense: 275104, netIncome: 53356, adjGrossProfit: 280866 },
  { productRev: 24585, serviceRev: 316982, installRev: 1584, tripRev: 15392, totalIncome: 359943, totalCOGS: 18360, grossProfit: 341583, totalExpense: 281578, netIncome: 60006, adjGrossProfit: 292218 },
  { productRev: 24985, serviceRev: 329832, installRev: 1584, tripRev: 15666, totalIncome: 373467, totalCOGS: 18760, grossProfit: 354707, totalExpense: 286051, netIncome: 68655, adjGrossProfit: 303572 },
  { productRev: 25385, serviceRev: 342682, installRev: 1584, tripRev: 15940, totalIncome: 386991, totalCOGS: 19162, grossProfit: 367830, totalExpense: 291525, netIncome: 76304, adjGrossProfit: 314924 },
  { productRev: 25785, serviceRev: 355532, installRev: 1584, tripRev: 16215, totalIncome: 400516, totalCOGS: 19563, grossProfit: 380952, totalExpense: 296999, netIncome: 83953, adjGrossProfit: 326276 },
];

// Customer counts per period (from Warren's data; P5-P13 held at P4 level as estimate)
export const DEMO_CUSTOMER_COUNTS = [578, 592, 586, 569, 569, 569, 569, 569, 569, 569, 569, 569, 569];

export function getDemoForecast(): PeriodData[] {
  const pc = DEMO_PARAMS.periodsCompleted;
  return Array.from({ length: 13 }, (_, i) => {
    if (i < pc) return DEMO_ACTUALS[i];
    return DEMO_RF_PROJECTIONS[i - pc];
  });
}

export function getDemoAGPPct(): number {
  const forecast = getDemoForecast();
  const totalRev = forecast.reduce((s, p) => s + p.totalIncome, 0);
  const totalAGP = forecast.reduce((s, p) => s + p.adjGrossProfit, 0);
  return totalRev > 0 ? totalAGP / totalRev : 0;
}

/**
 * Avg Weekly Revenue per Customer for completed periods.
 * = Service Revenue / (Customer Count × 4 weeks per period)
 */
export function getDemoAvgWeeklyRevPerCust(): number {
  const pc = DEMO_PARAMS.periodsCompleted;
  let totalSvcRev = 0;
  let totalCustWeeks = 0;
  for (let i = 0; i < pc; i++) {
    totalSvcRev += DEMO_ACTUALS[i].serviceRev;
    totalCustWeeks += DEMO_CUSTOMER_COUNTS[i] * 4;
  }
  return totalCustWeeks > 0 ? totalSvcRev / totalCustWeeks : 0;
}
