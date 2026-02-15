import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.core.config import settings


class StockAPIService:
    """
    Service for fetching stock data from Finnhub API
    Supports real-time quotes, historical data, and company information
    """
    
    def __init__(self):
        self.api_key = settings.FINNHUB_API_KEY
        self.base_url = "https://finnhub.io/api/v1"
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_quote(self, symbol: str) -> Optional[Dict]:
        """
        Get real-time quote for a stock symbol
        
        Args:
            symbol: Stock symbol (e.g., "AAPL")
        
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
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Check if we got valid data
            if data.get("c") == 0:
                return None
            
            return data
        
        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return None
    
    async def get_company_profile(self, symbol: str) -> Optional[Dict]:
        """
        Get company profile information
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Dictionary with company info or None
        """
        try:
            url = f"{self.base_url}/stock/profile2"
            params = {
                "symbol": symbol.upper(),
                "token": self.api_key
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data if data else None
        
        except Exception as e:
            print(f"Error fetching company profile for {symbol}: {e}")
            return None
    
    async def search_symbols(self, query: str) -> List[Dict]:
        """
        Search for stock symbols
        
        Args:
            query: Search query
        
        Returns:
            List of matching symbols
        """
        try:
            url = f"{self.base_url}/search"
            params = {
                "q": query,
                "token": self.api_key
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get("result", [])
        
        except Exception as e:
            print(f"Error searching symbols: {e}")
            return []
    
    async def get_historical_data(
        self, 
        symbol: str, 
        days: int = 30
    ) -> Optional[Dict]:
        """
        Get historical price data
        
        Args:
            symbol: Stock symbol
            days: Number of days of historical data
        
        Returns:
            Dictionary with historical data
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            url = f"{self.base_url}/stock/candle"
            params = {
                "symbol": symbol.upper(),
                "resolution": "D",  # Daily resolution
                "from": int(start_date.timestamp()),
                "to": int(end_date.timestamp()),
                "token": self.api_key
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("s") == "no_data":
                return None
            
            return data
        
        except Exception as e:
            print(f"Error fetching historical data for {symbol}: {e}")
            return None
    
    async def get_multiple_quotes(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Get quotes for multiple symbols efficiently
        
        Args:
            symbols: List of stock symbols
        
        Returns:
            Dictionary mapping symbols to their quote data
        """
        results = {}
        
        # Fetch quotes concurrently
        tasks = [self.get_quote(symbol) for symbol in symbols]
        quotes = await asyncio.gather(*tasks)
        
        for symbol, quote in zip(symbols, quotes):
            if quote:
                results[symbol] = quote
        
        return results
    
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


# Import asyncio at the end to avoid circular imports
import asyncio
