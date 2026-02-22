import asyncio
import json
import logging
import websockets
from typing import Set
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.services.market_data_cache import market_data_cache
from app.models.alert import Alert, AlertStatus
from app.models.sector import SectorStock

logger = logging.getLogger(__name__)

class MarketStreamer:
    """
    Subscribes to Finnhub's real-time WebSocket for the top active symbols
    and pushes live trades into the Redis cache.
    """
    def __init__(self):
        self.api_key = settings.FINNHUB_API_KEY
        self.ws_url = f"wss://ws.finnhub.io?token={self.api_key}"
        self.active_symbols: Set[str] = set()
        self.ws = None

    def get_top_symbols(self) -> Set[str]:
        """Fetch up to 50 active symbols from the database."""
        db = SessionLocal()
        # Always include major market indexes
        symbols = {"SPY", "QQQ", "IWM"}
        try:
            # 1. Get symbols from active price alerts
            active_alerts = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).all()
            for alert in active_alerts:
                symbols.add(alert.symbol)

            # 2. Get symbols from all sectors
            sector_stocks = db.query(SectorStock).all()
            for stock in sector_stocks:
                symbols.add(stock.symbol)

        except Exception as e:
            logger.error(f"Error fetching symbols for streamer: {e}")
        finally:
            db.close()

        # Finnhub Free Tier limit is 50 symbols per connection.
        symbol_list = list(symbols)[:50]
        return set(symbol_list)

    async def connect_and_stream(self):
        """Connect to websocket and listen forever."""
        while True:
            try:
                self.active_symbols = self.get_top_symbols()
                logger.info(f"Streamer connecting to Finnhub for {len(self.active_symbols)} symbols...")
                
                async with websockets.connect(self.ws_url) as websocket:
                    self.ws = websocket
                    
                    # Subscribe to symbols
                    for symbol in self.active_symbols:
                        sub_msg = {"type": "subscribe", "symbol": symbol}
                        await websocket.send(json.dumps(sub_msg))
                    
                    logger.info("Streamer connected and subscribed.")

                    # Listen for messages
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data.get("type") == "trade":
                            # data["data"] is a list of trades: [{"s": "AAPL", "p": 150.0, ...}]
                            for trade in data.get("data", []):
                                symbol = trade.get("s")
                                price = trade.get("p")
                                if symbol and price:
                                    # Push to Redis
                                    await market_data_cache.update_live_price(symbol, float(price))

            except websockets.exceptions.ConnectionClosed:
                logger.warning("Finnhub websocket connection closed. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Streamer encountered error: {e}", exc_info=True)
                await asyncio.sleep(5)

# Singleton
market_streamer = MarketStreamer()
