# Membership Plan & Subscription System

## Executive Summary

This document outlines a comprehensive membership and subscription system for citavErs, transforming it from a free local-first application to a sustainable SaaS model while maintaining its core values of data ownership and privacy.

**Status:** Planning Phase  
**Target Launch:** TBD  
**Current Focus:** Define tiers, features, and pricing structure

---

## User Tiers Overview

### 1. Guest (Not Registered)
**Description:** Users who haven't created an account  
**Access:** Local-only functionality  
**Limitations:** No cloud sync, no multi-device access

### 2. Free (Registered, Not Authenticated)
**Description:** Users who registered but haven't verified email  
**Access:** Limited cloud features  
**Limitations:** Very restricted PDF uploads, paper limits, no cloud sync

### 3. Free (Registered, Authenticated)
**Description:** Email-verified free users  
**Access:** Basic cloud sync  
**Limitations:** Limited PDF uploads, paper limits, basic features

### 4. Premium (Paid)
**Description:** Paid subscribers  
**Access:** Full features, increased limits  
**Benefits:** Unlimited papers, larger PDFs, priority support

### 5. Admin
**Description:** System administrators  
**Access:** No limits, all features  
**Purpose:** Internal team, system management

### 6. Tester/Beta
**Description:** Early adopters, beta testers  
**Access:** Premium features during testing period  
**Purpose:** Feedback, bug testing, feature validation

### 7. Gifted Premium
**Description:** Users granted premium access (promotions, referrals, etc.)  
**Access:** Premium features  
**Limitations:** TBD - may have restrictions on certain premium-only features

---

## Detailed Tier Specifications

### Tier 1: Guest (Not Registered)

**Target Users:** Casual users, privacy-focused researchers  
**Business Goal:** Provide value, encourage registration

**Features:**
- ✅ Local-only paper management (unlimited)
- ✅ Full PDF storage locally (IndexedDB)
- ✅ All local features (search, tags, notes, collections, annotations)
- ✅ Export/Import functionality
- ✅ Offline-first operation
- ❌ Cloud sync (not available)
- ❌ Multi-device access
- ❌ Backup/restore from cloud
- ❌ Shared collections/features

**Limits:**
- **Papers:** Unlimited (local storage only)
- **PDF Size:** Limited by browser storage (typically 5-10GB total)
- **Collections:** Unlimited (local)
- **Annotations:** Unlimited (local)

**Registration Prompt Strategy:**
- Show non-intrusive banner: "Sign up to sync across devices"
- Highlight: "Your data stays local - we never see it"
- Offer: "Free account - verify email to enable cloud sync"

---

### Tier 2: Free (Registered, Not Authenticated)

**Target Users:** Registered users who haven't verified email  
**Business Goal:** Encourage email verification, reduce abuse

**Features:**
- ✅ All Guest features
- ✅ Account created (user ID, email stored)
- ✅ Email verification pending state
- ❌ Cloud sync (blocked until verified)
- ❌ Cloud features
- ❌ Large PDF uploads

**Limits:**
- **Papers:** 50 maximum
- **PDF Size:** 2MB per file
- **Total Storage:** 50MB
- **Collections:** 5 maximum
- **Verification Emails:** 3 attempts per hour

**Verification Prompt Strategy:**
- Prominent banner: "Verify your email to unlock cloud sync"
- Benefits shown: "Access from any device", "Cloud backup", "Unlimited papers"
- Remind: After 7 days, enforce stricter limits

**Migration Path:**
- Automatically upgrade to Tier 3 upon email verification

---

### Tier 3: Free (Registered, Authenticated)

**Target Users:** Email-verified free users  
**Business Goal:** Provide value, showcase premium benefits, encourage upgrades

**Features:**
- ✅ All Guest features
- ✅ Cloud sync enabled
- ✅ Multi-device access
- ✅ Cloud backup/restore
- ✅ Basic sync features
- ✅ Paper network graph
- ✅ Command palette
- ✅ Keyboard shortcuts
- ❌ Advanced premium features

**Limits:**
- **Papers:** 200 maximum
- **PDF Size:** 5MB per file
- **Total Storage:** 500MB
- **Collections:** 20 maximum
- **Sync Frequency:** Every 5 minutes (periodic sync)
- **API Rate Limit:** 100 requests per 15 minutes
- **Devices:** 3 simultaneous devices
- **Export Formats:** JSON only (no premium formats)

