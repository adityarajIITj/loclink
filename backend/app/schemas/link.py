from datetime import datetime
from pydantic import BaseModel, Field


class LinkCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    expires_in_hours: int | None = Field(None, ge=1, le=8760)  # max 1 year


class LinkUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)


class LinkResponse(BaseModel):
    id: int
    name: str
    token: str
    url: str = ""
    is_active: bool
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None
    visit_count: int = 0
    location_count: int = 0

    model_config = {"from_attributes": True}


class LinkListResponse(BaseModel):
    links: list[LinkResponse]
    total: int
