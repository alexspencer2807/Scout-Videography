import os
from flask import Flask
from dotenv import load_dotenv

load_dotenv()


def create_app(config_name=None):
    app = Flask(__name__)

    # Load config
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "default")
    from config import config as config_map
    app.config.from_object(config_map.get(config_name, config_map["default"]))

    # Phase 2: Initialise extensions
    # from extensions import db, login_manager, migrate
    # db.init_app(app)
    # login_manager.init_app(app)
    # migrate.init_app(app, db)

    # Register blueprints
    from blueprints.pages import pages_bp
    from blueprints.shop import shop_bp
    from blueprints.booking import booking_bp
    from blueprints.analyst import analyst_bp
    from blueprints.auth import auth_bp
    from blueprints.notify import notify_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(analyst_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(notify_bp)

    return app


# Create the app instance for Gunicorn: gunicorn app:app
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
