import os

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

    # Database (Phase 2)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///scout.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Email
    EMAIL_HOST = os.getenv("EMAIL_HOST")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", 465))
    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASS = os.getenv("EMAIL_PASS")
    EMAIL_FROM = os.getenv("EMAIL_FROM")

    # AI Analyst rate limits (messages per day)
    AI_FREE_LIMIT = 5
    AI_BASIC_LIMIT = 20
    AI_PRO_LIMIT = 9999


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