**Premium Upgrade Prompts:**
- Show after adding 150th paper: "You've added 150 papers! Upgrade to unlimited"
- Show when uploading large PDF: "Upgrade to upload PDFs up to 50MB"
- Show when reaching storage limit: "Get 10GB storage with Premium"
- Non-intrusive banner in settings: "Unlock Premium features"

**Migration Path:**
- Can upgrade to Tier 4 (Premium) anytime
- Can be granted Tier 6 (Tester) or Tier 7 (Gifted Premium)

---

### Tier 4: Premium (Paid)

**Target Users:** Power users, researchers with large libraries, professional users  
**Business Goal:** Primary revenue source

**Features:**
- ✅ All Free (Authenticated) features
- ✅ Unlimited papers
- ✅ Larger PDF uploads
- ✅ Increased storage
- ✅ Priority sync (immediate)
- ✅ Advanced export formats
- ✅ Bulk operations
- ✅ API access (if implemented)
- ✅ Priority support
- ✅ Early access to new features

**Limits:**
- **Papers:** Unlimited
- **PDF Size:** 50MB per file
- **Total Storage:** 10GB
- **Collections:** Unlimited
- **Sync Frequency:** Immediate (on-demand sync)
- **API Rate Limit:** 1000 requests per 15 minutes
- **Devices:** Unlimited simultaneous devices
- **Export Formats:** JSON, RIS, BibTeX, CSV, Markdown

**Pricing Considerations:**
- **Monthly:** $9.99/month
- **Yearly:** $99.99/year (save 17%)
- **Student:** $4.99/month (50% discount, requires verification)
- **Academic:** Special pricing for institutions

**Payment Methods:**
- Credit card (Stripe)
- PayPal
- Annual subscription

**Cancellation Policy:**
- Cancel anytime
- Pro-rated refund (if within 30 days)
- Access continues until billing period ends
- Data remains accessible for 90 days after cancellation
- Automatic downgrade to Free tier after 90 days

**Migration Path:**
- Upgrade from Tier 3 (Free Authenticated)
- Downgrade to Tier 3 if subscription cancelled
- Can be granted Admin or Tester roles

---

### Tier 5: Admin

**Target Users:** Internal team, system administrators  
**Business Goal:** Full system access for maintenance and support

**Features:**
- ✅ All Premium features
- ✅ System management tools
- ✅ User management (view users, grant premium, etc.)
- ✅ Analytics access
- ✅ System configuration
- ✅ Debug tools
- ✅ No rate limits
- ✅ Unlimited everything

**Limits:**
- **Papers:** Unlimited
- **PDF Size:** Unlimited
- **Total Storage:** Unlimited
- **Everything:** Unlimited

**Access Control:**
- Manual assignment only
- Requires super admin approval
- IP whitelisting (optional)
- 2FA required
- Activity logging

**Use Cases:**
- Support team resolving issues
- Developers testing features
- Granting premium to users
- System monitoring
- Database maintenance

---

### Tier 6: Tester/Beta

**Target Users:** Early adopters, beta testers, community contributors  
**Business Goal:** Product validation, community engagement, feedback collection

**Features:**
- ✅ All Premium features (during testing period)
- ✅ Access to beta features
- ✅ Early feature previews
- ✅ Beta testing dashboard
- ✅ Direct feedback channel
- ✅ Bug reporting tools
- ✅ Feature voting/requests

**Limits:**
- **Papers:** Unlimited (during test period)
- **PDF Size:** 50MB per file
- **Total Storage:** 10GB
- **Test Period:** 3-6 months (configurable)
- **Beta Features:** May be unstable/unpolished

**Grant Criteria:**
- Active community contributors
- Early supporters
- Beta program signups
- Feature testers
- Referral program (refer 10+ users)

**Expiration:**
- Can expire after test period
- Can be renewed/extended
- Can be upgraded to Premium
- Can be converted to Gifted Premium

**Feedback Requirements:**
- Submit at least 2 bug reports/month
- Participate in feature surveys
- Active usage during test period

**Migration Path:**
- Expires to Tier 3 (Free Authenticated)
- Can upgrade to Tier 4 (Premium)
- Can be extended/renewed by admin

---

### Tier 7: Gifted Premium

**Target Users:** Promotional recipients, contest winners, referral rewards  
**Business Goal:** Marketing, user acquisition, retention

