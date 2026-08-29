from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.connection import get_db
from app.database.models.link import Link
from app.database.models.location import Location
from app.database.models.user import User
from app.database.models.visit import Visit
from app.schemas.link import LinkCreate, LinkListResponse, LinkResponse, LinkUpdate
from app.schemas.user import MessageResponse

router = APIRouter(prefix="/api/links", tags=["links"])


def _link_to_response(link: Link, db: Session) -> LinkResponse:
    """Convert a Link model to a LinkResponse with counts."""
    visit_count = db.query(func.count(Visit.id)).filter(Visit.link_id == link.id).scalar() or 0
    location_count = db.query(func.count(Location.id)).filter(Location.link_id == link.id).scalar() or 0
    return LinkResponse(
        id=link.id,
        name=link.name,
        token=link.token,
        url=f"/l/{link.token}",
        is_active=link.is_active,
        created_at=link.created_at,
        updated_at=link.updated_at,
        expires_at=link.expires_at,
        visit_count=visit_count,
        location_count=location_count,
    )


def _get_owned_link(link_id: int, user: User, db: Session) -> Link:
    """Get a link that belongs to the authenticated user."""
    link = db.query(Link).filter(Link.id == link_id, Link.owner_id == user.id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found",
        )
    return link


@router.post("", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(
    data: LinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new shareable link."""
    expires_at = None
    if data.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=data.expires_in_hours)

    link = Link(
        owner_id=current_user.id,
        name=data.name,
        expires_at=expires_at,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return _link_to_response(link, db)


@router.get("", response_model=LinkListResponse)
def list_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all links owned by the authenticated user."""
    links = (
        db.query(Link)
        .filter(Link.owner_id == current_user.id)
        .order_by(Link.created_at.desc())
        .all()
    )
    return LinkListResponse(
        links=[_link_to_response(link, db) for link in links],
        total=len(links),
    )


@router.get("/{link_id}", response_model=LinkResponse)
def get_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific link owned by the authenticated user."""
    link = _get_owned_link(link_id, current_user, db)
    return _link_to_response(link, db)


@router.patch("/{link_id}", response_model=LinkResponse)
def update_link(
    link_id: int,
    data: LinkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a link's name."""
    link = _get_owned_link(link_id, current_user, db)
    if data.name is not None:
        link.name = data.name
    db.commit()
    db.refresh(link)
    return _link_to_response(link, db)


@router.delete("/{link_id}", response_model=MessageResponse)
def delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a link and all associated data."""
    link = _get_owned_link(link_id, current_user, db)
    db.delete(link)
    db.commit()
    return MessageResponse(message="Link deleted successfully")


@router.post("/{link_id}/disable", response_model=LinkResponse)
def disable_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable a link so it cannot receive new submissions."""
    link = _get_owned_link(link_id, current_user, db)
    link.is_active = False
    db.commit()
    db.refresh(link)
    return _link_to_response(link, db)


@router.post("/{link_id}/enable", response_model=LinkResponse)
def enable_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-enable a disabled link."""
    link = _get_owned_link(link_id, current_user, db)
    link.is_active = True
    db.commit()
    db.refresh(link)
    return _link_to_response(link, db)


@router.get("/{link_id}/locations")
def get_link_locations(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all locations for a specific link owned by the user."""
    link = _get_owned_link(link_id, current_user, db)
    locations = (
        db.query(Location)
        .filter(Location.link_id == link.id)
        .order_by(Location.captured_at.desc())
        .all()
    )
    return {
        "locations": [
            {
                "id": loc.id,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "accuracy": loc.accuracy,
                "altitude": loc.altitude,
                "heading": loc.heading,
                "speed": loc.speed,
                "captured_at": loc.captured_at.isoformat(),
            }
            for loc in locations
        ],
        "total": len(locations),
    }
