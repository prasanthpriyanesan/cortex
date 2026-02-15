import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict
from datetime import datetime
from app.core.config import settings


class NotificationService:
    """
    Service for sending notifications via email and SMS
    """

    def build_alert_html(self, alerts_data: List[Dict]) -> str:
        """
        Build a styled HTML email for one or more triggered alerts.

        Args:
            alerts_data: List of dicts with keys: symbol, stock_name, alert_type,
                         threshold_value, trigger_price, message, triggered_at

        Returns:
            HTML string
        """
        # Build alert rows
        alert_rows = ""
        for a in alerts_data:
            action_text = {
                "price_above": "rose above",
                "price_below": "fell below",
                "percent_change": "changed by",
                "volume_spike": "volume spiked",
            }.get(a.get("alert_type", ""), "triggered")

            symbol = a.get("symbol", "???")
            stock_name = a.get("stock_name") or ""
            trigger_price = a.get("trigger_price", 0)
            threshold = a.get("threshold_value", 0)
            custom_msg = a.get("message") or ""
            triggered_at = a.get("triggered_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

            alert_rows += f"""
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #2a2a3e;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-size: 18px; font-weight: 700; color: #ffffff;">{symbol}</span>
                    <span style="font-size: 13px; color: #8b8ba3; margin-left: 8px;">{stock_name}</span>
                  </div>
                </div>
                <div style="margin-top: 8px; font-size: 14px; color: #c4c4d4;">
                  {symbol} {action_text} <span style="color: #6c63ff; font-weight: 600;">${threshold:,.2f}</span>
                </div>
                <div style="margin-top: 6px;">
                  <span style="font-size: 22px; font-weight: 700; color: #00d4aa;">${trigger_price:,.2f}</span>
                  <span style="font-size: 12px; color: #8b8ba3; margin-left: 6px;">current price</span>
                </div>
                {"<div style='margin-top: 6px; font-size: 13px; color: #8b8ba3; font-style: italic;'>" + custom_msg + "</div>" if custom_msg else ""}
                <div style="margin-top: 8px; font-size: 11px; color: #5a5a7a;">Triggered at {triggered_at}</div>
              </td>
            </tr>
            """

        count = len(alerts_data)
        subject_hint = f"{count} alert{'s' if count > 1 else ''} triggered"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a3e;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 28px 24px; background: linear-gradient(135deg, #6c63ff 0%, #4834d4 100%); text-align: center;">
                      <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">⚡ Cortex Alert</div>
                      <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 4px;">{subject_hint}</div>
                    </td>
                  </tr>

                  <!-- Alert rows -->
                  {alert_rows}

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 24px; text-align: center; border-top: 1px solid #2a2a3e;">
                      <a href="http://localhost:3000" style="display: inline-block; padding: 10px 28px; background: linear-gradient(135deg, #6c63ff, #4834d4); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Open Cortex</a>
                      <div style="margin-top: 16px; font-size: 11px; color: #5a5a7a;">
                        You're receiving this because you enabled email alerts on Cortex.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return html

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> bool:
        """
        Send email notification

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html: Optional HTML body

        Returns:
            True if sent successfully, False otherwise
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print("Email credentials not configured")
            return False

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = settings.EMAIL_FROM or settings.SMTP_USER
            message["To"] = to_email

            # Add plain text part
            text_part = MIMEText(body, "plain")
            message.attach(text_part)

            # Add HTML part if provided
            if html:
                html_part = MIMEText(html, "html")
                message.attach(html_part)

            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )

            print(f"Email sent to {to_email}")
            return True

        except Exception as e:
            print(f"Error sending email to {to_email}: {e}")
            return False

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Send SMS notification via Twilio

        Args:
            to_phone: Recipient phone number
            message: SMS message text

        Returns:
            True if sent successfully, False otherwise
        """
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            print("Twilio credentials not configured")
            return False

        try:
            print(f"SMS would be sent to {to_phone}: {message}")
            return True

        except Exception as e:
            print(f"Error sending SMS to {to_phone}: {e}")
            return False

    async def send_push_notification(
        self,
        user_id: int,
        title: str,
        body: str,
    ) -> bool:
        """
        Send push notification (placeholder for future implementation)

        Args:
            user_id: User ID
            title: Notification title
            body: Notification body

        Returns:
            True if sent successfully, False otherwise
        """
        print(f"Push notification to user {user_id}: {title}")
        return True


# Create singleton instance
notification_service = NotificationService()
