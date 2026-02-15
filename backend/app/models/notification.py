from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class NotificationChannel(str, enum.Enum):
    """Channel through which a notification was delivered"""
    IN_APP = "in_app"
    EMAIL = "email"


class Notification(Base):
    """Notification model for tracking triggered alert history"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True)

    # Notification content
    channel = Column(Enum(NotificationChannel), nullable=False, default=NotificationChannel.IN_APP)
    title = Column(String, nullable=False)         # e.g. "AAPL rose above $150.00"
    message = Column(Text, nullable=True)           # Full notification body

    # Alert snapshot (survives alert deletion)
    symbol = Column(String, nullable=False)
    trigger_price = Column(Float, nullable=True)
    alert_type = Column(String, nullable=True)      # Snapshot of AlertType value
    threshold_value = Column(Float, nullable=True)

    # State
    is_read = Column(Boolean, default=False, index=True)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
    alert = relationship("Alert", backref="notifications")

    def __repr__(self):
        return f"<Notification {self.symbol} {self.channel} read={self.is_read}>"
