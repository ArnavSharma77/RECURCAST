"""PDF report generation endpoint."""
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.financial import (
    ClientParameters, PeriodData, WhatIfInputs, PaybackResult,
    run_what_if, calc_payback,
)
from app.services.report_pdf import generate_report

router = APIRouter()


class ReportRequest(BaseModel):
    params: ClientParameters
    forecast: list[PeriodData]
    budget: list[PeriodData]
    whatif_inputs: WhatIfInputs | None = None
    agp_pct: float = 0.50


@router.post("/generate")
def generate_pdf_report(req: ReportRequest):
    """Generate and return a PDF monthly report."""
    payback = None
    if req.whatif_inputs and req.whatif_inputs.staff_cost > 0:
        result = run_what_if(req.forecast, req.whatif_inputs, req.params)
        payback = calc_payback(
            result["income_diff"],
            req.agp_pct,
            req.whatif_inputs.staff_cost,
            req.whatif_inputs.staff_start,
            req.params.periods_completed,
        )

    pdf_bytes = generate_report(
        location_name=req.params.location_name,
        fiscal_year=req.params.fiscal_year,
        periods_completed=req.params.periods_completed,
        forecast=req.forecast,
        budget=req.budget,
        payback=payback,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=RecurCast_Report.pdf"},
    )
