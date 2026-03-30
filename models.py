"""
Scout Videography Jamaica — Data Models

Phase 2 schema definitions. These models are NOT active in Phase 1.
To activate:
  1. Uncomment the extensions in extensions.py
  2. Add flask-sqlalchemy, flask-migrate, flask-login to requirements.txt
  3. Run: flask db init && flask db migrate && flask db upgrade
"""

# Phase 2: Uncomment everything below when database is needed
# -----------------------------------------------------------

# from datetime import datetime
# from extensions import db
# from flask_login import UserMixin
# from werkzeug.security import generate_password_hash, check_password_hash
#
#
# class Athlete(UserMixin, db.Model):
#     """User accounts for athletes, parents, and coaches."""
#     __tablename__ = "athletes"
#
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(120), nullable=False)
#     email = db.Column(db.String(120), unique=True, nullable=False)
#     phone = db.Column(db.String(20))  # WhatsApp, +1876 format
#     password_hash = db.Column(db.String(256), nullable=False)
#     date_of_birth = db.Column(db.Date)
#     position = db.Column(db.String(40))  # midfielder, striker, etc.
#     club = db.Column(db.String(120))  # current club or school team
#     parish = db.Column(db.String(60))  # Kingston, St. Andrew, etc.
#     tier = db.Column(db.String(10), default="free")  # free, basic, pro
#     stripe_customer_id = db.Column(db.String(80))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     # Relationships
#     bookings = db.relationship("Booking", backref="athlete", lazy=True)
#     vr_sessions = db.relationship("VRSession", backref="athlete", lazy=True)
#     ai_reports = db.relationship("AIReport", backref="athlete", lazy=True)
#     orders = db.relationship("GearOrder", backref="athlete", lazy=True)
#
#     def set_password(self, password):
#         self.password_hash = generate_password_hash(password)
#
#     def check_password(self, password):
#         return check_password_hash(self.password_hash, password)
#
#     def __repr__(self):
#         return f"<Athlete {self.name}>"
#
#
# class Booking(db.Model):
#     """Service booking requests (videography, VR training, or both)."""
#     __tablename__ = "bookings"
#
#     id = db.Column(db.Integer, primary_key=True)
#     athlete_id = db.Column(db.Integer, db.ForeignKey("athletes.id"), nullable=True)
#     service_type = db.Column(db.String(20), nullable=False)  # videography, vr_training, both, club
#     package = db.Column(db.String(60))  # Single Match, Season, Training Block, etc.
#     match_date = db.Column(db.Date)
#     match_time = db.Column(db.Time)
#     venue = db.Column(db.String(200))
#     status = db.Column(db.String(20), default="pending")  # pending, confirmed, completed, cancelled
#     notes = db.Column(db.Text)
#     source = db.Column(db.String(20), default="website")  # website, whatsapp, instagram
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     def __repr__(self):
#         return f"<Booking {self.id} ({self.service_type})>"
#
#
# class VRSession(db.Model):
#     """Rezzil VR training session data imported from CSV/JSON exports."""
#     __tablename__ = "vr_sessions"
#
#     id = db.Column(db.Integer, primary_key=True)
#     athlete_id = db.Column(db.Integer, db.ForeignKey("athletes.id"), nullable=False)
#     session_date = db.Column(db.DateTime, nullable=False)
#     duration_minutes = db.Column(db.Integer, default=45)
#     drill_category = db.Column(db.String(20))  # cognitive, technical, tactical, mixed
#     reaction_time_ms = db.Column(db.Float)
#     decision_accuracy = db.Column(db.Float)  # 0-100 percentage
#     peripheral_score = db.Column(db.Float)
#     overall_score = db.Column(db.Float)
#     raw_data_json = db.Column(db.Text)  # Full Rezzil export preserved
#     notes = db.Column(db.Text)
#
#     def __repr__(self):
#         return f"<VRSession {self.id} athlete={self.athlete_id}>"
#
#
# class AIReport(db.Model):
#     """AI-generated performance analysis reports."""
#     __tablename__ = "ai_reports"
#
#     id = db.Column(db.Integer, primary_key=True)
#     athlete_id = db.Column(db.Integer, db.ForeignKey("athletes.id"), nullable=False)
#     source_type = db.Column(db.String(20))  # veo_footage, vr_session, combined
#     source_ids = db.Column(db.String(200))  # Comma-separated IDs
#     summary = db.Column(db.Text)
#     strengths_json = db.Column(db.Text)
#     weaknesses_json = db.Column(db.Text)
#     recommendations_json = db.Column(db.Text)
#     model_version = db.Column(db.String(40))
#     tokens_used = db.Column(db.Integer)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     def __repr__(self):
#         return f"<AIReport {self.id} athlete={self.athlete_id}>"
#
#
# class GearOrder(db.Model):
#     """Gear shop orders — mirrors Stripe metadata locally."""
#     __tablename__ = "gear_orders"
#
#     id = db.Column(db.Integer, primary_key=True)
#     athlete_id = db.Column(db.Integer, db.ForeignKey("athletes.id"), nullable=True)
#     stripe_payment_intent_id = db.Column(db.String(80), nullable=False)
#     items_json = db.Column(db.Text)
#     subtotal_jmd = db.Column(db.Integer)  # JMD cents
#     discount_jmd = db.Column(db.Integer, default=0)
#     total_jmd = db.Column(db.Integer)
#     discount_label = db.Column(db.String(60))
#     shipping_name = db.Column(db.String(120))
#     shipping_address = db.Column(db.Text)
#     status = db.Column(db.String(20), default="pending")  # pending, paid, shipped, delivered
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     def __repr__(self):
#         return f"<GearOrder {self.id} total={self.total_jmd}>"
