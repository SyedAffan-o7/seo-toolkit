# Test Data for SEO Toolkit

## 1. RANK CHECKER (/rank-checker)
**Purpose:** Check where your website ranks for a specific keyword

### Test Case 1: Found in Top 10
- **Keyword:** `best project management software`
- **Target URL:** `https://asana.com`
- **Location:** United States
- **Device:** Desktop
- **Expected:** Should show position #1-10 for Asana

### Test Case 2: Not Found (Content Gap Analysis)
- **Keyword:** `best crm software 2024`
- **Target URL:** `https://example-test-domain.com`
- **Location:** United States
- **Device:** Desktop
- **Expected:** "Not found in top 10" with full SERP results shown

### Test Case 3: Local Business
- **Keyword:** `best pizza in brooklyn`
- **Target URL:** `https://grimaldispizza.com`
- **Location:** United States
- **Device:** Mobile
- **Expected:** Local pack results with position

---

## 2. COMPARE URLs (/compare)
**Purpose:** Compare multiple domains/URLs for one keyword to see who ranks

### Test Case 1: SaaS Competitors
- **Keyword:** `email marketing software`
- **URLs to Compare:**
  1. `https://mailchimp.com`
  2. `https://convertkit.com`
  3. `https://brevo.com`
  4. `https://klaviyo.com`
- **Location:** United States
- **Device:** Desktop
- **Expected:** Shows which of these rank and their positions

### Test Case 2: E-commerce
- **Keyword:** `wireless headphones`
- **URLs to Compare:**
  1. `https://amazon.com`
  2. `https://bestbuy.com`
  3. `https://target.com`
- **Location:** United States
- **Device:** Desktop
- **Expected:** Shows ranking positions for each e-commerce site

### Test Case 3: India Geo Test
- **Keyword:** `buy running shoes`
- **URLs to Compare:**
  1. `https://flipkart.com`
  2. `https://amazon.in`
  3. `https://myntra.com`
- **Location:** India
- **Device:** Mobile
- **Expected:** India-specific results

---

## 3. SEO AUDITOR (/auditor)
**Purpose:** Compare YOUR page vs a COMPETITOR for on-page SEO audit

### Test Case 1: Blog Post Comparison
- **Target Keyword:** `how to start a blog`
- **Your Page:** `https://neilpatel.com/blog/how-to-start-a-blog/` (or any blog URL)
- **Competitor Page:** `https://www.wpbeginner.com/start-a-wordpress-blog/`
- **Expected:** Score comparison, suggestions for title, meta, headings, content length, schema markup, etc.

### Test Case 2: Product Page
- **Target Keyword:** `best noise cancelling headphones`
- **Your Page:** `https://www.cnet.com/tech/mobile/best-noise-canceling-headphones/` (or similar)
- **Competitor Page:** `https://www.rtings.com/headphones/reviews/best/noise-canceling`
- **Expected:** Product-focused SEO audit with schema markup analysis

### Test Case 3: Service Page
- **Target Keyword:** `digital marketing agency`
- **Your Page:** `https://disruptiveadvertising.com` (or any agency site)
- **Competitor Page:** `https://www.webfx.com`
- **Expected:** Local/service business SEO audit

---

## 4. RANK TRACKER (/tracker)
**Purpose:** Create projects, add keywords, track over time, add competitors

### Step-by-Step Test Flow:

#### Step 1: Create a Project
- **Project Name:** `E-commerce SEO Campaign`
- **Domain:** `yourstore.com` (use your actual domain when testing)

#### Step 2: Add Keywords to Track
**Keyword 1:**
- **Keyword:** `buy running shoes online`
- **Target URL:** `https://yourstore.com/running-shoes`
- **Geo:** United States
- **Device:** Desktop

**Keyword 2:**
- **Keyword:** `best yoga mats 2024`
- **Target URL:** `https://yourstore.com/yoga-mats`
- **Geo:** United States
- **Device:** Mobile

**Keyword 3:**
- **Keyword:** `organic protein powder`
- **Target URL:** `https://yourstore.com/protein`
- **Geo:** United Kingdom
- **Device:** Desktop

#### Step 3: Add Competitors
- **Competitor 1:** `amazon.com` (label: "Amazon")
- **Competitor 2:** `walmart.com` (label: "Walmart")
- **Competitor 3:** `target.com` (label: "Target")

#### Step 4: Run Snapshot
- Click "Run Snapshot" button
- This checks current rankings and saves to database
- Run multiple snapshots over time to build trend chart

---

## 5. SERP EXPLORER (/explorer)
**Purpose:** Placeholder page - links to Rank Checker and Compare URLs

**Note:** This is currently a placeholder. Use the links to:
- Rank Checker for single URL checks
- Compare URLs for multi-URL comparison

---

## 6. SETTINGS (/settings)
**Purpose:** Configure app settings

**Typical Settings:**
- SERP Provider: `mock` (default) or `serpapi` (requires API key)
- Default Geo: `us`
- Default Device: `desktop`

---

## Quick Test Checklist

| Feature | Test Data | Expected Result |
|---------|-----------|-----------------|
| Rank Checker | Keyword: `best crm`, URL: `salesforce.com` | Shows position if ranked |
| Compare URLs | 3-4 competitor domains | Shows which rank where |
| SEO Auditor | Your URL + Competitor URL + Keyword | Score comparison + suggestions |
| Rank Tracker | Create project → Add keyword → Run snapshot | Trend chart appears |
| Export CSV | Compare page results | CSV downloads with positions |

---

## Using Mock Provider (Default)

Since you're using `SERP_PROVIDER=mock`, the results are simulated:
- Well-known domains (amazon.com, salesforce.com) will show as ranking
- Random/test domains will show "Not found"
- The mock data helps you test the UI/UX without API costs

## Switch to Real Data (SerpAPI)

1. Sign up at https://serpapi.com
2. Get API key
3. Set in Vercel env: `SERP_API_KEY=your_key`
4. Change `SERP_PROVIDER=serpapi`
5. Redeploy

Then all searches will use real Google SERP data.
