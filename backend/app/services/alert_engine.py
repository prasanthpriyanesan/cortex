from typing import List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.alert import Alert, AlertStatus
from app.models.notification import Notification, NotificationChannel
from app.services.stock_api import stock_api
from app.services.notification import notification_service


class AlertEngine:
    """
    Alert engine for checking stock prices and triggering alerts.
    Creates Notification records and sends batched emails per user.
    """

    async def check_alerts(self, db: Session) -> int:
        """
        Check all active alerts and trigger notifications.

        Returns:
            Number of alerts triggered
        """
        # Get all active alerts (eagerly load user for email access)
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
        # Collect triggered alerts per user for email batching
        triggered_by_user: Dict[int, List[Dict]] = defaultdict(list)

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

                    # Collect data for batched email
                    triggered_by_user[alert.user_id].append({
                        "alert": alert,
                        "symbol": alert.symbol,
                        "stock_name": alert.stock_name,
                        "alert_type": alert.alert_type.value if hasattr(alert.alert_type, 'value') else str(alert.alert_type),
                        "threshold_value": alert.threshold_value,
                        "trigger_price": current_price,
                        "message": alert.message,
                        "triggered_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    })

                # Update last checked timestamp
                alert.last_checked_at = datetime.utcnow()
                db.commit()

            except Exception as e:
                print(f"Error checking alert {alert.id}: {e}")
                continue

        # Send batched emails per user
        for user_id, alerts_data in triggered_by_user.items():
            await self._send_batched_email(alerts_data, db)

        return triggered_count

    async def _trigger_alert(self, alert: Alert, current_price: float, db: Session):
        """
        Trigger an alert: update its status and create an in-app Notification.
        """
        try:
            # Update alert status
            alert.triggered_at = datetime.utcnow()
            alert.trigger_price = current_price

            if not alert.is_repeating:
                alert.status = AlertStatus.TRIGGERED

            db.commit()

            # Build notification title
            action_text = {
                "price_above": "rose above",
                "price_below": "fell below",
                "percent_change": "changed by",
                "volume_spike": "volume spiked",
            }
            alert_type_val = alert.alert_type.value if hasattr(alert.alert_type, 'value') else str(alert.alert_type)
            action = action_text.get(alert_type_val, "triggered")
            title = f"{alert.symbol} {action} ${alert.threshold_value:,.2f}"

            # Create in-app notification
            notification = Notification(
                user_id=alert.user_id,
                alert_id=alert.id,
                channel=NotificationChannel.IN_APP,
                title=title,
                message=alert.message,
                symbol=alert.symbol,
                trigger_price=current_price,
                alert_type=alert_type_val,
                threshold_value=alert.threshold_value,
            )
            db.add(notification)
            db.commit()

            print(f"Alert triggered: {alert.symbol} at ${current_price}")

        except Exception as e:
            print(f"Error triggering alert {alert.id}: {e}")
            db.rollback()

    async def _send_batched_email(self, alerts_data: List[Dict], db: Session):
        """
        Send a single batched email for all triggered alerts belonging to one user,
        and create email Notification records.
        """
        if not alerts_data:
            return

        # All alerts belong to the same user
        alert_obj = alerts_data[0]["alert"]
        user = alert_obj.user

        if not user.email_notifications:
            return

        # Check per-alert email preference — only send for alerts with notify_email=True
        email_alerts = [a for a in alerts_data if a["alert"].notify_email]
        if not email_alerts:
            return

        # Build subject
        symbols = list(set(a["symbol"] for a in email_alerts))
        if len(symbols) == 1:
            subject = f"⚡ Cortex Alert: {symbols[0]}"
        else:
            subject = f"⚡ Cortex Alert: {', '.join(symbols[:3])}{'...' if len(symbols) > 3 else ''}"

        # Build plain text body
        plain_lines = [f"Cortex - {len(email_alerts)} alert(s) triggered\n"]
        for a in email_alerts:
            plain_lines.append(
                f"• {a['symbol']}: ${a['trigger_price']:,.2f} "
                f"({a['alert_type']} threshold ${a['threshold_value']:,.2f})"
            )
        plain_body = "\n".join(plain_lines)

        # Build HTML body
        html_body = notification_service.build_alert_html(email_alerts)

        # Send email (with retry)
        email_sent = False
        for attempt in range(3):
            email_sent = await notification_service.send_email(
                to_email=user.email,
                subject=subject,
                body=plain_body,
                html=html_body,
            )
            if email_sent:
                break
            print(f"Email retry {attempt + 1}/3 for user {user.id}")

        # Create email notification records
        now = datetime.utcnow() if email_sent else None
        for a in email_alerts:
            alert_type_val = a.get("alert_type", "")
            action_text = {
                "price_above": "rose above",
                "price_below": "fell below",
                "percent_change": "changed by",
                "volume_spike": "volume spiked",
            }
            action = action_text.get(alert_type_val, "triggered")
            title = f"{a['symbol']} {action} ${a['threshold_value']:,.2f}"

            email_notification = Notification(
                user_id=user.id,
                alert_id=a["alert"].id,
                channel=NotificationChannel.EMAIL,
                title=title,
                message=a.get("message"),
                symbol=a["symbol"],
                trigger_price=a["trigger_price"],
                alert_type=alert_type_val,
                threshold_value=a["threshold_value"],
                is_read=True,  # Email notifications are considered "read"
                email_sent_at=now,
            )
            db.add(email_notification)

        db.commit()

    def _format_alert_message(self, alert: Alert, current_price: float) -> str:
        """
        Format alert message for notifications (plain text fallback).
        """
        alert_type_text = {
            "price_above": "rose above",
            "price_below": "fell below",
            "percent_change": "changed by",
            "volume_spike": "volume spiked",
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
