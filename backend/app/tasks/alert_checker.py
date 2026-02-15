import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.alert_engine import alert_engine
from app.core.config import settings
from app import models  # Ensure all models are loaded for SQLAlchemy relationships


async def check_alerts_task():
    """
    Background task that periodically checks all active alerts
    and triggers notifications when conditions are met
    """
    print("Alert checker started")
    
    while True:
        try:
            # Create database session
            db = SessionLocal()
            
            try:
                # Check all alerts
                triggered_count = await alert_engine.check_alerts(db)
                
                if triggered_count > 0:
                    print(f"Triggered {triggered_count} alerts")
            
            finally:
                db.close()
            
            # Wait before next check
            await asyncio.sleep(settings.ALERT_CHECK_INTERVAL)
        
        except Exception as e:
            print(f"Error in alert checker: {e}")
            await asyncio.sleep(settings.ALERT_CHECK_INTERVAL)


def start_alert_checker():
    """
    Start the alert checker in the background
    
    Usage:
    In a separate process or container:
    python -m app.tasks.alert_checker
    """
    asyncio.run(check_alerts_task())


if __name__ == "__main__":
    start_alert_checker()
