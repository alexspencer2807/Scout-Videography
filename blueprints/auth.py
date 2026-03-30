from flask import Blueprint, render_template, request, redirect, url_for, flash

auth_bp = Blueprint("auth", __name__)

# Phase 2: Authentication routes
# @auth_bp.route("/login", methods=["GET", "POST"])
# def login():
#     if request.method == "POST":
#         # Validate credentials, create session
#         pass
#     return render_template("auth/login.html")
#
# @auth_bp.route("/register", methods=["GET", "POST"])
# def register():
#     if request.method == "POST":
#         # Create athlete account
#         pass
#     return render_template("auth/register.html")
#
# @auth_bp.route("/logout")
# def logout():
#     # End session
#     return redirect(url_for("pages.home"))
#
# @auth_bp.route("/profile")
# def profile():
#     return render_template("auth/profile.html")
