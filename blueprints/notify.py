import os
import ssl
import smtplib
import json
import datetime
import random
import string
from flask import Blueprint, request, jsonify, current_app
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

notify_bp = Blueprint("notify", __name__)


# ── HELPERS ──────────────────────────────────────────────────────────────────

def _order_number():
    suffix = "".join(random.choices(string.digits, k=4))
    return "SV-" + datetime.datetime.now().strftime("%Y%m%d") + "-" + suffix


def _discount_for(subtotal, total_items):
    if total_items >= 10:
        return subtotal * 0.20, "10+ Items (20% Off)"
    elif total_items >= 7:
        return subtotal * 0.15, "7–9 Items (15% Off)"
    elif total_items >= 5:
        return subtotal * 0.10, "5–6 Items (10% Off)"
    elif total_items >= 3:
        return subtotal * 0.05, "3–4 Items (5% Off)"
    return 0.0, ""


# ── EMAIL SENDER ─────────────────────────────────────────────────────────────

def send_email(subject, body_html, to_addr, attachment_path=None):
    if not to_addr:
        return

    host      = os.getenv("EMAIL_HOST")
    port      = int(os.getenv("EMAIL_PORT", 465))
    user      = os.getenv("EMAIL_USER")
    password  = os.getenv("EMAIL_PASS")
    from_addr = os.getenv("EMAIL_FROM", user)

    msg = MIMEMultipart("mixed")
    msg["From"]    = from_addr
    msg["To"]      = to_addr
    msg["Subject"] = subject

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body_html, "html", "utf-8"))
    msg.attach(alt)

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            attach = MIMEApplication(f.read(), _subtype="pdf")
            attach.add_header("Content-Disposition", "attachment",
                              filename=os.path.basename(attachment_path))
            msg.attach(attach)

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(user, password)
            server.send_message(msg)


# ── PDF RECEIPT ───────────────────────────────────────────────────────────────

TEAL      = colors.HexColor("#0D4A7A")
TEAL_DARK = colors.HexColor("#062840")
GREEN     = colors.HexColor("#26C96F")
GREEN_DK  = colors.HexColor("#1DA85C")
WHITE     = colors.white
SLATE_50  = colors.HexColor("#F8FAFC")
SLATE_100 = colors.HexColor("#F1F5F9")
SLATE_200 = colors.HexColor("#E2E8F0")
SLATE_500 = colors.HexColor("#64748B")
SLATE_900 = colors.HexColor("#0F172A")


