"""Forecast and What-If endpoints."""
from fastapi import APIRouter
from app.models.financial import (
    ClientParameters, PeriodData, WhatIfInputs,
    PaybackResult, run_what_if, calc_payback, NUM_PERIODS,
)
from pydantic import BaseModel

router = APIRouter()


class ForecastRequest(BaseModel):
    params: ClientParameters
    actuals: list[PeriodData] = []
    budget: list[PeriodData] = []


class WhatIfRequest(BaseModel):
    params: ClientParameters
    forecast: list[PeriodData]
    inputs: WhatIfInputs
    agp_pct: float = 0.50


@router.post("/run")
def run_forecast(req: ForecastRequest):
    """Generate a blended rolling forecast from actuals + budget."""
    pc = req.params.periods_completed
    forecast = []
    for i in range(NUM_PERIODS):
        if i < pc and i < len(req.actuals):
            forecast.append(req.actuals[i])
        elif i < len(req.budget):
            forecast.append(req.budget[i])
        else:
            forecast.append(PeriodData())
    return {"forecast": forecast}


@router.post("/whatif")
def run_whatif_endpoint(req: WhatIfRequest):
    """Run a What-If scenario and return payback analysis."""
    result = run_what_if(req.forecast, req.inputs, req.params)
    payback = calc_payback(
        result["income_diff"],
        req.agp_pct,
        req.inputs.staff_cost,
        req.inputs.staff_start,
        req.params.periods_completed,
    )
    return {"scenario": result, "payback": payback}
