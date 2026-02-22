from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import List, Optional
from pydantic import BaseModel, Field

from app.api.auth import get_current_user
from app.models.user import User
from app.services.stock_api import stock_api

router = APIRouter(prefix="/stocks", tags=["stocks"])


# Pydantic schemas
class StockQuote(BaseModel):
    symbol: str = Field(
        pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$",
        description="Stock symbol: 1-5 uppercase letters and numbers, optional exchange suffix (e.g., HOOD, BRK.B, HOOD.TO)"
    )
    current_price: float
    high: float
    low: float
    open_price: float
    previous_close: float
    timestamp: int
    percent_change: Optional[float] = None


class StockSearch(BaseModel):
    symbol: str = Field(
        pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$",
        description="Stock symbol with optional exchange suffix"
    )
    description: str
    type: str


class BasicFinancials(BaseModel):
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    beta: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    market_cap: Optional[float] = None


class RecommendationTrend(BaseModel):
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0
    period: Optional[str] = None


class StockDetail(BaseModel):
    """Combined response for the enriched stock card."""
    # Quote data
    symbol: str = Field(
        pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$",
        description="Stock symbol with optional exchange suffix"
    )
    current_price: float
    high: float
    low: float
    open_price: float
    previous_close: float
    timestamp: int
    percent_change: Optional[float] = None

    # Company profile
    company_name: Optional[str] = None
    logo: Optional[str] = None
    exchange: Optional[str] = None
    finnhub_industry: Optional[str] = None
    weburl: Optional[str] = None
    country: Optional[str] = None
    ipo: Optional[str] = None

    # Financial metrics
    financials: Optional[BasicFinancials] = None

    # Analyst recommendations (most recent month)
    recommendation: Optional[RecommendationTrend] = None


@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(
    symbol: str = Path(..., pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$", description="Stock symbol with optional exchange suffix"),
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


@router.get("/search", response_model=List[StockSearch])
async def search_stocks(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
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
    from app.services.market_data_cache import market_data_cache
    import asyncio

    symbols = ["SPY", "QQQ", "IWM"]
    live_prices = await market_data_cache.get_all_live_prices(symbols)

    indexes = []
    for sym in symbols:
        c = live_prices.get(sym)
        pc = await market_data_cache.get_previous_close(sym)

        # Fallback to HTTP if cache miss (e.g. server just restarted)
        h, l = None, None
        if c is None or pc is None:
            quote = await stock_api.get_quote(sym)
            if quote:
                c = quote.get("c")
                pc = quote.get("pc")
                h = quote.get("h")
                l = quote.get("l")

        if c is not None and c > 0:
            percent_change = None
            if pc is not None and pc > 0:
                percent_change = ((c - pc) / pc) * 100
            
            indexes.append({
                "symbol": sym,
                "current_price": c,
                "previous_close": pc,
                "percent_change": percent_change,
                "high": h or c, # Fallback visualization defaults
                "low": l or c,
            })
            
    return indexes


@router.get("/detail/{symbol}", response_model=StockDetail)
async def get_stock_detail(
    symbol: str = Path(..., pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$", description="Stock symbol with optional exchange suffix"),
    current_user: User = Depends(get_current_user)
):
    """
    Get enriched stock detail: quote + company profile + financial metrics
    + analyst recommendations. All Finnhub calls execute concurrently.
    """
    detail = await stock_api.get_stock_detail(symbol)

    if not detail or not detail.get("quote"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock symbol '{symbol}' not found"
        )

    quote = detail["quote"]
    profile = detail.get("profile") or {}
    financials_raw = detail.get("financials") or {}
    recs_list = detail.get("recommendations")

    # Calculate percent change
    percent_change = None
    if quote.get("pc") and quote["pc"] > 0:
        percent_change = ((quote["c"] - quote["pc"]) / quote["pc"]) * 100

    # Map Finnhub metric keys to clean names
    financials = BasicFinancials(
        week_52_high=financials_raw.get("52WeekHigh"),
        week_52_low=financials_raw.get("52WeekLow"),
        beta=financials_raw.get("beta"),
        pe_ratio=financials_raw.get("peBasicExclExtraTTM"),
        eps=financials_raw.get("epsBasicExclExtraItemsTTM"),
        dividend_yield=financials_raw.get("dividendYieldIndicatedAnnual"),
        market_cap=financials_raw.get("marketCapitalization"),
    ) if financials_raw else None

    # Get the most recent recommendation period
    recommendation = None
    if recs_list and len(recs_list) > 0:
        latest = recs_list[0]
        recommendation = RecommendationTrend(
            strong_buy=latest.get("strongBuy", 0),
            buy=latest.get("buy", 0),
            hold=latest.get("hold", 0),
            sell=latest.get("sell", 0),
            strong_sell=latest.get("strongSell", 0),
            period=latest.get("period"),
        )

    return StockDetail(
        symbol=symbol.upper(),
        current_price=quote["c"],
        high=quote["h"],
        low=quote["l"],
        open_price=quote["o"],
        previous_close=quote["pc"],
        timestamp=quote["t"],
        percent_change=percent_change,
        company_name=profile.get("name"),
        logo=profile.get("logo"),
        exchange=profile.get("exchange"),
        finnhub_industry=profile.get("finnhubIndustry"),
        weburl=profile.get("weburl"),
        country=profile.get("country"),
        ipo=profile.get("ipo"),
        financials=financials,
        recommendation=recommendation,
    )


@router.get("/historical/{symbol}")
async def get_historical_data(
    symbol: str = Path(..., pattern=r"^[A-Z0-9]{1,10}(\.[A-Z0-9]{1,5})?$", description="Stock symbol with optional exchange suffix"),
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
