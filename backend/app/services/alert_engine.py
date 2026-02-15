from typing import List
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.alert import Alert, AlertStatus
from app.services.stock_api import stock_api
from app.services.notification import notification_service


class AlertEngine:
    """
    Alert engine for checking stock prices and triggering alerts
    """
    
    async def check_alerts(self, db: Session) -> int:
        """
        Check all active alerts and trigger notifications
        
        Args:
            db: Database session
        
        Returns:
            Number of alerts triggered
        """
        # Get all active alerts
        active_alerts = db.query(Alert).filter(
            Alert.status == AlertStatus.ACTIVE
        ).all()
        
        if not active_alerts:
            return 0
        
        # Group alerts by symbol for efficient API calls
        symbols_to_check = set(alert.symbol for alert in active_alerts)
        
        # Fetch current prices for all symbols
        quotes = await stock_api.get_multiple_quotes(list(symbols_to_check))
        
        triggered_count = 0
        
        for alert in active_alerts:
            try:
                quote = quotes.get(alert.symbol)
                
                if not quote:
                    continue
                
                current_price = quote.get("c")
                previous_close = quote.get("pc")
                
                if not current_price:
                    continue
                
                # Check if alert condition is met
                if alert.check_condition(current_price, previous_close):
                    await self._trigger_alert(alert, current_price, db)
                    triggered_count += 1
                
                # Update last checked timestamp
                alert.last_checked_at = datetime.utcnow()
                db.commit()
        
            except Exception as e:
                print(f"Error checking alert {alert.id}: {e}")
                continue
        
        return triggered_count
    
    async def _trigger_alert(self, alert: Alert, current_price: float, db: Session):
        """
        Trigger an alert and send notifications
        
        Args:
            alert: Alert object to trigger
            current_price: Current price that triggered the alert
            db: Database session
        """
        try:
            # Update alert status
            alert.triggered_at = datetime.utcnow()
            alert.trigger_price = current_price
            
            if not alert.is_repeating:
                alert.status = AlertStatus.TRIGGERED
            
            db.commit()
            
            # Send notifications
            await self._send_notifications(alert, current_price)
            
            print(f"Alert triggered: {alert.symbol} at ${current_price}")
        
        except Exception as e:
            print(f"Error triggering alert {alert.id}: {e}")
            db.rollback()
    
    async def _send_notifications(self, alert: Alert, current_price: float):
        """
        Send notifications through configured channels
        
        Args:
            alert: Alert object
            current_price: Current price
        """
        message = self._format_alert_message(alert, current_price)
        
        # Email notification
        if alert.notify_email and alert.user.email_notifications:
            await notification_service.send_email(
                to_email=alert.user.email,
                subject=f"Stock Alert: {alert.symbol}",
                body=message
            )
        
        # SMS notification
        if alert.notify_sms and alert.user.sms_notifications and alert.user.phone_number:
            await notification_service.send_sms(
                to_phone=alert.user.phone_number,
                message=message
            )
    
    def _format_alert_message(self, alert: Alert, current_price: float) -> str:
        """
        Format alert message for notifications
        
        Args:
            alert: Alert object
            current_price: Current price
        
        Returns:
            Formatted message string
        """
        alert_type_text = {
            "price_above": "rose above",
            "price_below": "fell below",
            "percent_change": "changed by",
            "volume_spike": "volume spiked"
        }
        
        action = alert_type_text.get(alert.alert_type, "triggered")
        
        message = f"""
Stock Alert Triggered!

Symbol: {alert.symbol}
{alert.stock_name or ''}

Alert: {alert.symbol} {action} ${alert.threshold_value}
Current Price: ${current_price:.2f}

{alert.message or ''}

Triggered at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
        """.strip()
        
        return message


# Create singleton instance
alert_engine = AlertEngine()