**Features:**
- ✅ Most Premium features
- ✅ Increased limits (compared to Free)
- ✅ Cloud sync enabled
- ❌ Certain premium-only features (TBD)
- ❌ API access (if premium-only)
- ❌ Priority support (may have limitations)

**Limits:**
- **Papers:** 500 maximum (vs Unlimited for Premium)
- **PDF Size:** 20MB per file (vs 50MB for Premium)
- **Total Storage:** 2GB (vs 10GB for Premium)
- **Collections:** 50 maximum (vs Unlimited)
- **Sync Frequency:** Every 3 minutes (vs Immediate)
- **Devices:** 5 simultaneous (vs Unlimited)
- **Export Formats:** JSON, RIS only (no BibTeX, CSV, Markdown)

**Grant Criteria:**
- Referral rewards (refer 5 users = 1 month gifted premium)
- Contest winners
- Promotional campaigns
- Community contributions
- Early adopters
- Partnership agreements

**Duration:**
- Can be time-limited (1, 3, 6, 12 months)
- Can be permanent (rare, for special cases)
- Tracked separately from paid subscriptions

**Restrictions (vs Full Premium):**
- ❌ Unlimited papers (capped at 500)
- ❌ Smaller storage (2GB vs 10GB)
- ❌ Smaller PDFs (20MB vs 50MB)
- ❌ Limited export formats
- ❌ Standard support (not priority)
- ❌ No API access (if premium feature)
- ✅ Can upgrade to full Premium anytime

**Migration Path:**
- Can upgrade to Tier 4 (Premium) for full features
- Expires to Tier 3 (Free Authenticated) after duration
- Can be renewed/extended by admin

---

## Feature Matrix

### Feature Access by Tier

| Feature | Guest | Free (Not Auth) | Free (Auth) | Premium | Admin | Tester | Gifted Premium |
|---------|-------|----------------|-------------|---------|-------|--------|----------------|
| **Core Features** |
| Add Papers | ✅ | ✅ (50 max) | ✅ (200 max) | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ (500 max) |
| PDF Upload | ✅ | ✅ (2MB) | ✅ (5MB) | ✅ (50MB) | ✅ Unlimited | ✅ (50MB) | ✅ (20MB) |
| Cloud Sync | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-Device | ❌ | ❌ | ✅ (3 devices) | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ (5 devices) |
| Collections | ✅ Unlimited | ✅ (5 max) | ✅ (20 max) | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ (50 max) |
| Annotations | ✅ Unlimited | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paper Linking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Network Graph | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Advanced Features** |
| Command Palette | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Keyboard Shortcuts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batch Operations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full-Text Search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Export/Import** |
| Export JSON | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Import JSON | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export RIS | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Export BibTeX | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Export CSV | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Export Markdown | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Sync & API** |
| Periodic Sync | ❌ | ❌ | ✅ (5 min) | ✅ (Immediate) | ✅ (Immediate) | ✅ (Immediate) | ✅ (3 min) |
| On-Demand Sync | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| API Rate Limit | N/A | N/A | 100/15min | 1000/15min | Unlimited | 1000/15min | 500/15min |
| **Storage** |
| Total Storage | Browser Limit | 50MB | 500MB | 10GB | Unlimited | 10GB | 2GB |
| **Support** |
| Community Support | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ |
| Email Support | ❌ | ❌ | ❌ | ✅ Priority | ✅ | ✅ Priority | ⚠️ Standard |
| Response Time | N/A | N/A | N/A | 24 hours | N/A | 48 hours | 72 hours |
| **Special Features** |
| Beta Features | ❌ | ❌ | ❌ | ✅ Early Access | ✅ | ✅ Full Access | ❌ |
| Feature Requests | ✅ | ✅ | ✅ | ✅ Priority | ✅ | ✅ Priority | ✅ |
| Custom Themes | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Limits Summary

