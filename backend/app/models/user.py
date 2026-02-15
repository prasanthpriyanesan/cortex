from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """User model for authentication and user management"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    phone_number = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    sectors = relationship("Sector", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.username}>"
