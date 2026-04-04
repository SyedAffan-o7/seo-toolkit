# Deployment Guide - Free Hosting with Neon

## 1. Database Setup (Neon - Free Tier)

### Step 1: Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub
3. Click "Create Project"
4. Name: `seo-toolkit`
5. Region: Choose closest to your users
6. Click "Create Project"

### Step 2: Get Connection String
1. In Neon Dashboard, click on your project
2. Click "Connect" button (top right)
3. Select **"Prisma"** from the dropdown
4. Copy the connection string with pooled mode:

**Format:**
```
postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require&pgbouncer=true
```

**Example:**
```
postgresql://seo-toolkit_owner:npg_password@ep-cool-snow-123.us-east-1.aws.neon.tech/seo-toolkit?sslmode=require&pgbouncer=true&connect_timeout=30
```

**Important:** Use the pooled connection string (has `pgbouncer=true`) for serverless deployments.

## 2. Frontend Hosting (Vercel - Free Tier)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Deploy
```bash
cd d:\A_personal\seo_keyword\CascadeProjects\2048
vercel
```

### Step 3: Set Environment Variables
After first deploy, go to:
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | Your Neon pooled connection string | Production |
| `DIRECT_URL` | Your Neon unpooled connection string (for migrations) | Production |
| `SERP_API_KEY` | Your SerpAPI key (optional) | Production |
| `SERP_PROVIDER` | `mock` or `serpapi` | Production |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (e.g., `https://seo-toolkit.vercel.app`) | Production |

### Step 4: Run Database Migration
```bash
# Install Prisma globally (if not already)
npm i -g prisma

# Set DATABASE_URL temporarily and push schema
set DATABASE_URL="your-neon-unpooled-connection-string"
npx prisma db push
```

**Note:** Use the unpooled connection for migrations (without `pgbouncer=true`).

### Step 5: Redeploy
```bash
vercel --prod
```

## Free Tier Limits

| Service | Free Limit |
|---------|------------|
| Vercel | 100GB bandwidth, 10K serverless invocations/day |
| Neon | 500MB storage, 190 compute hours/month (~6 hours/day), 3 projects |

## Quick Deploy Commands

```bash
# 1. Create Neon project at https://neon.tech
# 2. Copy connection strings

# 3. Deploy to Vercel
npm i -g vercel
vercel

# 4. Add environment variables in Vercel dashboard

# 5. Push database schema
set DATABASE_URL="your-neon-connection"
npx prisma db push

# 6. Redeploy
vercel --prod
```

## One-Click Deploy

After pushing to GitHub, use this button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSyedAffan-o7%2Fseo-toolkit)

**Note:** You'll still need to manually add the `DATABASE_URL` environment variable in Vercel dashboard after deployment.

## Troubleshooting

**Connection Issues:**
- Make sure you're using the pooled connection string with `pgbouncer=true` for the app
- Use unpooled connection for Prisma migrations
- Neon automatically handles SSL - no extra config needed

**Cold Starts:**
- Neon has auto-suspend after 5 min of inactivity (free tier)
- First request after idle may take 1-2 seconds to wake up the database
