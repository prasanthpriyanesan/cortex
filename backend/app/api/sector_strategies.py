from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.sector import Sector
from app.models.sector_strategy import SectorStrategy

router = APIRouter(prefix="/sector-strategies", tags=["sector-strategies"])

# Pydantic Schemas
class SectorStrategyCreate(BaseModel):
    sector_id: int = Field(..., description="ID of the sector to monitor")
    is_active: bool = True
    percent_majority: float = Field(70.0, ge=0.0, le=100.0, description="Percentage of stocks that must be trending (0-100)")
    trend_threshold: float = Field(1.5, description="The minimum percentage the majority must move by (e.g., 1.5 for +1.5%)")
    laggard_threshold: float = Field(-1.0, description="The maximum percentage the outlier can move by (e.g., -1.0 for -1.0%)")

class SectorStrategyUpdate(BaseModel):
    is_active: bool | None = None
    percent_majority: float | None = Field(None, ge=0.0, le=100.0)
    trend_threshold: float | None = None
    laggard_threshold: float | None = None

class SectorStrategyResponse(BaseModel):
    id: int
    user_id: int
    sector_id: int
    is_active: bool
    percent_majority: float
    trend_threshold: float
    laggard_threshold: float
    last_triggered_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True

@router.post("/", response_model=SectorStrategyResponse, status_code=status.HTTP_201_CREATED)
def create_sector_strategy(
    strategy_data: SectorStrategyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new Sector Strategy configuration. Only one strategy allowed per sector.
    """
    # Verify sector belongs to user
    sector = db.query(Sector).filter(Sector.id == strategy_data.sector_id, Sector.user_id == current_user.id).first()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    # Check if a strategy already exists for this sector
    existing_strategy = db.query(SectorStrategy).filter(SectorStrategy.sector_id == strategy_data.sector_id).first()
    if existing_strategy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A strategy is already configured for this sector")

    new_strategy = SectorStrategy(
        user_id=current_user.id,
        sector_id=strategy_data.sector_id,
        is_active=strategy_data.is_active,
        percent_majority=strategy_data.percent_majority,
        trend_threshold=strategy_data.trend_threshold,
        laggard_threshold=strategy_data.laggard_threshold
    )
    
    db.add(new_strategy)
    db.commit()
    db.refresh(new_strategy)
    return new_strategy

@router.get("/", response_model=List[SectorStrategyResponse])
def get_user_sector_strategies(
    is_active: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all sector strategies for the current user
    """
    query = db.query(SectorStrategy).filter(SectorStrategy.user_id == current_user.id)
    if is_active is not None:
        query = query.filter(SectorStrategy.is_active == is_active)
    
    strategies = query.order_by(SectorStrategy.created_at.desc()).all()
    return strategies

@router.get("/sector/{sector_id}", response_model=SectorStrategyResponse)
def get_strategy_by_sector(
    sector_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get strategy by sector ID
    """
    strategy = db.query(SectorStrategy).filter(
        SectorStrategy.sector_id == sector_id,
        SectorStrategy.user_id == current_user.id
    ).first()
    
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found for this sector")
        
    return strategy

@router.put("/{strategy_id}", response_model=SectorStrategyResponse)
def update_sector_strategy(
    strategy_id: int,
    strategy_data: SectorStrategyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a sector strategy
    """
    strategy = db.query(SectorStrategy).filter(
        SectorStrategy.id == strategy_id,
        SectorStrategy.user_id == current_user.id
    ).first()
    
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
        
    update_data = strategy_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(strategy, field, value)
        
    db.commit()
    db.refresh(strategy)
    return strategy

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sector_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a sector strategy
    """
    strategy = db.query(SectorStrategy).filter(
        SectorStrategy.id == strategy_id,
        SectorStrategy.user_id == current_user.id
    ).first()
    
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
        
    db.delete(strategy)
    db.commit()
    return None
