"""PDF report generation service -- port of generate_report_pdf.py."""
import io
from fpdf import FPDF

from app.models.financial import PeriodData, PaybackResult, NUM_PERIODS


class RecurCastPDF(FPDF):
    """Custom PDF with RecurCast branding."""

    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, "RecurCast by ClearPath Analytics", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 41, 59)
        self.cell(0, 10, title)
        self.ln(12)

    def metric_box(self, label: str, value: str, x: float, y: float, w: float = 45):
        self.set_xy(x, y)
        self.set_fill_color(241, 245, 249)
        self.rect(x, y, w, 18, "F")
        self.set_font("Helvetica", "", 7)
        self.set_text_color(100, 116, 139)
        self.set_xy(x + 2, y + 2)
        self.cell(w - 4, 4, label)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(15, 23, 42)
        self.set_xy(x + 2, y + 8)
        self.cell(w - 4, 8, value)


def fmt_currency(val: float) -> str:
    if abs(val) >= 1000:
        return f"${val/1000:,.0f}K"
    return f"${val:,.0f}"


def generate_report(
    location_name: str,
    fiscal_year: int,
    periods_completed: int,
    forecast: list[PeriodData],
    budget: list[PeriodData],
    payback: PaybackResult | None = None,
) -> bytes:
    """Generate a full monthly report PDF and return as bytes."""
    pdf = RecurCastPDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Page 1: Executive Summary
    pdf.add_page()
    pdf.section_title("Monthly Financial Report")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 6, f"{location_name}  |  FY{fiscal_year}  |  Period {periods_completed} of {NUM_PERIODS}")
    pdf.ln(15)

    total_forecast_rev = sum(p.total_income for p in forecast)
    total_budget_rev = sum(p.total_income for p in budget)
    ytd_actual = sum(forecast[i].total_income for i in range(periods_completed))
    ytd_budget = sum(budget[i].total_income for i in range(periods_completed))
    variance = ytd_actual - ytd_budget
    forecast_net = sum(p.net_income for p in forecast)
    run_rate = forecast[periods_completed - 1].total_income * NUM_PERIODS if periods_completed > 0 else 0

    y = pdf.get_y()
    pdf.metric_box("YTD Revenue (Actual)", fmt_currency(ytd_actual), 10, y)
    pdf.metric_box("YTD Variance", fmt_currency(variance), 58, y)
    pdf.metric_box("Annual Forecast", fmt_currency(total_forecast_rev), 106, y)
    pdf.metric_box("Year-End Run Rate", fmt_currency(run_rate), 154, y)
    pdf.set_y(y + 25)

    # Revenue table
    pdf.section_title("Rolling Forecast Summary")
    pdf.set_font("Helvetica", "B", 8)
    headers = ["Period", "Type", "Total Income", "COGS", "Net Income"]
    col_w = [18, 18, 35, 35, 35]
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for i, p in enumerate(forecast):
        ptype = "Actual" if i < periods_completed else "Forecast"
        pdf.cell(col_w[0], 6, f"P{i+1}", border=1)
        pdf.cell(col_w[1], 6, ptype, border=1)
        pdf.cell(col_w[2], 6, f"${p.total_income:,.0f}", border=1)
        pdf.cell(col_w[3], 6, f"${p.total_cogs:,.0f}", border=1)
        pdf.cell(col_w[4], 6, f"${p.net_income:,.0f}", border=1)
        pdf.ln()

    # Page 2: Annual totals
    pdf.add_page()
    pdf.section_title("Annual Projection")
    y = pdf.get_y()
    pdf.metric_box("Forecast Revenue", fmt_currency(total_forecast_rev), 10, y)
    pdf.metric_box("Budget Revenue", fmt_currency(total_budget_rev), 58, y)
    pdf.metric_box("Forecast Net Income", fmt_currency(forecast_net), 106, y)
    pdf.set_y(y + 25)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(0, 5,
        "The rolling forecast blends actual period results with budget projections "
        "for remaining periods. As each period closes, actuals replace budget figures, "
        "giving you an increasingly accurate year-end projection."
    )

    # Page 3: Payback Analysis (if available)
    if payback and payback.breakeven_period is not None:
        pdf.add_page()
        pdf.section_title("Salesperson Payback Analysis")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)
        pdf.multi_cell(0, 5,
            "This analysis uses the AGP (Adjusted Gross Profit) margin to determine "
            "when incremental revenue from a new salesperson covers their fully loaded cost. "
            "A 1-period payment delay is applied (revenue sold in Period X is collected in Period X+1)."
        )
        pdf.ln(5)

        y = pdf.get_y()
        pdf.metric_box("AGP %", f"{payback.agp_pct*100:.1f}%", 10, y)
        pdf.metric_box("Breakeven", f"Period {payback.breakeven_period}", 58, y)
        pdf.metric_box("Annual Cost", fmt_currency(sum(payback.cost_per_period)), 106, y)
        pdf.metric_box("Annual Net", fmt_currency(payback.cum_net[-1]), 154, y)
        pdf.set_y(y + 25)

        pdf.set_font("Helvetica", "B", 8)
        pb_headers = ["Period", "Staff Cost", "AGP Collected", "Cum Cost", "Cum AGP", "Cum Net"]
        pb_w = [18, 28, 28, 28, 28, 28]
        for i, h in enumerate(pb_headers):
            pdf.cell(pb_w[i], 7, h, border=1)
        pdf.ln()

        pdf.set_font("Helvetica", "", 8)
        for i in range(NUM_PERIODS):
            pdf.cell(pb_w[0], 6, f"P{i+1}", border=1)
            pdf.cell(pb_w[1], 6, f"${payback.cost_per_period[i]:,.0f}", border=1)
            pdf.cell(pb_w[2], 6, f"${payback.agp_collected[i]:,.0f}", border=1)
            pdf.cell(pb_w[3], 6, f"${payback.cum_cost[i]:,.0f}", border=1)
            pdf.cell(pb_w[4], 6, f"${payback.cum_agp[i]:,.0f}", border=1)
            pdf.cell(pb_w[5], 6, f"${payback.cum_net[i]:,.0f}", border=1)
            pdf.ln()

    buffer = io.BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
