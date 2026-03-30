import os
import json
import stripe
from flask import Blueprint, render_template, request, jsonify

shop_bp = Blueprint("shop", __name__)

@shop_bp.route("/products")
def products():
    return render_template("products.html")

@shop_bp.route("/checkout")
def checkout():
    return render_template("checkout.html", stripe_public_key=os.getenv("STRIPE_PUBLIC_KEY"))

@shop_bp.route("/create-payment-intent", methods=["POST"])
def create_payment_intent():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    data = request.json
    cart = data.get("cart", [])
    shipping = data.get("shipping", {})
    customer_email = data.get("email")

    subtotal = sum(float(i["price"]) * int(i["quantity"]) for i in cart)
    total_items = sum(int(i["quantity"]) for i in cart)

    discount_amount = 0
    discount_label = ""

    if total_items >= 10:
        discount_amount = subtotal * 0.20
        discount_label = "10+ Items Discount (20% Off)"
    elif total_items >= 7:
        discount_amount = subtotal * 0.15
        discount_label = "7-9 Items Discount (15% Off)"
    elif total_items >= 5:
        discount_amount = subtotal * 0.10
        discount_label = "5-6 Items Discount (10% Off)"
    elif total_items >= 3:
        discount_amount = subtotal * 0.05
        discount_label = "3-4 Items Discount (5% Off)"

    discounted_total = max(subtotal - discount_amount, 0)
    total_amount = discounted_total
    amount_cents = int(total_amount * 100)
    items_summary = ", ".join([f"{i['name']} x{i['quantity']}" for i in cart])

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="jmd",
        payment_method_types=["card"],
        shipping=shipping,
        metadata={
            "items": items_summary,
            "items_count": total_items,
            "discount_label": discount_label,
            "discount_amount": f"{discount_amount:.2f}",
            "final_price": f"{total_amount:.2f}",
            "customer_email": customer_email,
            "cart_json": json.dumps(cart),
        },
    )
    return jsonify({"client_secret": intent.client_secret})
