"""Client CRUD endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ClientCreate(BaseModel):
    name: str
    location: str | None = None
    tier: str = "growth"


class ClientResponse(BaseModel):
    id: str
    name: str
    location: str | None
    tier: str


@router.get("/")
def list_clients():
    return [
        ClientResponse(
            id="demo-001",
            name="EnviroMaster of St. Louis",
            location="St. Louis, MO",
            tier="growth",
        )
    ]


@router.post("/")
def create_client(data: ClientCreate):
    return ClientResponse(
        id="new-001",
        name=data.name,
        location=data.location,
        tier=data.tier,
    )
