import asyncio
import logging
from datetime import datetime, time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.stock_api import stock_api
from app.services.market_data_cache import market_data_cache
from app.models.alert import Alert, AlertStatus
from app.models.sector import SectorStock

logger = logging.getLogger(__name__)

class DailyMaintenance:
    """
    Background job that runs once a day (e.g., before market open)
    to fetch and cache the 'previous_close' price for all active symbols.
    It intentionally waits 1.1s between each API call to respect the 
    60 calls/minute Finnhub limit.
    """
    def __init__(self):
        # Time to run the fetch (e.g. 6:00 AM)
        self.target_time = time(6, 0)

    def get_all_active_symbols(self) -> set[str]:
        """Fetch ALL active symbols from DB."""
        db = SessionLocal()
        symbols = set()
        try:
            for alert in db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).all():
                symbols.add(alert.symbol)
            for stock in db.query(SectorStock).all():
                symbols.add(stock.symbol)
        except Exception as e:
            logger.error(f"Error fetching symbols for daily maintenance: {e}")
        finally:
            db.close()
        return symbols

    async def fetch_and_cache_previous_close(self):
        """Iterate through symbols and slowly cache the previous close."""
        symbols = self.get_all_active_symbols()
        logger.info(f"Daily Maintenance starting for {len(symbols)} symbols...")
        
        for symbol in symbols:
            try:
                # HTTP fetch
                quote = await stock_api.get_quote(symbol)
                if quote and quote.get("pc"):
                    await market_data_cache.cache_previous_close(symbol, float(quote["pc"]))
            except Exception as e:
                logger.error(f"Error fetching daily prev close for {symbol}: {e}")
            
            # CRITICAL: Wait 1.1s to guarantee we never exceed 60 calls/minute
            await asyncio.sleep(1.1)
            
        logger.info("Daily Maintenance completed.")

    async def run_forever(self):
        """Loop forever, running the task once a day at target_time."""
        logger.info(f"Daily Maintenance scheduled to run at {self.target_time} daily.")
        
        # We run it immediately on startup once so the cache is hot.
        await self.fetch_and_cache_previous_close()

        while True:
            now = datetime.now()
            target = now.replace(hour=self.target_time.hour, 
                                 minute=self.target_time.minute, 
                                 second=0, microsecond=0)
            
            if now >= target:
                # If we passed the time today, schedule for tomorrow
                target = target.replace(day=target.day + 1)
            
            wait_seconds = (target - now).total_seconds()
            logger.info(f"Daily Maintenance sleeping for {wait_seconds} seconds until next run.")
            await asyncio.sleep(wait_seconds)
            
            await self.fetch_and_cache_previous_close()

# Singleton
daily_maintenance = DailyMaintenance()
