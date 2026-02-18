from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.alert import Alert, AlertType, AlertStatus
from app.core.config import settings

router = APIRouter(prefix="/alerts", tags=["alerts"])


# Pydantic schemas
class AlertCreate(BaseModel):
    symbol: str = Field(
        pattern=r"^[A-Z0-9]{1,5}$",
        description="Stock symbol: 1-5 uppercase letters and numbers"
    )
    stock_name: str | None = Field(
        None,
        max_length=256,
        description="Company name"
    )
    alert_type: AlertType
    threshold_value: float = Field(
        gt=0,
        le=999999,
        description="Alert threshold value (must be positive, max 999,999)"
    )
    is_repeating: bool = False
    notify_email: bool = True
    notify_sms: bool = False
    notify_push: bool = False
    message: str | None = Field(
        None,
        max_length=500,
        description="Custom alert message"
    )


class AlertUpdate(BaseModel):
    threshold_value: float | None = Field(
        None,
        gt=0,
        le=999999,
        description="Alert threshold value (must be positive, max 999,999)"
    )
    is_repeating: bool | None = None
    notify_email: bool | None = None
    notify_sms: bool | None = None
    notify_push: bool | None = None
    message: str | None = Field(
        None,
        max_length=500,
        description="Custom alert message"
    )
    status: AlertStatus | None = None


class AlertResponse(BaseModel):
    id: int
    symbol: str = Field(
        pattern=r"^[A-Z0-9]{1,5}$",
        description="Stock symbol"
    )
    stock_name: str | None = Field(None, max_length=256)
    alert_type: AlertType
    threshold_value: float
    status: AlertStatus
    is_repeating: bool
    notify_email: bool
    notify_sms: bool
    notify_push: bool
    message: str | None = Field(None, max_length=500)
    last_checked_at: datetime | None
    triggered_at: datetime | None
    trigger_price: float | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new alert
    """
    # Check alert limit
    user_alerts_count = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.status == AlertStatus.ACTIVE
    ).count()
    
    if user_alerts_count >= settings.MAX_ALERTS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of alerts ({settings.MAX_ALERTS_PER_USER}) reached"
        )
    
    # Create alert
    new_alert = Alert(
        user_id=current_user.id,
        symbol=alert_data.symbol.upper(),
        stock_name=alert_data.stock_name,
        alert_type=alert_data.alert_type,
        threshold_value=alert_data.threshold_value,
        is_repeating=alert_data.is_repeating,
        notify_email=alert_data.notify_email,
        notify_sms=alert_data.notify_sms,
        notify_push=alert_data.notify_push,
        message=alert_data.message
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    
    return new_alert


@router.get("/", response_model=List[AlertResponse])
def get_user_alerts(
    status: AlertStatus | None = None,
    symbol: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all alerts for the current user
    """
    query = db.query(Alert).filter(Alert.user_id == current_user.id)
    
    if status:
        query = query.filter(Alert.status == status)
    
    if symbol:
        query = query.filter(Alert.symbol == symbol.upper())
    
    alerts = query.order_by(Alert.created_at.desc()).all()
    return alerts


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific alert
    """
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an alert
    """
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    # Update fields
    update_data = alert_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
    
    db.commit()
    db.refresh(alert)
    
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert
    """
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    db.delete(alert)
    db.commit()
    
    return None
