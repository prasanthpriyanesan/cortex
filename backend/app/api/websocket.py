import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Set
import asyncio
import json

from app.core.database import get_db
from app.services.stock_api import stock_api

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts stock updates
    """
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscribed_symbols: Set[str] = set()
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client"""
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients"""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        self.active_connections -= disconnected
    
    def add_subscription(self, symbol: str):
        """Add a symbol to the subscription list"""
        self.subscribed_symbols.add(symbol.upper())
    
    def remove_subscription(self, symbol: str):
        """Remove a symbol from the subscription list"""
        self.subscribed_symbols.discard(symbol.upper())


manager = ConnectionManager()


@router.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time stock updates
    
    Client sends:
    {
        "action": "subscribe",
        "symbols": ["AAPL", "GOOGL", "MSFT"]
    }
    
    Server sends periodic updates:
    {
        "type": "quote",
        "data": {
            "AAPL": {
                "c": 150.25,
                "h": 151.00,
                "l": 149.50,
                ...
            }
        }
    }
    """
    await manager.connect(websocket)
    
    # Track symbols this connection is watching
    watching_symbols: Set[str] = set()
    
    try:
        # Start background task to send updates
        update_task = asyncio.create_task(
            send_stock_updates(websocket, watching_symbols)
        )
        
        # Listen for client messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            action = message.get("action")
            
            if action == "subscribe":
                symbols = message.get("symbols", [])
                for symbol in symbols:
                    symbol_upper = symbol.upper()
                    watching_symbols.add(symbol_upper)
                    manager.add_subscription(symbol_upper)
                
                await manager.send_personal_message({
                    "type": "subscribed",
                    "symbols": list(watching_symbols)
                }, websocket)
            
            elif action == "unsubscribe":
                symbols = message.get("symbols", [])
                for symbol in symbols:
                    symbol_upper = symbol.upper()
                    watching_symbols.discard(symbol_upper)
                    manager.remove_subscription(symbol_upper)
                
                await manager.send_personal_message({
                    "type": "unsubscribed",
                    "symbols": list(watching_symbols)
                }, websocket)
            
            elif action == "ping":
                await manager.send_personal_message({
                    "type": "pong"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        for symbol in watching_symbols:
            manager.remove_subscription(symbol)
        update_task.cancel()
    
    except Exception as e:
        logger.error("WebSocket error", exc_info=True)
        manager.disconnect(websocket)
        update_task.cancel()


async def send_stock_updates(websocket: WebSocket, symbols: Set[str]):
    """
    Background task to periodically send stock updates
    """
    while True:
        try:
            await asyncio.sleep(5)  # Update every 5 seconds
            
            if not symbols:
                continue
            
            # Fetch quotes for all subscribed symbols
            quotes = await stock_api.get_multiple_quotes(list(symbols))
            
            if quotes:
                await manager.send_personal_message({
                    "type": "quote_update",
                    "data": quotes,
                    "timestamp": asyncio.get_event_loop().time()
                }, websocket)
        
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error sending websocket updates", exc_info=True)
            await asyncio.sleep(5)
