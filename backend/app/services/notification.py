import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings


class NotificationService:
    """
    Service for sending notifications via email and SMS
    """
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html: Optional[str] = None
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
                start_tls=True
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
            # This is a placeholder - you would need to install twilio package
            # and implement actual SMS sending
            # from twilio.rest import Client
            # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            # message = client.messages.create(
            #     body=message,
            #     from_=settings.TWILIO_PHONE_NUMBER,
            #     to=to_phone
            # )
            
            print(f"SMS would be sent to {to_phone}: {message}")
            return True
        
        except Exception as e:
            print(f"Error sending SMS to {to_phone}: {e}")
            return False
    
    async def send_push_notification(
        self,
        user_id: int,
        title: str,
        body: str
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
        # Placeholder for push notification implementation
        # You would integrate with Firebase Cloud Messaging or similar
        print(f"Push notification to user {user_id}: {title}")
        return True


# Create singleton instance
notification_service = NotificationService()
