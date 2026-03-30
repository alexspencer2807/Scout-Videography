from flask import Blueprint, render_template, send_from_directory, current_app

pages_bp = Blueprint("pages", __name__)

@pages_bp.route("/")
def home():
    return render_template("index.html")

@pages_bp.route("/about")
def about():
    return render_template("about.html")

@pages_bp.route("/train")
def train():
    return render_template("train.html")

@pages_bp.route("/services")
def services():
    return render_template("services.html")

@pages_bp.route("/portfolio")
def portfolio():
    return render_template("portfolio.html")

@pages_bp.route("/faq")
def faq():
    return render_template("faq.html")

@pages_bp.route("/shipping")
def shipping():
    return render_template("shipping.html")

@pages_bp.route("/sitemap.xml")
def sitemap():
    return send_from_directory(current_app.static_folder, "sitemap.xml", mimetype="application/xml")

@pages_bp.route("/robots.txt")
def robots():
    return "User-agent: *\nAllow: /\nSitemap: https://scoutvideoja.com/sitemap.xml\n", 200, {"Content-Type": "text/plain"}
