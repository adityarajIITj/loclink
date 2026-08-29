from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models.link import Link
from app.database.models.location import Location
from app.database.models.visit import Visit
from app.schemas.location import LocationSubmit
from app.schemas.user import MessageResponse

router = APIRouter(tags=["public"])


@router.get("/api/public/link/{token}")
def get_public_link(token: str, request: Request, db: Session = Depends(get_db)):
    """Public endpoint: validate a link token and record a visit."""
    link = db.query(Link).filter(Link.token == token).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This link is unavailable.",
        )

    if not link.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This link is no longer active.",
        )

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This link has expired.",
        )

    # Record visit
    user_agent = request.headers.get("user-agent", "")[:512]
    visit = Visit(link_id=link.id, user_agent=user_agent)
    db.add(visit)
    db.commit()

    return {
        "valid": True,
        "link_name": link.name,
    }


@router.post("/api/public/location/{token}", response_model=MessageResponse)
def submit_location(
    token: str,
    data: LocationSubmit,
    db: Session = Depends(get_db),
):
    """Public endpoint: submit a consented location for a link."""
    link = db.query(Link).filter(Link.token == token).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This link is unavailable.",
        )

    if not link.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This link is no longer active.",
        )

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This link has expired.",
        )

    # Store location with server-side timestamp
    location = Location(
        link_id=link.id,
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy=data.accuracy,
        altitude=data.altitude,
        heading=data.heading,
        speed=data.speed,
        captured_at=datetime.now(timezone.utc),
    )
    db.add(location)
    db.commit()

    # Notify via WebSocket (imported lazily to avoid circular imports)
    try:
        from app.websocket.manager import manager
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(
                manager.send_location_update(
                    link.owner_id,
                    {
                        "type": "location_created",
                        "link_id": link.id,
                        "link_name": link.name,
                        "location": {
                            "id": location.id,
                            "latitude": location.latitude,
                            "longitude": location.longitude,
                            "accuracy": location.accuracy,
                            "captured_at": location.captured_at.isoformat(),
                        },
                    },
                )
            )
    except Exception:
        pass  # WebSocket notification is best-effort

    return MessageResponse(message="Location shared successfully.")