def generate_pdf_receipt(order_no, purchase_date, customer, email,
                         cart_items, shipping,
                         discount=0, discount_label="",
                         filename="receipt.pdf"):

    W, H = letter   # 612 × 792 pt
    c = canvas.Canvas(filename, pagesize=letter)

    # ── WHITE PAGE ───────────────────────────────────────────────────────────
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── HEADER BAR ───────────────────────────────────────────────────────────
    HEADER_H = 108
    c.setFillColor(TEAL_DARK)
    c.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)

    logo_path = "static/media/Scout Videography Logo.jpg"
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 36, H - 88,
                    width=130, height=52,
                    preserveAspectRatio=True, mask="auto")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(W - 36, H - 52, "ORDER RECEIPT")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#90B8D4"))
    c.drawRightString(W - 36, H - 68, f"Order  {order_no}")
    c.drawRightString(W - 36, H - 82, purchase_date)

    # Green accent stripe under header
    c.setFillColor(GREEN)
    c.rect(0, H - HEADER_H - 4, W, 4, fill=1, stroke=0)

    y = H - HEADER_H - 26

    # ── CUSTOMER / SHIPPING BLOCK ─────────────────────────────────────────────
    addr    = shipping.get("address") or {}
    s_name  = (shipping.get("name") or customer or "Customer").title()
    phone   = shipping.get("phone") or "—"
    line1   = (addr.get("line1") or "").title()
    city    = (addr.get("city") or "").title()
    country = addr.get("country") or "Jamaica"

    c.setFillColor(SLATE_500)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(36, y, "BILL TO / SHIP TO")
    c.drawRightString(W - 36, y, "CONTACT")
    y -= 14

    c.setFillColor(SLATE_900)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, y, s_name)
    c.setFont("Helvetica", 11)
    c.setFillColor(SLATE_500)
    c.drawRightString(W - 36, y, email or "—")
    y -= 14

    if line1:
        c.drawString(36, y, line1)
        y -= 14
    if city:
        c.drawString(36, y, f"{city}, {country}")
        y -= 14
    c.drawString(36, y, f"Tel: {phone}")
    y -= 28

    # ── DIVIDER ──────────────────────────────────────────────────────────────
    c.setStrokeColor(SLATE_200)
    c.setLineWidth(0.75)
    c.line(36, y, W - 36, y)
    y -= 18

    # ── ITEMS TABLE HEADER ────────────────────────────────────────────────────
    ROW_H = 22
    c.setFillColor(TEAL)
    c.rect(36, y - 5, W - 72, ROW_H, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(46,       y + 5, "ITEM")
    c.drawRightString(365, y + 5, "QTY")
    c.drawRightString(455, y + 5, "UNIT PRICE (JMD)")
    c.drawRightString(W - 36, y + 5, "LINE TOTAL (JMD)")
    y -= ROW_H

    # ── ITEM ROWS ─────────────────────────────────────────────────────────────
    subtotal = 0.0
    for idx, item in enumerate(cart_items):
        name      = item.get("name", "Item")
        qty       = int(item.get("quantity", 1))
        unit_p    = float(item.get("price", 0))
        line_tot  = unit_p * qty
        subtotal += line_tot

        if idx % 2 == 0:
            c.setFillColor(SLATE_100)
            c.rect(36, y - 5, W - 72, ROW_H, fill=1, stroke=0)

        c.setFillColor(SLATE_900)
        c.setFont("Helvetica", 10)
        c.drawString(46,       y + 4, name)
        c.drawRightString(365, y + 4, str(qty))
        c.drawRightString(455, y + 4, f"${unit_p:,.2f}")
        c.drawRightString(W - 36, y + 4, f"${line_tot:,.2f}")
        y -= ROW_H

    y -= 8

    # ── TOTALS SECTION ────────────────────────────────────────────────────────
    c.setStrokeColor(SLATE_200)
    c.line(36, y, W - 36, y)
    y -= 20

    def totals_row(label, value, bold=False, colour=SLATE_900):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11)
        c.setFillColor(SLATE_500)
        c.drawRightString(385, y, label)
        c.setFillColor(colour)
        c.drawRightString(W - 36, y, value)
        y -= 18

    totals_row("Subtotal:", f"${subtotal:,.2f}")

    if discount > 0 and discount_label:
        totals_row(f"Discount ({discount_label}):", f"-${discount:,.2f}", colour=GREEN_DK)

    totals_row("Shipping:", "$0.00")

    total = subtotal - discount
    y -= 6

    # Total highlight bar
    BAR_Y = y - 6
    c.setFillColor(TEAL)
    c.rect(300, BAR_Y, W - 36 - 300, 26, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(385, BAR_Y + 7, "TOTAL (JMD):")
    c.setFillColor(GREEN)
    c.drawRightString(W - 36, BAR_Y + 7, f"${total:,.2f}")
    y = BAR_Y - 24

    # ── FOOTER BAR ────────────────────────────────────────────────────────────
    FOOTER_H = 52
    c.setFillColor(TEAL_DARK)
    c.rect(0, 0, W, FOOTER_H, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, FOOTER_H, W, 3, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(W / 2, FOOTER_H - 18,
                        "Thank you for your purchase — Scout Videography Jamaica")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#90B8D4"))
    c.drawCentredString(W / 2, FOOTER_H - 32,
                        "WhatsApp: 876-809-2519  |  Instagram: @scoutvideoja  |  scoutvideoja.com")

    c.showPage()
    c.save()
    return filename


# ── CUSTOMER HTML EMAIL ───────────────────────────────────────────────────────

def _customer_email_html(order_no, purchase_date, name, email,
                         cart_items, shipping, discount, discount_label):
    addr    = shipping.get("address") or {}
    phone   = shipping.get("phone") or "—"
    line1   = (addr.get("line1") or "").title()
    city    = (addr.get("city") or "").title()
    country = addr.get("country") or "Jamaica"

    subtotal = sum(float(i.get("price", 0)) * int(i.get("quantity", 1))
                   for i in cart_items)
    total = subtotal - discount

    item_rows = ""
    for i in cart_items:
        n   = i.get("name", "Item")
        qty = int(i.get("quantity", 1))
        p   = float(i.get("price", 0))
        item_rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0F172A;">{n}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:center;font-size:14px;color:#64748B;">{qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:14px;color:#64748B;">${p:,.2f}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:14px;font-weight:600;color:#0F172A;">${p*qty:,.2f}</td>
        </tr>"""

    discount_row = ""
    if discount > 0 and discount_label:
        discount_row = f"""
        <tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;font-size:13px;color:#1DA85C;">{discount_label}:</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:700;color:#1DA85C;">-${discount:,.2f}</td>
        </tr>"""

    addr_lines = name
    if line1:
        addr_lines += f"<br>{line1}"
    if city:
        addr_lines += f"<br>{city}, {country}"
    addr_lines += f"<br>Tel: {phone}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Scout Videography Order</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;
                box-shadow:0 4px 20px rgba(0,0,0,0.09);">

    <!-- HEADER -->
    <tr><td style="background:linear-gradient(135deg,#062840 0%,#0D4A7A 100%);padding:28px 32px;">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
        Scout Videography Jamaica
      </p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Order Confirmation</p>
    </td></tr>
    <!-- green stripe -->
    <tr><td style="background:#26C96F;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

    <!-- GREETING -->
    <tr><td style="padding:28px 32px 16px;">
      <p style="margin:0;font-size:17px;color:#0F172A;">Hi <strong>{name}</strong>,</p>
      <p style="margin:12px 0 0;font-size:15px;color:#64748B;line-height:1.7;">
        Thank you for your order! Your payment has been confirmed and your items are being prepared.
        A full PDF receipt is attached to this email.
      </p>
    </td></tr>

    <!-- ORDER META -->
    <tr><td style="padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;">
        <tr>
          <td style="padding:13px 16px;font-size:11px;color:#64748B;font-weight:700;
                     letter-spacing:1px;text-transform:uppercase;">Order Number</td>
          <td style="padding:13px 16px;font-size:13px;color:#0D4A7A;font-weight:700;
                     text-align:right;">{order_no}</td>
        </tr>
        <tr style="border-top:1px solid #E2E8F0;">
          <td style="padding:13px 16px;font-size:11px;color:#64748B;font-weight:700;
                     letter-spacing:1px;text-transform:uppercase;">Date</td>
          <td style="padding:13px 16px;font-size:13px;color:#0F172A;
                     text-align:right;">{purchase_date}</td>
        </tr>
      </table>
    </td></tr>

    <!-- ITEMS TABLE -->
    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;
                text-transform:uppercase;color:#64748B;">Items Ordered</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#0D4A7A;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#fff;
                       font-weight:700;letter-spacing:0.5px;">ITEM</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#fff;font-weight:700;">QTY</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#fff;font-weight:700;">UNIT</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#fff;font-weight:700;">TOTAL</th>
          </tr>
        </thead>
        <tbody>{item_rows}</tbody>
        <tfoot>
          <tr style="background:#F8FAFC;">
            <td colspan="3" style="padding:10px 12px;text-align:right;
                                   color:#64748B;font-size:13px;">Subtotal (JMD):</td>
            <td style="padding:10px 12px;text-align:right;
                       font-weight:600;font-size:13px;">${subtotal:,.2f}</td>
          </tr>
          {discount_row}
          <tr style="background:#F8FAFC;">
            <td colspan="3" style="padding:10px 12px;text-align:right;
                                   color:#64748B;font-size:13px;">Shipping:</td>
            <td style="padding:10px 12px;text-align:right;font-size:13px;">$0.00</td>
          </tr>
          <tr style="background:#0D4A7A;">
            <td colspan="3" style="padding:13px 12px;text-align:right;
                                   color:#fff;font-weight:700;font-size:15px;">TOTAL (JMD):</td>
            <td style="padding:13px 12px;text-align:right;
                       color:#26C96F;font-weight:700;font-size:15px;">${total:,.2f}</td>
          </tr>
        </tfoot>
      </table>
    </td></tr>

    <!-- SHIPPING ADDRESS -->
    <tr><td style="padding:20px 32px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;
                text-transform:uppercase;color:#64748B;">Shipping Address</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:#0F172A;line-height:1.8;">
          {addr_lines}
        </td></tr>
      </table>
    </td></tr>

    <!-- DIVIDER NOTE -->
    <tr><td style="padding:0 32px 24px;">
      <p style="margin:0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">
        Your PDF receipt is attached &bull; Keep it for your records
      </p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#062840;padding:22px 32px;text-align:center;">
      <p style="margin:0 0 8px;color:#fff;font-size:13px;font-weight:600;">
        Questions? We&rsquo;re happy to help.
      </p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);">
        <a href="https://wa.me/18768092519" style="color:#26C96F;text-decoration:none;">
          WhatsApp: 876-809-2519
        </a>
        &nbsp;&bull;&nbsp;
        <a href="https://instagram.com/scoutvideoja" style="color:#26C96F;text-decoration:none;">
          @scoutvideoja
        </a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>"""


# ── NOTIFY CHECKOUT ROUTE ─────────────────────────────────────────────────────

@notify_bp.route("/notify-checkout", methods=["POST"])
def notify_checkout():
    data       = request.get_json() or {}
    cart_items = data.get("cart") or []
    shipping   = data.get("shipping") or {}

    subtotal    = sum(float(i.get("price", 0)) * int(i.get("quantity", 1))
                      for i in cart_items)
    total_items = sum(int(i.get("quantity", 1)) for i in cart_items)
    discount, discount_label = _discount_for(subtotal, total_items)

    name  = (shipping.get("name") or data.get("name") or "Customer").title()
    email = shipping.get("email") or data.get("email")

    order_no      = _order_number()
    purchase_date = datetime.datetime.now().strftime("%d %B %Y")

    pdf_path = generate_pdf_receipt(
        order_no, purchase_date, name, email,
        cart_items, shipping, discount, discount_label,
        filename=f"receipt_{name.replace(' ','_')}_{order_no}.pdf",
    )

    # ── Internal notification (plain text) ───────────────────────────────────
    addr = shipping.get("address") or {}
    items_text = "\n".join(
        "  {} x{}  —  ${:.2f} JMD".format(
            i.get("name", "Item"), i.get("quantity", 1),
            float(i.get("price", 0)) * int(i.get("quantity", 1))
        ) for i in cart_items
    )
    total = subtotal - discount

    host_body = f"""New Order — {order_no}
Date     : {purchase_date}

Customer : {name}
Email    : {email or 'N/A'}
Phone    : {shipping.get('phone', 'N/A')}
Address  : {addr.get('line1', '')} {addr.get('city', '')} {addr.get('country', '')}

Items:
{items_text}

Subtotal : ${subtotal:,.2f} JMD
{"Discount : -${:.2f} JMD ({})".format(discount, discount_label) if discount else ""}
Total    : ${total:,.2f} JMD
"""

    email_ok = True

    host_email = os.getenv("EMAIL_TO")
    if host_email:
        try:
            send_email(
                subject=f"New Order {order_no} — {name}",
                body_html=f"<pre style='font-family:monospace;font-size:13px'>{host_body}</pre>",
                to_addr=host_email,
                attachment_path=pdf_path,
            )
        except Exception as e:
            email_ok = False
            print(f"[notify] Host email failed: {e}")

    # ── Customer receipt (rich HTML) ─────────────────────────────────────────
    if email:
        try:
            html = _customer_email_html(
                order_no, purchase_date, name, email,
                cart_items, shipping, discount, discount_label,
            )
            send_email(
                subject=f"Your Scout Videography Order — {order_no}",
                body_html=html,
                to_addr=email,
                attachment_path=pdf_path,
            )
        except Exception as e:
            email_ok = False
            print(f"[notify] Customer email failed: {e}")

    return jsonify({"ok": email_ok})


# ── STRIPE WEBHOOK ────────────────────────────────────────────────────────────

@notify_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    import stripe
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    payload    = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    if event["type"] == "payment_intent.succeeded":
        intent     = event["data"]["object"]
        shipping   = intent.get("shipping") or {}
        charge     = intent["charges"]["data"][0]
        cust_name  = charge["billing_details"].get("name") or shipping.get("name")
        cust_email = charge["billing_details"].get("email")

        cart_items = json.loads(intent["metadata"].get("cart_json", "[]"))

        with current_app.test_request_context(
            "/notify-checkout", method="POST",
            json={
                "name": cust_name,
                "email": cust_email,
                "cart": cart_items,
                "shipping": {**shipping, "email": cust_email},
            },
        ):
            notify_checkout()

    return jsonify({"status": "success"}), 200


# ── CONTACT FORM ──────────────────────────────────────────────────────────────

@notify_bp.route("/notify-contact", methods=["POST"])
def notify_contact():
    data    = request.get_json() or {}
    name    = data.get("name", "N/A")
    email   = data.get("email", "N/A")
    message = data.get("message", "")

    try:
        send_email(
            subject=f"New Contact Message from {name}",
            body_html=f"<pre style='font-family:monospace'>"
                      f"Name: {name}\nEmail: {email}\n\n{message}</pre>",
            to_addr=os.getenv("EMAIL_TO"),
        )
        return jsonify({"ok": True}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
