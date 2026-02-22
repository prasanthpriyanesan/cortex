import httpx
import time
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from aiolimiter import AsyncLimiter
from app.core.config import settings

logger = logging.getLogger(__name__)


class StockAPIService:
    """
    Service for fetching stock data from Finnhub API
    Supports real-time quotes, historical data, company information,
    financial metrics, and analyst recommendations.
    """

    CACHE_TTL = 300  # 5 minutes

    def __init__(self):
        self.api_key = settings.FINNHUB_API_KEY
        self.base_url = "https://finnhub.io/api/v1"
        self.client = httpx.AsyncClient(timeout=30.0)
        self._profile_cache: Dict[str, Tuple[float, dict]] = {}
        self._financials_cache: Dict[str, Tuple[float, dict]] = {}
        
        # Free tier is 60 calls per minute. Set slightly strictly at 58.
        self.rate_limiter = AsyncLimiter(58, 60.0)

    def _get_cached(self, cache: Dict[str, Tuple[float, dict]], key: str) -> Optional[dict]:
        """Return cached value if still fresh, else None."""
        entry = cache.get(key)
        if entry and (time.time() - entry[0]) < self.CACHE_TTL:
            return entry[1]
        return None

    async def get_quote(self, symbol: str) -> Optional[Dict]:
        """
        Get real-time quote for a stock symbol

        Returns:
            Dictionary with price data or None if error
            {
                "c": current_price,
                "h": high_price,
                "l": low_price,
                "o": open_price,
                "pc": previous_close,
                "t": timestamp
            }
        """
        try:
            url = f"{self.base_url}/quote"
            params = {
                "symbol": symbol.upper(),
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            # Check if we got valid data
            if data.get("c") == 0:
                return None

            return data

        except Exception as e:
            logger.error(f"Error fetching quote for {symbol}", exc_info=True)
            return None

    async def get_company_profile(self, symbol: str) -> Optional[Dict]:
        """Get company profile information (cached for 5 min)."""
        cache_key = symbol.upper()
        cached = self._get_cached(self._profile_cache, cache_key)
        if cached is not None:
            return cached

        try:
            url = f"{self.base_url}/stock/profile2"
            params = {
                "symbol": cache_key,
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            if data:
                self._profile_cache[cache_key] = (time.time(), data)
            return data if data else None

        except Exception as e:
            logger.error(f"Error fetching company profile for {symbol}", exc_info=True)
            return None

    async def get_basic_financials(self, symbol: str) -> Optional[Dict]:
        """
        Get basic financial metrics (cached for 5 min).

        Returns key metrics: 52WeekHigh, 52WeekLow, beta, peBasicExclExtraTTM,
        epsBasicExclExtraItemsTTM, dividendYieldIndicatedAnnual,
        10DayAverageTradingVolume, marketCapitalization, yearToDatePriceReturnDaily
        """
        cache_key = symbol.upper()
        cached = self._get_cached(self._financials_cache, cache_key)
        if cached is not None:
            return cached

        try:
            url = f"{self.base_url}/stock/metric"
            params = {
                "symbol": cache_key,
                "metric": "all",
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            metrics = data.get("metric") if data else None
            if metrics:
                self._financials_cache[cache_key] = (time.time(), metrics)
            return metrics

        except Exception as e:
            logger.error(f"Error fetching basic financials for {symbol}", exc_info=True)
            return None

    async def get_recommendation_trends(self, symbol: str) -> Optional[List[Dict]]:
        """
        Get analyst recommendation trends.

        Returns list of monthly entries with:
        strongBuy, buy, hold, sell, strongSell, period
        """
        try:
            url = f"{self.base_url}/stock/recommendation"
            params = {
                "symbol": symbol.upper(),
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return data if isinstance(data, list) and len(data) > 0 else None

        except Exception as e:
            logger.error(f"Error fetching recommendations for {symbol}", exc_info=True)
            return None

    async def search_symbols(self, query: str) -> List[Dict]:
        """Search for stock symbols."""
        try:
            url = f"{self.base_url}/search"
            params = {
                "q": query,
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return data.get("result", [])

        except Exception as e:
            logger.error("Error searching symbols", exc_info=True)
            return []

    async def get_historical_data(
        self,
        symbol: str,
        days: int = 30
    ) -> Optional[Dict]:
        """Get historical price data."""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            url = f"{self.base_url}/stock/candle"
            params = {
                "symbol": symbol.upper(),
                "resolution": "D",
                "from": int(start_date.timestamp()),
                "to": int(end_date.timestamp()),
                "token": self.api_key
            }
            async with self.rate_limiter:
                response = await self.client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("s") == "no_data":
                return None

            return data

        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}", exc_info=True)
            return None

    async def get_multiple_quotes(self, symbols: List[str]) -> Dict[str, Dict]:
        """Get quotes for multiple symbols efficiently."""
        results = {}

        tasks = [self.get_quote(symbol) for symbol in symbols]
        quotes = await asyncio.gather(*tasks)

        for symbol, quote in zip(symbols, quotes):
            if quote:
                results[symbol] = quote

        return results

    async def get_stock_detail(self, symbol: str) -> Optional[Dict]:
        """
        Get combined stock detail: quote + profile + financials + recommendations.
        All four Finnhub API calls happen concurrently via asyncio.gather.
        """
        quote, profile, financials, recommendations = await asyncio.gather(
            self.get_quote(symbol),
            self.get_company_profile(symbol),
            self.get_basic_financials(symbol),
            self.get_recommendation_trends(symbol),
        )

        if not quote:
            return None

        return {
            "quote": quote,
            "profile": profile,
            "financials": financials,
            "recommendations": recommendations,
        }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Create singleton instance
stock_api = StockAPIService()


# For async context manager support
class StockAPIContext:
    async def __aenter__(self):
        return stock_api

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await stock_api.close()
