# Scout Videography Jamaica

**Record. Analyse. Train. Repeat.**

Full-cycle athlete development platform for soccer players in Kingston & St. Andrew, Jamaica.

## Four Pillars

| Pillar | Technology | Purpose |
|--------|-----------|---------|
| Record | Veo Camera | AI-powered match recording and highlight reels |
| Train | HTC Vive Pro + Rezzil | Immersive VR cognitive and technical training |
| Analyse | Anthropic AI | Performance analysis connecting footage to training |
| Gear | Stripe Shop | Premium socks, shin guards, and grip equipment |

## Stack

- **Backend:** Python / Flask (blueprint architecture)
- **Frontend:** HTML5 + CSS3 + vanilla JS (Kickoff theme)
- **Payments:** Stripe (PaymentIntent API, JMD currency)
- **AI:** Anthropic API (Phase 2)
- **Database:** SQLAlchemy + PostgreSQL (Phase 2)
- **Hosting:** Google Cloud Run
- **Domain:** scoutvideoja.com (Squarespace DNS)
- **Email:** Google Workspace SMTP

## Local Development

```bash
pip install -r requirements.txt
cp .env.example .env   # Add your keys
python app.py           # http://localhost:8000
```

## Production Deployment (Google Cloud Run)

See **DEPLOY.md** for the full step-by-step guide.

Quick deploy:
```bash
gcloud run deploy scout-videography --source . --region us-central1 --allow-unauthenticated
```

## Routes

| Route | Blueprint | Page |
|-------|-----------|------|
| `/` | pages | Homepage — hero, development loop, four pillars |
| `/services` | pages | Veo videography — packages and pricing |
| `/train` | pages | VR Training — Rezzil + Vive Pro |
| `/analyse` | analyst | AI Analyst — chat widget, upload, freemium |
| `/portfolio` | pages | Video gallery — highlight reels |
| `/products` | shop | Gear Shop — socks, shin guards, grip socks |
| `/about` | pages | Company story |
| `/contact` | booking | Book a Session — form + WhatsApp |
| `/checkout` | shop | Stripe checkout |
| `/faq` | pages | FAQ |
| `/shipping` | pages | Shipping & Returns |

## Architecture

```
scout-videography/
├── app.py                 # App factory
├── config.py              # Environment config
├── Dockerfile             # Cloud Run container
├── cloudbuild.yaml        # Auto-deploy from GitHub
├── DEPLOY.md              # Full deployment guide
├── extensions.py          # Flask extension stubs (Phase 2)
├── models.py              # SQLAlchemy models (Phase 2)
├── blueprints/
│   ├── pages.py           # Static pages
│   ├── shop.py            # Products, checkout, Stripe
│   ├── booking.py         # Contact / booking
│   ├── analyst.py         # AI Analyst + system prompt
│   ├── auth.py            # Login / register (Phase 2)
│   └── notify.py          # Email, webhooks, receipts
├── templates/
│   ├── base.html          # Shared layout
│   ├── partials/          # Header, footer, WhatsApp
│   └── [page].html        # Individual pages
├── static/
│   ├── css/               # Kickoff theme styles
│   ├── js/                # Cart, checkout, analyst widget, etc.
│   └── media/             # Product images, logo
└── requirements.txt
```

## Instagram

[@scoutvideoja](https://instagram.com/scoutvideoja)
