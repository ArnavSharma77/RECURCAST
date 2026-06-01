"""RecurCast Backend API -- FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import clients, forecast, reports

app = FastAPI(
    title="RecurCast API",
    description="Financial forecasting engine for recurring revenue businesses",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "recurcast-api"}
