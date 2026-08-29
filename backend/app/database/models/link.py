import secrets
import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


def generate_token() -> str:
    """Generate a cryptographically secure random token for links."""
    return secrets.token_urlsafe(16)


class Link(Base):
    __tablename__ = "links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    uuid: Mapped[_uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=_uuid.uuid4, unique=True, nullable=False
    )
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True, default=generate_token
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    owner = relationship("User", back_populates="links")
    visits = relationship("Visit", back_populates="link", cascade="all, delete-orphan")
    locations = relationship(
        "Location", back_populates="link", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Link {self.name} ({self.token})>"
