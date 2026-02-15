from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Sector(Base):
    """User-defined sector/group for organizing stocks"""

    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True, default="#6366f1")  # Hex color for UI
    icon = Column(String, nullable=True, default="folder")  # Lucide icon name

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="sectors")
    stocks = relationship("SectorStock", back_populates="sector", cascade="all, delete-orphan")

    # Unique sector name per user
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_user_sector_name"),
    )

    def __repr__(self):
        return f"<Sector {self.name}>"


class SectorStock(Base):
    """Stock belonging to a sector"""

    __tablename__ = "sector_stocks"

    id = Column(Integer, primary_key=True, index=True)
    sector_id = Column(Integer, ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String, index=True, nullable=False)
    stock_name = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sector = relationship("Sector", back_populates="stocks")

    # Prevent duplicate symbols in same sector
    __table_args__ = (
        UniqueConstraint("sector_id", "symbol", name="unique_sector_symbol"),
    )

    def __repr__(self):
        return f"<SectorStock {self.symbol}>"
