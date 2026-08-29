from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.connection import get_db
from app.database.models.link import Link
from app.database.models.location import Location
from app.database.models.user import User
from app.database.models.visit import Visit

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overview statistics for the dashboard."""
    user_links = db.query(Link).filter(Link.owner_id == current_user.id)
    link_ids = [link.id for link in user_links.all()]

    total_links = len(link_ids)
    active_links = user_links.filter(Link.is_active == True).count()

    total_visits = 0
    total_locations = 0
    if link_ids:
        total_visits = (
            db.query(func.count(Visit.id))
            .filter(Visit.link_id.in_(link_ids))
            .scalar()
            or 0
        )
        total_locations = (
            db.query(func.count(Location.id))
            .filter(Location.link_id.in_(link_ids))
            .scalar()
            or 0
        )

    return {
        "total_links": total_links,
        "active_links": active_links,
        "total_visits": total_visits,
        "total_locations": total_locations,
    }
