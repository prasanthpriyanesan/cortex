import asyncio
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.alert_engine import alert_engine
from app.core.config import settings
from app import models  # Ensure all models are loaded for SQLAlchemy relationships

logger = logging.getLogger(__name__)


async def check_alerts_task():
    """
    Background task that periodically checks all active alerts
    and triggers notifications when conditions are met
    """
    logger.info("Alert checker started")

    while True:
        try:
            # Create database session
            db = SessionLocal()
            
            try:
                # Check standard alarms
                standard_triggered = await alert_engine.check_alerts(db)
                if standard_triggered > 0:
                    logger.info(f"Triggered {standard_triggered} standard alerts")
                    
                # Check sector strategies
                strategy_triggered = await alert_engine.check_sector_strategies(db)
                if strategy_triggered > 0:
                    logger.info(f"Triggered {strategy_triggered} sector strategy alerts")
            
            finally:
                db.close()
            
            # Wait before next check
            await asyncio.sleep(settings.ALERT_CHECK_INTERVAL)
        
        except Exception as e:
            logger.error("Error in alert checker", exc_info=True)
            await asyncio.sleep(settings.ALERT_CHECK_INTERVAL)

async def main_async():
    """Run all background tasks concurrently."""
    from app.tasks.market_streamer import market_streamer
    from app.tasks.daily_maintenance import daily_maintenance
    
    logger.info("Starting all background workers...")
    
    # Run all three tasks forever
    await asyncio.gather(
        check_alerts_task(),
        market_streamer.connect_and_stream(),
        daily_maintenance.run_forever()
    )

def start_alert_checker():
    """
    Start the alert checker in the background
    
    Usage:
    In a separate process or container:
    python -m app.tasks.alert_checker
    """
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logger.info("Worker shutting down...")


if __name__ == "__main__":
    start_alert_checker()