| Limit Type | Guest | Free (Not Auth) | Free (Auth) | Premium | Admin | Tester | Gifted Premium |
|------------|-------|----------------|-------------|---------|-------|--------|----------------|
| **Papers** | Unlimited* | 50 | 200 | Unlimited | Unlimited | Unlimited | 500 |
| **PDF Size** | Browser Limit | 2MB | 5MB | 50MB | Unlimited | 50MB | 20MB |
| **Total Storage** | Browser Limit | 50MB | 500MB | 10GB | Unlimited | 10GB | 2GB |
| **Collections** | Unlimited | 5 | 20 | Unlimited | Unlimited | Unlimited | 50 |
| **Annotations** | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| **Devices** | 1 (local) | 1 | 3 | Unlimited | Unlimited | Unlimited | 5 |
| **Sync Frequency** | N/A | N/A | 5 min | Immediate | Immediate | Immediate | 3 min |
| **API Rate Limit** | N/A | N/A | 100/15min | 1000/15min | Unlimited | 1000/15min | 500/15min |
| **Export Formats** | JSON only | JSON only | JSON only | All formats | All formats | All formats | JSON, RIS |

*Guest: Unlimited locally, but no cloud sync

---

## Critical Decisions Needed

### 1. Pricing Strategy

**Questions:**
- [ ] What is the target price point for Premium?
  - **Suggestion:** $9.99/month or $99/year (competitor analysis needed)
- [ ] Should there be a student discount?
  - **Suggestion:** Yes, 50% off with .edu email verification
- [ ] Should there be a lifetime option?
  - **Suggestion:** No, focus on recurring revenue (but can reconsider)
- [ ] What about family/team plans?
  - **Suggestion:** Add later after individual plans are stable

**Recommendation:**
- **Monthly:** $9.99/month
- **Yearly:** $99.99/year (save $20)
- **Student:** $4.99/month (with .edu verification)
- **Lifetime:** Not recommended initially

---

### 2. Feature Gating Strategy

**Questions:**
- [ ] Should export formats be premium-only?
  - **Criticism:** RIS/BibTeX are standard academic formats - might be too restrictive
  - **Suggestion:** Keep JSON free, make advanced formats (BibTeX, CSV, Markdown) premium
- [ ] Should batch operations be premium-only?
  - **Criticism:** Basic batch operations are productivity features
  - **Suggestion:** Keep basic batch ops free, make advanced batch ops premium
- [ ] Should paper network graph be premium-only?
  - **Criticism:** Visual features showcase the product
  - **Suggestion:** Keep free, it's a good demo feature
- [ ] Should command palette/keyboard shortcuts be premium-only?
  - **Criticism:** These are accessibility features
  - **Suggestion:** Keep free - good UX, not revenue driver

**Recommendation:**
- **Free tiers keep:** Core features, basic batch ops, network graph, command palette
- **Premium gets:** Advanced exports, unlimited papers, larger storage, priority sync, API access

---

### 3. Limits Strategy

**Questions:**
- [ ] Are 200 papers enough for free tier?
  - **Criticism:** Active researchers might hit this quickly
  - **Suggestion:** Start with 200, monitor usage, adjust if needed
- [ ] Is 500MB storage enough for free tier?
  - **Criticism:** With 200 papers at 5MB each = 1GB potential
  - **Suggestion:** Adjust to 1GB for free tier, or reduce paper limit to 150
- [ ] Should PDF size limits be the same for all free tiers?
  - **Suggestion:** Yes, but unverified gets stricter (2MB) to prevent abuse

**Recommendation:**
- **Free (Not Auth):** 50 papers, 2MB PDFs, 50MB storage
- **Free (Auth):** 200 papers, 5MB PDFs, 1GB storage
- **Premium:** Unlimited papers, 50MB PDFs, 10GB storage
- **Gifted Premium:** 500 papers, 20MB PDFs, 2GB storage

---

### 4. Gifted Premium Restrictions

**Questions:**
- [ ] What features should be restricted vs full Premium?
  - **Options:**
    - A) Only storage/paper limits (all features, lower limits)
    - B) Storage limits + some feature restrictions (export formats, API)
    - C) Storage limits + many feature restrictions
- [ ] Should gifted premium expire?
  - **Suggestion:** Yes, track duration, auto-expire
- [ ] Can gifted premium upgrade to paid premium?
  - **Suggestion:** Yes, seamless upgrade path

**Recommendation:**
- **Option A (Recommended):** Lower limits but all features
  - 500 papers (vs Unlimited)
  - 2GB storage (vs 10GB)
  - 20MB PDFs (vs 50MB)
  - All export formats
  - Standard support (not priority)
  - No API access (if premium-only)

---

### 5. Tester/Beta Program Details

**Questions:**
- [ ] How long should tester access last?
  - **Suggestion:** 3-6 months, renewable
- [ ] Should testers have all premium features?
  - **Suggestion:** Yes, to properly test features
