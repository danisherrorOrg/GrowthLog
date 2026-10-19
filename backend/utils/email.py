import html
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15


def render_email(heading: str, paragraphs: list, button_text: str = None, button_url: str = None, note: str = None) -> str:
    """
    Brand-aligned HTML email ("Organic Mastery" palette). All text is escaped,
    so user-supplied values like names can't inject markup into the email.
    """
    body = "".join(
        f'<p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">{html.escape(p)}</p>' for p in paragraphs
    )
    button = ""
    if button_text and button_url:
        url = html.escape(button_url, quote=True)
        button = f"""
        <div style="text-align: center; margin: 30px 0;">
            <a href="{url}" style="display: inline-block; background: #6b8c6b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold;">{html.escape(button_text)}</a>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center; word-break: break-all;">If the button doesn't work, copy this link:<br/>{url}</p>"""
    note_html = f'<p style="font-size: 12px; color: #999; text-align: center;">{html.escape(note)}</p>' if note else ""
    return f"""
    <div style="background: #f5f0e8; padding: 32px 16px;">
      <div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; background: #fdfcf9; border: 1px solid #eee; border-radius: 16px; color: #0d0d0d;">
        <div style="font-family: Georgia, serif; color: #c9a84c; font-size: 18px; margin-bottom: 20px;">GrowthLog ✦</div>
        <h2 style="font-family: Georgia, serif; color: #6b8c6b; font-size: 24px; font-weight: normal; margin: 0 0 18px;">{html.escape(heading)}</h2>
        {body}{button}{note_html}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">GrowthLog — Holistic Tracking for the Intentional Life<br/>You can turn off reminder emails in your Profile settings.</p>
      </div>
    </div>"""


def send_email(to_email: str, subject: str, body: str):
    """
    Sends over SMTP, so any provider works by configuration alone
    (Resend: smtp.resend.com, SendGrid: smtp.sendgrid.net, Mailgun, Gmail…).
    Port 465 uses implicit TLS; any other port uses STARTTLS.
    """
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS]):
        # Never log the body: it contains verification links that act as credentials
        logger.warning("SMTP not configured; email to %s (%r) was not sent", to_email, subject)
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS)
            server.starttls()
        with server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send email to %s (%r)", to_email, subject)
        return False
