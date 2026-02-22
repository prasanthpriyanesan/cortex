import logging
from typing import List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.alert import Alert, AlertStatus
from app.models.notification import Notification, NotificationChannel
from app.models.sector_strategy import SectorStrategy
from app.services.stock_api import stock_api
from app.services.market_data_cache import market_data_cache
from app.services.notification import notification_service
import asyncio

logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Alert engine for checking stock prices and triggering alerts.
    Creates Notification records and sends batched emails per user.
    """

    async def check_sector_strategies(self, db: Session) -> int:
        """
        Check all active Sector Strategies for relative strength divergences.
        Returns the number of divergence alerts triggered.
        """
        active_strategies = db.query(SectorStrategy).filter(SectorStrategy.is_active == True).all()
        if not active_strategies:
            return 0
            
        triggered_count = 0
        triggered_by_user: Dict[int, List[Dict]] = defaultdict(list)
        
        # We need all symbols involved to fetch quotes efficiently
        all_symbols = set()
        for strategy in active_strategies:
            for stock in strategy.sector.stocks:
                all_symbols.add(stock.symbol)
                
        if not all_symbols:
            return 0
            
        # 1. Fetch live prices from Redis cache
        symbols_list = list(all_symbols)
        live_prices = await market_data_cache.get_all_live_prices(symbols_list)
        
        # 2. Build quotes dictionary
        quotes = {}
        for symbol in symbols_list:
            c = live_prices.get(symbol)
            pc = await market_data_cache.get_previous_close(symbol)
            
            # If cache miss, fallback to HTTP
            if c is None or pc is None:
                logger.debug(f"Cache miss for {symbol}, triggering HTTP fallback.")
                quote = await stock_api.get_quote(symbol)
                if quote:
                    quotes[symbol] = {"c": quote.get("c"), "pc": quote.get("pc")}
                    # Rate limit fallback
                    await asyncio.sleep(1.1)
            else:
                quotes[symbol] = {"c": c, "pc": pc}
        
        for strategy in active_strategies:
            try:
                stocks = strategy.sector.stocks
                total_stocks = len(stocks)
                if total_stocks < 2:
                    continue  # Needs at least 2 stocks for "relative" strength
                    
                basket_moves = []
                for stock in stocks:
                    quote = quotes.get(stock.symbol)
                    if quote and quote.get("c") and quote.get("pc"):
                        c, pc = quote["c"], quote["pc"]
                        pct_change = ((c - pc) / pc) * 100
                        basket_moves.append({"symbol": stock.symbol, "name": stock.stock_name, "change": pct_change, "price": c})
                        
                if len(basket_moves) != total_stocks:
                    continue  # Missing data for some stocks, skip evaluation to be safe
                
                # Check Upward trend
                up_trenders = [s for s in basket_moves if s["change"] >= strategy.trend_threshold]
                up_percent = (len(up_trenders) / total_stocks) * 100
                
                # Check Downward trend
                down_trenders = [s for s in basket_moves if s["change"] <= -strategy.trend_threshold]
                down_percent = (len(down_trenders) / total_stocks) * 100
                
                laggard_symbol = None
                direction = None
                
                if up_percent >= strategy.percent_majority:
                    # Sector is trending UP. Look for a stock that is severely DOWN.
                    laggards = [s for s in basket_moves if s["change"] <= strategy.laggard_threshold]
                    if len(laggards) == 1:
                        laggard_symbol = laggards[0]
                        direction = "UP"
                elif down_percent >= strategy.percent_majority:
                    # Sector is trending DOWN. Look for a stock that is severely UP.
                    # Note: laggard_threshold is typically negative (e.g. -1.0%). For upward divergence, we check for >= +1.0%.
                    divergence_positive = abs(strategy.laggard_threshold)
                    laggards = [s for s in basket_moves if s["change"] >= divergence_positive]
                    if len(laggards) == 1:
                        laggard_symbol = laggards[0]
                        direction = "DOWN"
                        
                if laggard_symbol:
                    # Check if we already triggered recently to avoid spamming.
                    # We'll trigger an in-app notification for the laggard.
                    title = f"Sector Divergence Play: {laggard_symbol['symbol']} is diverging from {strategy.sector.name}"
                    message = f"{strategy.sector.name} is trending {'UP' if direction == 'UP' else 'DOWN'}. {laggard_symbol['symbol']} is lagging heavily at {laggard_symbol['change']:.2f}%."
                    
                    notification = Notification(
                        user_id=strategy.user_id,
                        channel=NotificationChannel.IN_APP,
                        title=title,
                        message=message,
                        symbol=laggard_symbol['symbol'],
                        trigger_price=laggard_symbol['price'],
                        alert_type="sector_divergence",
                        threshold_value=laggard_symbol['change']
                    )
                    db.add(notification)
                    
                    strategy.last_triggered_at = datetime.utcnow()
                    db.commit()
                    triggered_count += 1
                    
            except Exception as e:
                logger.error(f"Error checking SectorStrategy {strategy.id}", exc_info=True)
                db.rollback()
                continue
                
        return triggered_count

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
        symbols_list = list(symbols_to_check)

        # 1. Fetch live prices from Redis cache
        live_prices = await market_data_cache.get_all_live_prices(symbols_list)

        # 2. Build quotes dictionary
        quotes = {}
        for symbol in symbols_list:
            c = live_prices.get(symbol)
            pc = await market_data_cache.get_previous_close(symbol)
            
            # If cache miss, fallback to HTTP
            if c is None or pc is None:
                logger.debug(f"Cache miss for standard alert {symbol}, triggering HTTP fallback.")
                quote = await stock_api.get_quote(symbol)
                if quote:
                    quotes[symbol] = {"c": quote.get("c"), "pc": quote.get("pc")}
                    # Rate limit fallback
                    await asyncio.sleep(1.1)
            else:
                quotes[symbol] = {"c": c, "pc": pc}

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
                logger.error(f"Error checking alert {alert.id}", exc_info=True)
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

            logger.info(f"Alert triggered: {alert.symbol} at ${current_price}")

        except Exception as e:
            logger.error(f"Error triggering alert {alert.id}", exc_info=True)
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
            logger.warning(f"Email retry {attempt + 1}/3 for user {user.id}")

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
