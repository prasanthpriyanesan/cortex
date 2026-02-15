from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.services.stock_api import stock_api

router = APIRouter(prefix="/stocks", tags=["stocks"])


# Pydantic schemas
class StockQuote(BaseModel):
    symbol: str
    current_price: float
    high: float
    low: float
    open_price: float
    previous_close: float
    timestamp: int
    percent_change: Optional[float] = None


class CompanyProfile(BaseModel):
    name: str
    symbol: str
    currency: str
    exchange: str
    ipo: Optional[str] = None
    marketCapitalization: Optional[float] = None
    shareOutstanding: Optional[float] = None
    logo: Optional[str] = None
    phone: Optional[str] = None
    weburl: Optional[str] = None


class StockSearch(BaseModel):
    symbol: str
    description: str
    type: str


@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time quote for a stock symbol
    """
    quote = await stock_api.get_quote(symbol)
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock symbol '{symbol}' not found"
        )
    
    # Calculate percent change
    percent_change = None
    if quote.get("pc") and quote.get("pc") > 0:
        percent_change = ((quote["c"] - quote["pc"]) / quote["pc"]) * 100
    
    return StockQuote(
        symbol=symbol.upper(),
        current_price=quote["c"],
        high=quote["h"],
        low=quote["l"],
        open_price=quote["o"],
        previous_close=quote["pc"],
        timestamp=quote["t"],
        percent_change=percent_change
    )


@router.get("/profile/{symbol}", response_model=CompanyProfile)
async def get_company_profile(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get company profile information
    """
    profile = await stock_api.get_company_profile(symbol)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company profile for '{symbol}' not found"
        )
    
    return CompanyProfile(**profile)


@router.get("/search", response_model=List[StockSearch])
async def search_stocks(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: User = Depends(get_current_user)
):
    """
    Search for stock symbols
    """
    results = await stock_api.search_symbols(q)
    
    # Filter and format results
    formatted_results = []
    for result in results[:10]:  # Limit to 10 results
        formatted_results.append(StockSearch(
            symbol=result.get("symbol", ""),
            description=result.get("description", ""),
            type=result.get("type", "")
        ))
    
    return formatted_results


@router.get("/indexes")
async def get_market_indexes(
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time quotes for major market indexes (SPY, QQQ, IWM).
    Returns all three in a single batched call.
    """
    import asyncio

    symbols = ["SPY", "QQQ", "IWM"]
    tasks = [stock_api.get_quote(s) for s in symbols]
    results = await asyncio.gather(*tasks)

    indexes = []
    for sym, quote in zip(symbols, results):
        if quote and quote.get("c", 0) > 0:
            percent_change = None
            if quote.get("pc") and quote["pc"] > 0:
                percent_change = ((quote["c"] - quote["pc"]) / quote["pc"]) * 100
            indexes.append({
                "symbol": sym,
                "current_price": quote["c"],
                "previous_close": quote["pc"],
                "percent_change": percent_change,
                "high": quote["h"],
                "low": quote["l"],
            })
    return indexes


@router.get("/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical price data for a symbol
    """
    data = await stock_api.get_historical_data(symbol, days)
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Historical data for '{symbol}' not found"
        )
    
    return data
