from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Watchlist(Base):
    """Watchlist model for tracking stocks"""
    
    __tablename__ = "watchlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Stock information
    symbol = Column(String, index=True, nullable=False)
    stock_name = Column(String, nullable=True)
    
    # User notes
    notes = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="watchlists")
    
    # Ensure user can't add same stock twice
    __table_args__ = (
        UniqueConstraint('user_id', 'symbol', name='unique_user_stock'),
    )
    
    def __repr__(self):
        return f"<Watchlist {self.symbol}>"
