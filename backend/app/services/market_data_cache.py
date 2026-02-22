import json
import logging
from typing import Optional, Dict
from redis import asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

class MarketDataCache:
    """
    Service for caching real-time and daily market data in Redis.
    This protects the Finnhub HTTP API from rate limits.
    """
    
    def __init__(self):
        self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        # Prefix keys to avoid collisions
        self.LIVE_PREFIX = "stock:live:"
        self.PREV_PREFIX = "stock:prev:"

    async def update_live_price(self, symbol: str, price: float):
        """Cache the most recent live price from the WS stream."""
        try:
            # Expire after 5 minutes just in case the websocket dies 
            # so we don't serve stale data for hours.
            await self.redis.setex(f"{self.LIVE_PREFIX}{symbol}", 300, str(price))
        except Exception as e:
            logger.error(f"Redis error caching live price for {symbol}: {e}")

    async def get_live_price(self, symbol: str) -> Optional[float]:
        """Get the cached live price."""
        try:
            val = await self.redis.get(f"{self.LIVE_PREFIX}{symbol}")
            return float(val) if val else None
        except Exception:
            return None

    async def cache_previous_close(self, symbol: str, price: float):
        """Cache the previous day's close price."""
        try:
            # Expire after 24 hours
            await self.redis.setex(f"{self.PREV_PREFIX}{symbol}", 86400, str(price))
        except Exception as e:
            logger.error(f"Redis error caching prev close for {symbol}: {e}")

    async def get_previous_close(self, symbol: str) -> Optional[float]:
        """Get the cached previous close price."""
        try:
            val = await self.redis.get(f"{self.PREV_PREFIX}{symbol}")
            return float(val) if val else None
        except Exception:
            return None

    async def get_all_live_prices(self, symbols: list[str]) -> Dict[str, float]:
        """Fetch multiple live prices efficiently using MGET."""
        if not symbols:
            return {}
        try:
            keys = [f"{self.LIVE_PREFIX}{s}" for s in symbols]
            values = await self.redis.mget(keys)
            
            result = {}
            for sym, val in zip(symbols, values):
                if val is not None:
                    result[sym] = float(val)
            return result
        except Exception as e:
            logger.error(f"Redis error in get_all_live_prices: {e}")
            return {}

    async def close(self):
        await self.redis.close()

# Singleton
market_data_cache = MarketDataCache()
