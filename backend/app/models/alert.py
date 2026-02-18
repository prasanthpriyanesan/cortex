from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AlertType(str, enum.Enum):
    """Types of alerts that can be created"""
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"
    VOLUME_SPIKE = "volume_spike"


class AlertStatus(str, enum.Enum):
    """Status of an alert"""
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISABLED = "disabled"


class Alert(Base):
    """Alert model for stock price alerts"""
    
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Stock information
    symbol = Column(String(5), index=True, nullable=False)  # e.g., "AAPL" - max 5 chars
    stock_name = Column(String(256), nullable=True)  # e.g., "Apple Inc." - max 256 chars

    # Alert configuration
    alert_type = Column(Enum(AlertType), nullable=False)
    threshold_value = Column(Float, nullable=False, default=0)
    
    # Alert state
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE)
    is_repeating = Column(Boolean, default=False)  # Trigger multiple times or just once
    
    # Notification channels
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    notify_push = Column(Boolean, default=False)

    # Metadata
    message = Column(String(500), nullable=True)  # Custom message for the alert - max 500 chars
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    trigger_price = Column(Float, nullable=True)  # Price when triggered

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="alerts")

    # Database constraints
    __table_args__ = (
        CheckConstraint("threshold_value > 0", name="ck_alert_threshold_positive"),
        CheckConstraint("threshold_value <= 999999", name="ck_alert_threshold_max"),
    )
    
    def __repr__(self):
        return f"<Alert {self.symbol} {self.alert_type} {self.threshold_value}>"
    
    def check_condition(self, current_price: float, previous_price: float = None) -> bool:
        """
        Check if alert condition is met
        
        Args:
            current_price: Current stock price
            previous_price: Previous price for percent change calculation
        
        Returns:
            True if condition is met, False otherwise
        """
        if self.alert_type == AlertType.PRICE_ABOVE:
            return current_price >= self.threshold_value
        
        elif self.alert_type == AlertType.PRICE_BELOW:
            return current_price <= self.threshold_value
        
        elif self.alert_type == AlertType.PERCENT_CHANGE and previous_price:
            percent_change = ((current_price - previous_price) / previous_price) * 100
            return abs(percent_change) >= self.threshold_value
        
        return False
