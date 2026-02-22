from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SectorStrategy(Base):
    """
    Configuration for the Sector Relative Strength Strategy.
    Monitors a sector for overall trend and triggers alerts for laggards/outliers.
    """
    
    __tablename__ = "sector_strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Strategy Parameters
    is_active = Column(Boolean, default=True)
    
    # Example: 70% of the basket must be trending
    percent_majority = Column(Float, nullable=False, default=70.0) 
    
    # Example: The majority must be up by at least +1.5%
    trend_threshold = Column(Float, nullable=False, default=1.5)
    
    # Example: The laggard must be down by at least -1.0% (represented as positive 1.0 divergence magnitude)
    laggard_threshold = Column(Float, nullable=False, default=-1.0)

    # Timestamps
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")
    sector = relationship("Sector")

    def __repr__(self):
        return f"<SectorStrategy sector_id={self.sector_id}>"
