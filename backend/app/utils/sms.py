"""
Email Notification Utility — Gmail SMTP
-----------------------------------------
Sends:
  • OTP login emails
  • Booking confirmation emails
  • Cancellation notice emails

All sent from viswasportsarena@gmail.com via Gmail SMTP (TLS).

Environment variables (from app.core.config / .env):
  SMTP_HOST       — smtp.gmail.com
  SMTP_PORT       — 587
  SMTP_USER       — viswasportsarena@gmail.com
  SMTP_PASSWORD   — Google App Password (16-char, spaces OK)
  SMTP_FROM_NAME  — Display name in the "From" header

If SMTP credentials are missing, functions log a warning and return
silently so the booking flow is never blocked by an email failure.
"""
import logging
import smtplib
from datetime import date
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

logger = logging.getLogger(__name__)

# ── Brand colours ─────────────────────────────────────────────────────────────
_GREEN = "#00A86B"  # Primary accent green
_PAGE_BG = "#F8F8F8"  # Light grey page background
_CARD_BG = "#FFFFFF"  # White card background
_TEXT_PRIMARY = "#333333"  # Dark grey for primary text
_TEXT_MUTED = "#666666"  # Medium grey for muted text


def _get_smtp_config():
    """Return (host, port, user, password, from_name) or None if unconfigured."""
    try:
        from app.core.config import settings
        host     = settings.SMTP_HOST
        port     = settings.SMTP_PORT
        user     = settings.SMTP_USER.strip()
        password = settings.SMTP_PASSWORD.strip().replace(" ", "")   # remove spaces in app passwords
        name     = settings.SMTP_FROM_NAME.strip() or "Viswa Sports Arena"
        if not user or not password:
            logger.warning("[EMAIL] SMTP_USER or SMTP_PASSWORD not set — email not sent.")
            return None
        return host, port, user, password, name
    except Exception as exc:
        logger.error("[EMAIL] Failed to load SMTP config: %s", exc)
        return None


def _send(to_email: str, subject: str, html_body: str) -> None:
    """Low-level send via Gmail SMTP/TLS — used by all public helpers."""
    cfg = _get_smtp_config()
    if cfg is None:
        return

    host, port, user, password, from_name = cfg
    from_addr = f"{from_name} <{user}>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(user, [to_email], msg.as_string())
        logger.info("[EMAIL] ✅ Sent '%s' to %s", subject, to_email)
    except Exception as exc:
        logger.error("[EMAIL] ❌ Failed to send '%s' to %s: %s", subject, to_email, exc)


# ── HTML template helper ───────────────────────────────────────────────────────

def _wrap_html(title: str, body_html: str) -> str:
    """Wrap email body in a branded full-page HTML template with light theme."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
  <style>
    body {{ margin:0; padding:0; background-color:{_PAGE_BG}; font-family:'Segoe UI',Arial,sans-serif; color:{_TEXT_PRIMARY}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
    table {{ border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }}
    td, th {{ padding:0; }}
    img {{ border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }}
    a {{ text-decoration:none; color:{_GREEN}; }}
    .ExternalClass {{ width:100%; }}
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {{ line-height:100%; }}
    .apple-link a {{ color:inherit !important; font-family:inherit !important; font-size:inherit !important; font-weight:inherit !important; line-height:inherit !important; text-decoration:none !important; }}
    .btn-primary table td:hover {{ background-color:#008C5A !important; }}
    .btn-primary a:hover {{ background-color:#008C5A !important; border-color:#008C5A !important; }}
  </style>
</head>
<body style="margin:0; padding:0; background-color:{_PAGE_BG}; font-family:'Segoe UI',Arial,sans-serif; color:{_TEXT_PRIMARY}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <center style="width:100%; background-color:{_PAGE_BG};">
    <div style="max-width:600px; mso-line-height-rule:exactly;">
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:auto;">
        <tr>
          <td style="padding:32px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:{_CARD_BG}; border-radius:8px; overflow:hidden; border:1px solid #E0E0E0;">
              <!-- Header -->
              <tr>
                <td style="background-color:{_GREEN}; padding:24px 20px; text-align:center;">
                  <h1 style="margin:0; font-size:24px; font-weight:800; color:{_CARD_BG}; letter-spacing:-0.5px;">
                    <span style="vertical-align:middle;">🏟</span> Viswa Sports Arena
                  </h1>
                  <p style="margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.8);">Your premier booking platform</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 20px; background-color:{_CARD_BG};">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">
                        {body_html}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:24px 20px; text-align:center; font-size:12px; color:{_TEXT_MUTED}; background-color:#F0F0F0; border-top:1px solid #E0E0E0;">
                  &copy; 2025 Viswa Sports Arena &nbsp;|&nbsp; <a href="mailto:viswasportsarena@gmail.com" style="color:{_TEXT_MUTED}; text-decoration:underline;">viswasportsarena@gmail.com</a><br/>
                  <p style="margin:8px 0 0; font-size:11px; color:#999999;">If you did not request this, please ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </center>
</body>
</html>"""