- [ ] What are the obligations for testers?
  - **Suggestion:** 
    - Minimum 2 bug reports/month
    - Participate in monthly surveys
    - Active usage (login at least once/week)
- [ ] How do users become testers?
  - **Suggestion:**
    - Beta program signup
    - Early supporter program
    - Referral rewards (refer 10+ users)
    - Community contributions

**Recommendation:**
- **Duration:** 6 months, renewable
- **Features:** Full premium access
- **Requirements:** Active participation, feedback, bug reports
- **Selection:** Invite-only initially, then referral-based

---

### 6. Payment & Subscription Management

**Questions:**
- [ ] Which payment processor?
  - **Options:** Stripe (recommended), PayPal, Paddle
  - **Suggestion:** Stripe - most common, good docs, webhooks
- [ ] How to handle subscription management?
  - **Suggestion:** Stripe Customer Portal for self-service
- [ ] What about refund policy?
  - **Suggestion:** 30-day money-back guarantee
- [ ] How to handle failed payments?
  - **Suggestion:** 
    - 3 retry attempts over 7 days
    - Email notifications
    - Grace period: 7 days access after failure
    - Then downgrade to free tier

**Recommendation:**
- **Payment:** Stripe
- **Management:** Stripe Customer Portal
- **Refunds:** 30-day guarantee
- **Failed Payments:** 7-day grace period, then downgrade

---

### 7. Database Schema Changes

**Questions:**
- [ ] How to store subscription status?
  - **Suggestion:** Add fields to User model:
    - `subscriptionTier` (enum: guest, free_not_auth, free_auth, premium, admin, tester, gifted_premium)
    - `subscriptionStatus` (active, cancelled, expired, trialing)
    - `subscriptionStartDate`, `subscriptionEndDate`
    - `stripeCustomerId`, `stripeSubscriptionId`
    - `giftExpiryDate` (for gifted premium)
- [ ] How to track usage/limits?
  - **Suggestion:** 
    - Calculate on-the-fly from database
    - Cache counts (papers_count, storage_used) in user table
    - Update on paper creation/deletion
- [ ] How to handle limits enforcement?
  - **Suggestion:** 
    - Check limits in API endpoints
    - Return 403 with clear error message
    - Frontend checks limits before API calls

**Recommendation:**
- Extend User model with subscription fields
- Track usage metrics (cached counts)
- Enforce limits at API level
- Frontend validates before API calls

---

### 8. Migration & Upgrade Paths

**Questions:**
- [ ] How to migrate existing users?
  - **Suggestion:**
    - All existing users → Free (Authenticated) tier
    - Grandfather existing users for 90 days (no limits)
    - Then apply new limits
    - Notify users about changes 30 days in advance
- [ ] How to handle upgrades?
  - **Suggestion:**
    - Instant upgrade (Stripe webhook)
    - Show upgrade success message
    - Immediately unlock premium features
- [ ] How to handle downgrades?
  - **Suggestion:**
    - Immediate feature lock (over limits)
    - Grace period: 30 days to stay within limits
    - After 30 days: enforce limits (prevent new additions over limit)
    - Read-only access to over-limit items

**Recommendation:**
- **Existing Users:** Grandfather to Free (Auth) for 90 days
- **Upgrades:** Instant via Stripe webhook
- **Downgrades:** 30-day grace period, then read-only for over-limit items

---

## Technical Implementation Roadmap

### Phase 1: Database Schema (Week 1-2)

**Tasks:**
- [ ] Add subscription fields to User model
- [ ] Create Subscription table (if needed for history)
- [ ] Create UsageTracking table (optional - for analytics)
- [ ] Migration scripts
- [ ] Update Prisma schema

**Fields to Add:**
```prisma
model User {
  // ... existing fields
  
  // Subscription
  subscriptionTier String @default("free_auth") // guest, free_not_auth, free_auth, premium, admin, tester, gifted_premium
  subscriptionStatus String? // active, cancelled, expired, trialing
  subscriptionStartDate DateTime?
  subscriptionEndDate DateTime?
  stripeCustomerId String? @unique
  stripeSubscriptionId String? @unique
  giftExpiryDate DateTime? // For gifted premium
  
  // Usage tracking (cached)
  papersCount Int @default(0)
  storageUsed BigInt @default(0) // in bytes
  
  // Limits (can be calculated, but cached for performance)
  maxPapers Int @default(200)
  maxStorage BigInt @default(536870912) // 500MB in bytes
  maxPdfSize BigInt @default(5242880) // 5MB in bytes
}
```

