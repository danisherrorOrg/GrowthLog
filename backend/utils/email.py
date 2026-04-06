import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER

def send_email(to_email: str, subject: str, body: str):
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS]):
        print(f"DEBUG EMAIL (MOCK): To: {to_email}, Subject: {subject}, Body: {body}")
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        return False
