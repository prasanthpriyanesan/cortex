from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.sector import Sector, SectorStock

router = APIRouter(prefix="/sectors", tags=["sectors"])


# ---------- Pydantic Schemas ----------

class SectorStockCreate(BaseModel):
    symbol: str
    stock_name: Optional[str] = None


class SectorStockResponse(BaseModel):
    id: int
    symbol: str
    stock_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SectorCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "folder"


class SectorUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class SectorResponse(BaseModel):
    id: int
    name: str
    color: Optional[str]
    icon: Optional[str]
    stocks: List[SectorStockResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Sector CRUD ----------

@router.post("/", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def create_sector(
    sector_data: SectorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new sector"""
    # Check for duplicate name
    existing = (
        db.query(Sector)
        .filter(Sector.user_id == current_user.id, Sector.name == sector_data.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sector '{sector_data.name}' already exists",
        )

    new_sector = Sector(
        user_id=current_user.id,
        name=sector_data.name,
        color=sector_data.color,
        icon=sector_data.icon,
    )
    db.add(new_sector)
    db.commit()
    db.refresh(new_sector)
    return new_sector


@router.get("/", response_model=List[SectorResponse])
def get_sectors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all sectors for the current user"""
    sectors = (
        db.query(Sector)
        .filter(Sector.user_id == current_user.id)
        .order_by(Sector.created_at.asc())
        .all()
    )
    return sectors


@router.get("/{sector_id}", response_model=SectorResponse)
def get_sector(
    sector_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific sector"""
    sector = (
        db.query(Sector)
        .filter(Sector.id == sector_id, Sector.user_id == current_user.id)
        .first()
    )
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")
    return sector


@router.put("/{sector_id}", response_model=SectorResponse)
def update_sector(
    sector_id: int,
    sector_data: SectorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a sector"""
    sector = (
        db.query(Sector)
        .filter(Sector.id == sector_id, Sector.user_id == current_user.id)
        .first()
    )
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    update_data = sector_data.model_dump(exclude_unset=True)

    # Check name uniqueness if changing name
    if "name" in update_data:
        existing = (
            db.query(Sector)
            .filter(
                Sector.user_id == current_user.id,
                Sector.name == update_data["name"],
                Sector.id != sector_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sector '{update_data['name']}' already exists",
            )

    for field, value in update_data.items():
        setattr(sector, field, value)

    db.commit()
    db.refresh(sector)
    return sector


@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sector(
    sector_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a sector (cascades to its stocks)"""
    sector = (
        db.query(Sector)
        .filter(Sector.id == sector_id, Sector.user_id == current_user.id)
        .first()
    )
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    db.delete(sector)
    db.commit()
    return None


# ---------- Sector Stocks ----------

@router.post("/{sector_id}/stocks", response_model=SectorStockResponse, status_code=status.HTTP_201_CREATED)
def add_stock_to_sector(
    sector_id: int,
    stock_data: SectorStockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a stock to a sector"""
    sector = (
        db.query(Sector)
        .filter(Sector.id == sector_id, Sector.user_id == current_user.id)
        .first()
    )
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    # Check for duplicate symbol in this sector
    existing = (
        db.query(SectorStock)
        .filter(SectorStock.sector_id == sector_id, SectorStock.symbol == stock_data.symbol.upper())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{stock_data.symbol.upper()} is already in this sector",
        )

    new_stock = SectorStock(
        sector_id=sector_id,
        symbol=stock_data.symbol.upper(),
        stock_name=stock_data.stock_name,
    )
    db.add(new_stock)
    db.commit()
    db.refresh(new_stock)
    return new_stock


@router.delete("/{sector_id}/stocks/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def remove_stock_from_sector(
    sector_id: int,
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a stock from a sector"""
    sector = (
        db.query(Sector)
        .filter(Sector.id == sector_id, Sector.user_id == current_user.id)
        .first()
    )
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    stock = (
        db.query(SectorStock)
        .filter(SectorStock.sector_id == sector_id, SectorStock.symbol == symbol.upper())
        .first()
    )
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found in sector")

    db.delete(stock)
    db.commit()
    return None