---

### Phase 2: Subscription Management Backend (Week 2-4)

**Tasks:**
- [ ] Stripe integration
  - [ ] Stripe webhook handler
  - [ ] Create customer on registration
  - [ ] Handle subscription created/updated/cancelled
  - [ ] Handle payment succeeded/failed
- [ ] Subscription service
  - [ ] Get user tier
  - [ ] Check limits
  - [ ] Upgrade/downgrade logic
  - [ ] Usage calculation
- [ ] API endpoint updates
  - [ ] Add limit checks to all relevant endpoints
  - [ ] Return appropriate error messages
  - [ ] Usage endpoint (GET /api/user/usage)

**Endpoints:**
```
POST /api/subscription/create-checkout-session
POST /api/subscription/cancel
GET  /api/subscription/status
GET  /api/user/usage
GET  /api/user/limits
```

---

### Phase 3: Limit Enforcement (Week 4-5)

**Tasks:**
- [ ] Middleware for limit checking
- [ ] Update paper creation endpoint
  - [ ] Check paper count limit
  - [ ] Check storage limit
  - [ ] Check PDF size limit
- [ ] Update sync endpoint
  - [ ] Check device limit
  - [ ] Check sync frequency
- [ ] Update export endpoints
  - [ ] Check export format permissions
- [ ] Usage tracking
  - [ ] Update counts on paper create/delete
  - [ ] Update storage on PDF upload/delete
  - [ ] Periodic recalculation job (for accuracy)

---

### Phase 4: Frontend Updates (Week 5-7)

**Tasks:**
- [ ] Subscription status display
  - [ ] Show current tier in settings
  - [ ] Show usage vs limits
  - [ ] Show upgrade prompts (non-intrusive)
- [ ] Limit enforcement UI
  - [ ] Disable features when at limit
  - [ ] Show upgrade prompts
  - [ ] Error messages for limit violations
- [ ] Upgrade flow
  - [ ] Upgrade button in settings
  - [ ] Stripe checkout integration
  - [ ] Success/cancel pages
- [ ] Usage dashboard
  - [ ] Show papers count / limit
  - [ ] Show storage used / limit
  - [ ] Progress bars
  - [ ] Usage warnings (80%, 90%, 100%)

---

### Phase 5: Gifted Premium & Admin Tools (Week 7-8)

**Tasks:**
- [ ] Admin dashboard
  - [ ] Grant premium to users
  - [ ] View all users
  - [ ] Subscription management
  - [ ] Usage analytics
- [ ] Gifted premium logic
  - [ ] Grant/revoke gifted premium
  - [ ] Expiry handling
  - [ ] Renewal logic
- [ ] Tester program
  - [ ] Grant tester access
  - [ ] Expiry/renewal
  - [ ] Feedback collection tools

---

### Phase 6: Testing & Refinement (Week 8-10)

**Tasks:**
- [ ] Unit tests for subscription logic
- [ ] Integration tests for Stripe webhooks
- [ ] Limit enforcement tests
- [ ] User migration testing
- [ ] Payment flow testing
- [ ] Edge case handling

---

## Pricing Analysis

### Competitor Research Needed

**Similar Products:**
- Zotero: Free (unlimited), Premium $20/year
- Mendeley: Free (unlimited), Discontinued
- Paperpile: $2.99/month, $29.99/year
- ReadCube Papers: $3/month, $36/year
- EndNote: $249.95 one-time, or subscription

**Our Pricing Strategy:**
- **Free Tier:** Competitive (200 papers vs unlimited in Zotero, but we offer cloud sync)
- **Premium:** $9.99/month ($119.88/year) vs $99.99/year = save $20
- **Student:** $4.99/month (50% off) = competitive with student pricing

