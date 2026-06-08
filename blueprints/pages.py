from flask import Blueprint, render_template, send_from_directory, current_app, request, jsonify

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

@pages_bp.route("/worldcup")
def worldcup():
    return render_template("worldcup.html")


@pages_bp.route("/api/worldcup/register", methods=["POST"])
def worldcup_register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    instagram = (data.get("instagram") or "").strip()

    # For now, log it. Phase 2: persist to the database.
    print(f"World Cup registration: {name} | {email} | {instagram}")

    # Best-effort email notification to the host (never block the response on it).
    try:
        from blueprints.notify import send_email
        import os
        host_email = os.getenv("EMAIL_TO") or "spencerdm@scoutvideoja.com"
        send_email(
            subject=f"New World Cup Fan Zone registration — {name or 'Unknown'}",
            body_html=(
                "<pre style='font-family:monospace;font-size:13px'>"
                f"Name     : {name}\n"
                f"Email    : {email}\n"
                f"Instagram: {instagram}</pre>"
            ),
            to_addr=host_email,
        )
    except Exception as e:
        print(f"[worldcup] notification email skipped: {e}")

    return jsonify({"status": "ok"})


@pages_bp.route("/sitemap.xml")
def sitemap():
    return send_from_directory(current_app.static_folder, "sitemap.xml", mimetype="application/xml")

@pages_bp.route("/robots.txt")
def robots():
    return "User-agent: *\nAllow: /\nSitemap: https://scoutvideoja.com/sitemap.xml\n", 200, {"Content-Type": "text/plain"}
