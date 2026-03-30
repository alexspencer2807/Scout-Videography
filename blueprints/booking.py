from flask import Blueprint, render_template, request, jsonify

booking_bp = Blueprint("booking", __name__)

@booking_bp.route("/contact")
def contact():
    return render_template("contact.html")

# Phase 2: REST API for booking management
# @booking_bp.route("/api/bookings", methods=["POST"])
# def create_booking():
#     data = request.json
#     # Validate and save to database
#     return jsonify({"status": "ok", "message": "Booking received"})