**Value Proposition:**
- ✅ Modern UI
- ✅ Cloud sync (Zotero free doesn't have this)
- ✅ PDF viewer built-in
- ✅ Paper network graph
- ✅ Local-first (privacy-focused)

---

## Feature Gating Recommendations

### Keep Free (All Tiers)
- Core features (add papers, search, tags)
- Basic batch operations
- Paper network graph
- Command palette
- Keyboard shortcuts
- Collections (with limits)
- Annotations

**Reasoning:** These showcase the product and provide real value. Restricting them hurts user experience and adoption.

### Premium Only
- Unlimited papers (vs 200 limit)
- Larger PDF uploads (50MB vs 5MB)
- More storage (10GB vs 1GB)
- Advanced export formats (BibTeX, CSV, Markdown)
- Priority sync (immediate vs 5 min)
- API access (if implemented)
- Priority support

**Reasoning:** These are genuine value-adds that power users need. Limits encourage upgrades without crippling free users.

### Criticisms & Adjustments

**Potential Issues:**
1. **200 papers might be too low**
   - **Suggestion:** Monitor usage, consider 250-300 for free tier
   - **Alternative:** Start at 200, adjust based on data

2. **1GB storage might be tight with 200 papers**
   - **Suggestion:** 
     - Option A: Reduce paper limit to 150, keep 1GB
     - Option B: Increase storage to 2GB, keep 200 papers
     - **Recommendation:** Option B (2GB storage, 200 papers)

3. **Export formats should be more accessible**
   - **Criticism:** RIS/BibTeX are academic standards
   - **Suggestion:** Keep RIS free, make BibTeX/CSV/Markdown premium
   - **Alternative:** All formats free, premium gets batch export

4. **Device limits might be annoying**
   - **Suggestion:** 3 devices is reasonable, but monitor feedback
   - **Alternative:** Increase to 5 devices for free tier

---

## Revenue Projections (Rough Estimates)

**Assumptions:**
- 1000 registered users (free)
- 10% conversion to premium = 100 premium users
- Monthly: $9.99 × 100 = $999/month
- Yearly: $99.99 × 50 = $4,999.50/month average
- **Estimated Monthly Revenue:** $3,000-5,000/month initially

**Growth Scenarios:**
- Year 1: 100 premium users = $1,200/month (monthly) or $10,000/month (if all yearly)
- Year 2: 500 premium users = $5,000/month (monthly) or $41,666/month (if all yearly)
- Year 3: 2000 premium users = $20,000/month (monthly)

---

## Risk Analysis

### Risks

1. **Users reject paywall**
   - **Mitigation:** Grandfather existing users, maintain strong free tier
   - **Risk Level:** Medium

2. **Competitors offer better free tier**
   - **Mitigation:** Focus on unique features (local-first, privacy, modern UI)
   - **Risk Level:** Low-Medium

3. **Storage costs too high**
   - **Mitigation:** 
     - Use Cloudflare R2 (cheaper than S3)
     - Implement storage optimization
     - Consider storage limits more carefully
   - **Risk Level:** Medium

4. **Payment processing issues**
   - **Mitigation:** Use Stripe (reliable), handle edge cases
   - **Risk Level:** Low

5. **User backlash on limits**
   - **Mitigation:** 
     - Start with generous limits
     - Monitor feedback
     - Adjust based on actual usage patterns
   - **Risk Level:** Medium

---

## Recommendations & Suggestions

### Tier Adjustments

1. **Free (Authenticated) Limits:**
   - ✅ 200 papers (good starting point)
   - ⚠️ **Increase storage to 2GB** (from 1GB) - more realistic
   - ✅ 5MB PDFs (reasonable)
   - ✅ 20 collections (good)
   - ⚠️ **Increase devices to 5** (from 3) - more useful

2. **Gifted Premium:**
   - ✅ 500 papers (good middle ground)
   - ⚠️ **Increase to 5GB storage** (from 2GB) - more generous
   - ✅ 20MB PDFs (reasonable)
   - ✅ Include RIS export (academic standard)
   - ❌ Exclude BibTeX/CSV/Markdown (premium only)

3. **Tester Program:**
   - ✅ 6 months duration (good)
   - ✅ Full premium features (needed for testing)
   - ⚠️ **Require active participation** - minimum 2 bug reports/month
   - ✅ Convertible to premium after expiry

---

### Feature Gating Refinements

**Keep Free:**
- ✅ All core paper management
- ✅ Cloud sync (basic, 5 min frequency)
- ✅ Paper network graph
- ✅ Command palette
- ✅ Keyboard shortcuts
- ✅ RIS export (academic standard)

**Premium Only:**
- ✅ Unlimited papers
- ✅ Larger storage (10GB)
- ✅ Larger PDFs (50MB)
- ✅ Immediate sync
- ✅ BibTeX/CSV/Markdown exports
- ✅ API access
- ✅ Priority support
- ✅ Unlimited devices

---

### Pricing Recommendations

**Recommended Pricing:**
- **Monthly:** $9.99/month
- **Yearly:** $99.99/year (save $20, 17% discount)
- **Student:** $4.99/month (50% off, .edu verification required)
- **Academic (Bulk):** Contact for pricing (10+ users)

**Justification:**
- Competitive with market
- Psychological pricing ($9.99 vs $10)
- Yearly discount encourages longer commitment
- Student pricing expands market

---

## Implementation Checklist

### Pre-Implementation
- [ ] Finalize tier specifications
- [ ] Finalize pricing
- [ ] Finalize limits
- [ ] Finalize feature gating
- [ ] Design subscription UI
- [ ] Design usage dashboard
- [ ] Plan user migration strategy

### Implementation
- [ ] Database schema updates
- [ ] Stripe integration
- [ ] Subscription management backend
- [ ] Limit enforcement middleware
- [ ] Frontend subscription UI
- [ ] Usage tracking
- [ ] Admin tools
- [ ] Testing

### Launch
- [ ] Migrate existing users
- [ ] Enable subscriptions
- [ ] Monitor usage
- [ ] Collect feedback
- [ ] Iterate based on data

---

## Open Questions for Discussion

1. **Should we have a "Lifetime" option?**
   - Pros: One-time payment, higher revenue
   - Cons: No recurring revenue, maintenance burden
   - **Suggestion:** Not initially, reconsider after 1 year

2. **Should free tier include RIS export?**
   - **Suggestion:** Yes, it's an academic standard
   - BibTeX/CSV/Markdown can be premium

3. **What about team/organizational plans?**
   - **Suggestion:** Add after individual plans are stable
   - Pricing: $49.99/month for 5 users, $99/month for 10 users

4. **Should we offer a "Pay what you want" option?**
   - **Suggestion:** No, keep pricing simple

5. **What about referral program?**
   - **Suggestion:** 
     - Refer 5 users = 1 month gifted premium
     - Refer 10 users = 3 months gifted premium
     - Refer 20 users = 6 months gifted premium

6. **How to handle existing users who have 500+ papers?**
   - **Option A:** Grandfather unlimited (not sustainable)
   - **Option B:** Grandfather for 90 days, then read-only for over-limit
   - **Option C:** One-time upgrade offer (50% off first year)
   - **Suggestion:** Option B + C (grandfather period + discount offer)

---

## Next Steps

1. **Review this document**
2. **Make critical decisions** (pricing, limits, features)
3. **Discuss and refine** tier specifications
4. **Finalize feature matrix**
5. **Create technical implementation plan**
6. **Design database schema**
7. **Plan user migration strategy**
8. **Begin implementation** (after approval)

---

## Appendix: Suggested Refinements

### Tier 2 (Free, Not Authenticated) - More Restrictive

**Suggested Limits:**
- Papers: **25** (not 50) - encourage verification
- PDF Size: **1MB** (not 2MB) - prevent abuse
- Storage: **25MB** (not 50MB)
- Collections: **3** (not 5)

**Reasoning:** Stronger incentive to verify email

---

### Tier 3 (Free, Authenticated) - Adjustments

**Suggested Limits:**
- Papers: **200** ✅ (keep)
- Storage: **2GB** ⚠️ (increase from 1GB)
- PDF Size: **5MB** ✅ (keep)
- Collections: **20** ✅ (keep)
- Devices: **5** ⚠️ (increase from 3)

---

### Tier 4 (Premium) - Pricing

**Suggested Pricing:**
- Monthly: **$9.99/month**
- Yearly: **$99.99/year** (save $20)
- Student: **$4.99/month** (50% off)

**Alternative:** Lower price point
- Monthly: $7.99/month
- Yearly: $79.99/year
- **Recommendation:** Start higher, can always lower prices

---

### Tier 7 (Gifted Premium) - Restrictions

**Suggested Restrictions:**
- Papers: 500 ✅
- Storage: **5GB** ⚠️ (increase from 2GB)
- PDF Size: 20MB ✅
- Export: JSON + RIS only ✅
- Support: Standard (not priority) ✅
- API: No access ✅

**Reasoning:** More generous limits make it a better promotional tool

---

**Document Status:** Ready for Review  
**Last Updated:** Current Session  
**Next Review:** After feedback and decisions

