from datetime import datetime
from pydantic import BaseModel, Field


class LocationSubmit(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: float | None = Field(None, ge=0)
    altitude: float | None = None
    heading: float | None = Field(None, ge=0, le=360)
    speed: float | None = Field(None, ge=0)


class LocationResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    accuracy: float | None
    altitude: float | None
    heading: float | None
    speed: float | None
    captured_at: datetime

    model_config = {"from_attributes": True}


class LocationListResponse(BaseModel):
    locations: list[LocationResponse]
    total: int