# ── Public API ────────────────────────────────────────────────────────────────

def send_otp_email(email: str, otp: str, expiry_minutes: int = 10) -> None:
    """Send a 6-digit OTP login code to the user's email."""
    body = f"""
      <h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:{_TEXT_PRIMARY};">Your Login OTP</h2>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">Use the code below to sign in to your Viswa Sports Arena account.
         It expires in <strong style="color:{_GREEN}">{expiry_minutes} minutes</strong>.</p>
      <div style="font-size:36px; font-weight:800; letter-spacing:10px; color:{_GREEN};
                 text-align:center; background-color:#F5F5F5; border-radius:8px;
                 padding:20px 0; margin:24px 0; border:1px solid #E0E0E0;">{otp}</div>
      <p style="font-size:13px; text-align:center; color:{_TEXT_MUTED}; margin:0;">
        Do not share this code with anyone. Viswa Sports staff will never ask for it.
      </p>
    """
    _send(email, "Your Viswa Sports OTP Code", _wrap_html("OTP", body))


def send_booking_confirmation(
    email: str,
    turf_name: str,
    booking_date: date,
    amount: Decimal,
    booking_id: int,
    slot_times: List[str],
    *,
    # kept for optional backward compat — ignored
    mobile: str = "",
) -> None:
    """Send a booking confirmation email to the customer."""
    slots_str = " &nbsp;|&nbsp; ".join(slot_times) if slot_times else "—"
    body = f"""
      <h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:{_TEXT_PRIMARY};">Booking Confirmed! 🎉</h2>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">Your slot at <strong style="color:{_GREEN}">{turf_name}</strong> is all set.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:18px 0; border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_MUTED}; width:38%;">Booking ID</td>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_PRIMARY}; font-weight:600;">#{booking_id}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_MUTED};">Date</td>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_PRIMARY}; font-weight:600;">{booking_date.strftime('%d %B %Y')}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_MUTED};">Slots</td>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_PRIMARY}; font-weight:600;">{slots_str}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-size:14px; color:{_TEXT_MUTED};">Amount Paid</td>
          <td style="padding:10px 0; font-size:14px; color:{_TEXT_PRIMARY}; font-weight:600;">₹{amount:.2f}</td>
        </tr>
      </table>
      <p style="text-align:center; margin:24px 0;"><span style="display:inline-block; background-color:rgba(0,168,107,0.1); color:{_GREEN};
                 border:1px solid rgba(0,168,107,0.3); border-radius:4px;
                 padding:6px 16px; font-size:13px; font-weight:700;">✓ CONFIRMED</span></p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">We'll see you on the turf! Arrive 10 minutes early to warm up. 🏆</p>
    """
    _send(
        email,
        f"Booking Confirmed — {turf_name} on {booking_date.strftime('%d %b %Y')}",
        _wrap_html("Booking Confirmation", body),
    )


def send_cancellation_notice(
    email: str,
    turf_name: str,
    booking_date: date,
    amount: Decimal,
    booking_id: int,
    *,
    mobile: str = "",
) -> None:
    """Send a cancellation notice email to the customer."""
    body = f"""
      <h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:{_TEXT_PRIMARY};">Booking Cancelled</h2>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">Your booking at <strong style="color:{_TEXT_PRIMARY}">{turf_name}</strong> has been cancelled.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:18px 0; border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_MUTED}; width:38%;">Booking ID</td>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_PRIMARY}; font-weight:600;">#{booking_id}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_MUTED};">Date</td>
          <td style="padding:10px 0; font-size:14px; border-bottom:1px solid #EEEEEE; color:{_TEXT_PRIMARY}; font-weight:600;">{booking_date.strftime('%d %B %Y')}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-size:14px; color:{_TEXT_MUTED};">Refund</td>
          <td style="padding:10px 0; font-size:14px; color:{_TEXT_PRIMARY}; font-weight:600;">₹{amount:.2f}</td>
        </tr>
      </table>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">Your refund of <strong style="color:{_GREEN}">₹{amount:.2f}</strong> will be processed
         within <strong>3–5 business days</strong>.</p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:{_TEXT_PRIMARY};">We hope to see you again soon. — Viswa Sports Arena</p>
    """
    _send(
        email,
        f"Booking Cancelled — {turf_name} on {booking_date.strftime('%d %b %Y')}",
        _wrap_html("Booking Cancelled", body),
    )
