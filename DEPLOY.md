# Deploying Scout Videography to Google Cloud Run

Step-by-step guide to go from zero to live at scoutvideoja.com.

## Prerequisites

- Google Workspace account (you have this)
- scoutvideoja.com domain (you own this)
- Stripe account (for payments)
- GitHub account (for code)

## Part 1: Install the Tools (10 minutes)

### 1.1 Install Google Cloud CLI

**Mac:**
```bash
brew install --cask google-cloud-sdk
```

**Windows:**
Download from https://cloud.google.com/sdk/docs/install

**Verify it worked:**
```bash
gcloud --version
```

### 1.2 Log in to Google Cloud

```bash
gcloud auth login
```

This opens your browser. Sign in with your Google Workspace account (the same one that owns scoutvideoja.com).

## Part 2: Create a Google Cloud Project (5 minutes)

### 2.1 Create the project

```bash
gcloud projects create scout-videography --name="Scout Videography"
gcloud config set project scout-videography
```

### 2.2 Enable billing

Go to https://console.cloud.google.com/billing and link your project to a billing account. Cloud Run has a generous free tier — you likely won't be charged anything at your traffic level.

### 2.3 Enable required services

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Part 3: Set Up Secrets (10 minutes)

Instead of .env files, Cloud Run uses Secret Manager for sensitive values.

### 3.1 Create your secrets

```bash
# Core
echo -n "your_random_secret_key_here" | gcloud secrets create FLASK_SECRET_KEY --data-file=-

# Stripe (get these from https://dashboard.stripe.com/apikeys)
echo -n "sk_live_YOUR_KEY" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "pk_live_YOUR_KEY" | gcloud secrets create STRIPE_PUBLIC_KEY --data-file=-

# Email (Google Workspace)
echo -n "smtp.gmail.com" | gcloud secrets create EMAIL_HOST --data-file=-
echo -n "587" | gcloud secrets create EMAIL_PORT --data-file=-
echo -n "you@scoutvideoja.com" | gcloud secrets create EMAIL_USER --data-file=-
echo -n "your_app_password" | gcloud secrets create EMAIL_PASS --data-file=-
echo -n "you@scoutvideoja.com" | gcloud secrets create EMAIL_FROM --data-file=-
```

### 3.2 Generate a Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in with your Google Workspace account
3. Select "Mail" and "Other (Custom name)" → type "Scout Website"
4. Click Generate — copy the 16-character password
5. Use that as your EMAIL_PASS secret above (not your regular Gmail password)

## Part 4: Push Code to GitHub (5 minutes)

```bash
cd scout-build
git init
git add .
git commit -m "Scout Videography — Cloud Run deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scout-videography.git
git push -u origin main
```

## Part 5: Deploy to Cloud Run (10 minutes)

### 5.1 First deployment (manual)

From inside the scout-build folder:

```bash
gcloud run deploy scout-videography \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080 \
  --set-secrets "FLASK_SECRET_KEY=FLASK_SECRET_KEY:latest" \
  --set-secrets "STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest" \
  --set-secrets "STRIPE_PUBLIC_KEY=STRIPE_PUBLIC_KEY:latest" \
  --set-secrets "EMAIL_HOST=EMAIL_HOST:latest" \
  --set-secrets "EMAIL_PORT=EMAIL_PORT:latest" \
  --set-secrets "EMAIL_USER=EMAIL_USER:latest" \
  --set-secrets "EMAIL_PASS=EMAIL_PASS:latest" \
  --set-secrets "EMAIL_FROM=EMAIL_FROM:latest"
```

Cloud Run will:
1. Build your Docker image
2. Push it to Container Registry
3. Deploy it
4. Give you a URL like `https://scout-videography-XXXXX-uc.a.run.app`

**Test that URL in your browser.** You should see the full Scout Videography site.

### 5.2 Set up automatic deploys (optional but recommended)

Connect GitHub to Cloud Build so every push auto-deploys:

1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click "Connect Repository"
3. Select GitHub → authorize → select your scout-videography repo
4. Click "Create Trigger"
5. Set:
   - Name: `deploy-on-push`
   - Event: Push to branch `main`
   - Configuration: Cloud Build configuration file → `cloudbuild.yaml`
6. Click Create

Now every `git push` to main automatically rebuilds and deploys.

## Part 6: Connect Your Domain (15 minutes)

### 6.1 Add domain to Cloud Run

```bash
gcloud run domain-mappings create \
  --service scout-videography \
  --domain scoutvideoja.com \
  --region us-central1
```

This will show you DNS records to add.

Also add www:
```bash
gcloud run domain-mappings create \
  --service scout-videography \
  --domain www.scoutvideoja.com \
  --region us-central1
```

### 6.2 Update DNS at Squarespace

1. Go to https://domains.squarespace.com
2. Sign in with your Google account
3. Click scoutvideoja.com → DNS → DNS Settings
4. Delete any existing A or CNAME records for @ and www
5. Add the records that Cloud Run told you to add (typically):

**For scoutvideoja.com (root):**
| Type | Host | Data |
|------|------|------|
| A | @ | 216.239.32.21 |
| A | @ | 216.239.34.21 |
| A | @ | 216.239.36.21 |
| A | @ | 216.239.38.21 |

**For www.scoutvideoja.com:**
| Type | Host | Data |
|------|------|------|
| CNAME | www | ghs.googlehosted.com |

6. Save and wait 10-30 minutes for DNS propagation
7. Cloud Run will automatically provision an SSL certificate

### 6.3 Verify

Open https://scoutvideoja.com in your browser. You should see your full Scout Videography platform with the green padlock (HTTPS).

## Part 7: Post-Deployment Checklist

After the site is live, do these:

- [ ] Test every page: /, /services, /train, /analyse, /portfolio, /products, /about, /contact
- [ ] Test the hamburger menu on mobile
- [ ] Test the AI Analyst chat (demo mode)
- [ ] Test Add to Cart on the shop
- [ ] Replace WhatsApp placeholder number (18761234567) with your real number
- [ ] Fill in VR training prices on /train ($XX → real JMD prices)
- [ ] Fill in videography prices on /services ($XX → real JMD prices)
- [ ] Submit sitemap: go to https://search.google.com/search-console and add scoutvideoja.com
- [ ] Set up Google Business Profile at https://business.google.com
- [ ] Replace portfolio video placeholders with YouTube/Vimeo embeds from @scoutvideoja

## Useful Commands

```bash
# View logs
gcloud run services logs read scout-videography --region us-central1

# Update a secret
echo -n "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy (after updating secrets)
gcloud run services update scout-videography --region us-central1

# Check status
gcloud run services describe scout-videography --region us-central1

# View current URL
gcloud run services describe scout-videography --region us-central1 --format="value(status.url)"
```

## Monthly Costs (Estimated)

| Service | Cost |
|---------|------|
| Cloud Run | Free (2M requests/month free tier) |
| Container Registry | Free (0.5GB free) |
| Secret Manager | Free (10K accesses/month free) |
| Domain | Already paid (expires Jan 2027) |
| Email | Already paid (Google Workspace) |
| Stripe | 2.9% + $0.30 per transaction |
| SSL certificate | Free (auto-provisioned) |
| **Total fixed cost** | **$0/month** at current traffic |
