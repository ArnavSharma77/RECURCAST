"""Financial model -- Python port of the *12/*16 revenue engine."""
from pydantic import BaseModel

NUM_PERIODS = 13


class ClientParameters(BaseModel):
    location_name: str = "Demo Location"
    fiscal_year: int = 2026
    periods_completed: int = 0
    cx_rate: float = 0.10
    avg_service_price: float = 480
    trip_charge_per_cust: float = 10
    alloc_win: float = 0.30
    alloc_ref: float = 0.40
    alloc_san: float = 0.30
    inst_rate_win: float = 2.0
    inst_rate_ref: float = 0.10
    inst_rate_san: float = 0.50


class PeriodData(BaseModel):
    product_rev: float = 0
    service_rev: float = 0
    install_rev: float = 0
    trip_rev: float = 0
    total_income: float = 0
    total_cogs: float = 0
    gross_profit: float = 0
    total_expense: float = 0
    net_income: float = 0
    adj_gross_profit: float = 0


class WhatIfInputs(BaseModel):
    weekly_ramp: list[float] = [0] * 13
    staff_cost: float = 0
    staff_start: int = 1
    cx_override: float | None = None


class PaybackResult(BaseModel):
    agp_pct: float
    cost_per_period: list[float]
    inc_rev_per_period: list[float]
    agp_from_rev: list[float]
    agp_collected: list[float]
    net_per_period: list[float]
    cum_cost: list[float]
    cum_agp: list[float]
    cum_net: list[float]
    breakeven_period: int | None


def calc_ramp_revenue(weekly_avgs: list[float], period: int) -> float:
    rev = weekly_avgs[period] * 12
    for i in range(period):
        rev += weekly_avgs[i] * 16
    return rev


def calc_all_ramp_revenue(weekly_avgs: list[float]) -> list[float]:
    return [calc_ramp_revenue(weekly_avgs, i) for i in range(NUM_PERIODS)]


def run_what_if(
    base_forecast: list[PeriodData],
    inputs: WhatIfInputs,
    params: ClientParameters,
) -> dict:
    """Run What-If scenario comparison."""
    pc = params.periods_completed
    eff_cx = inputs.cx_override if inputs.cx_override is not None else params.cx_rate
    ramp_revenue = calc_all_ramp_revenue(inputs.weekly_ramp)

    base_income = [p.total_income for p in base_forecast]
    base_agp = [p.adj_gross_profit for p in base_forecast]
    base_net = [p.net_income for p in base_forecast]

    scenario_income = []
    scenario_agp = []
    scenario_net = []

    for i in range(NUM_PERIODS):
        pn = i + 1
        extra_rev = ramp_revenue[i] * (1 - eff_cx) if pn > pc else 0
        staff_hit = inputs.staff_cost if (pn > pc and pn >= inputs.staff_start) else 0
        scenario_income.append(base_income[i] + extra_rev)
        scenario_agp.append(base_agp[i] + extra_rev)
        scenario_net.append(base_net[i] + extra_rev - staff_hit)

    income_diff = [scenario_income[i] - base_income[i] for i in range(NUM_PERIODS)]
    return {
        "base_income": base_income,
        "scenario_income": scenario_income,
        "income_diff": income_diff,
        "scenario_net": scenario_net,
        "net_diff": [scenario_net[i] - base_net[i] for i in range(NUM_PERIODS)],
    }


def calc_payback(
    income_diff: list[float],
    agp_pct: float,
    staff_cost: float,
    staff_start: int,
    periods_completed: int,
) -> PaybackResult:
    """AGP-based payback with 1-period collection delay."""
    cost_per_period = []
    agp_from_rev = []
    agp_collected = []
    net_per_period = []
    cum_cost = []
    cum_agp = []
    cum_net = []

    for i in range(NUM_PERIODS):
        pn = i + 1
        cost = staff_cost if (pn > periods_completed and pn >= staff_start) else 0
        cost_per_period.append(cost)
        agp_from_rev.append(income_diff[i] * agp_pct)
        collected = agp_from_rev[i - 1] if i > 0 else 0
        agp_collected.append(collected)
        net_per_period.append(collected - cost)
        prev_cost = cum_cost[i - 1] if i > 0 else 0
        prev_agp = cum_agp[i - 1] if i > 0 else 0
        cum_cost.append(prev_cost + cost)
        cum_agp.append(prev_agp + collected)
        cum_net.append(cum_agp[-1] - cum_cost[-1])

    breakeven = None
    for i in range(NUM_PERIODS):
        if cum_cost[i] > 0 and cum_net[i] >= 0:
            breakeven = i + 1
            break

    return PaybackResult(
        agp_pct=agp_pct,
        cost_per_period=cost_per_period,
        inc_rev_per_period=income_diff,
        agp_from_rev=agp_from_rev,
        agp_collected=agp_collected,
        net_per_period=net_per_period,
        cum_cost=cum_cost,
        cum_agp=cum_agp,
        cum_net=cum_net,
        breakeven_period=breakeven,
    )
