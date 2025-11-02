# Rebranding Guide: citaversa → citavErs

## Overview
Complete guide for rebranding the project from **citaversa.com** to **citavers.com** and changing the project name from **citaversa/citavErsa** to **citavErs**.

## Naming Conventions
- **Project Name**: `citavErs` (camelCase with capital E)
- **Domain**: `citavers.com` (lowercase)
- **Email Domain**: `noreply@citavers.com` (lowercase)
- **Package Name**: `citavers` (lowercase)
- **Database Name**: `citavers` (lowercase)
- **Display Name**: `citavErs` (in UI/titles)

## Files Modified

### 1. Core Configuration Files

#### `backend/src/lib/email.js`
- `FROM_EMAIL`: `noreply@citavers.com`
- `FROM_NAME`: `Citavers`

#### `config.js`
- Update localStorage keys:
  - `citaversa_access_token` → `citavers_access_token`
  - `citaversa_refresh_token` → `citavers_refresh_token`
  - `citaversa_user` → `citavers_user`
  - `citaversa_sync_mode` → `citavers_sync_mode`

#### `package.json` (root)
- `name`: `citavers`

#### `backend/package.json`
- `name`: `citavers-backend`
- `description`: `Backend API for citavErs - Research Paper Management`

#### `backend/prisma/schema.prisma`
- Update schema comments: `citavErs`

### 2. HTML Files

#### `index.html`
- `<title>`: `citavErs`
- Logo text: `citavErs`

### 3. JavaScript Files

#### `db/sync.js`
- `CHANGES_KEY`: `citavers_pending_changes`
- `SYNC_IN_PROGRESS_KEY`: `citavers_sync_in_progress`
- `LAST_SYNCED_KEY`: `citavers_last_synced_at`

#### `api/sync.js`
- `LAST_SYNCED_KEY`: `citavers_last_synced_at`
- `CLIENT_ID_KEY`: `citavers_client_id`

#### `settings.view.js`
- Backup filename: `citavers-backup-${date}.json`

#### `db/core.js`
- `DB_NAME`: `CitaversDB`

#### `tests/helpers.js`
- Update all localStorage keys to use `citavers_` prefix

### 4. Backend Server Files

#### `backend/src/server.js`
- Comments: `citavErs Backend Server`
- Console log: `🚀 citavErs Backend running on port ${PORT}`

### 5. Documentation Files

Update all `.md` files:
- `README.md` (root)
- `backend/README.md`
- `backend/EMAIL_SETUP.md`
- `backend/DEPLOYMENT.md`
- `backend/SETUP.md`
- `backend/PRE_DEPLOYMENT_CHECKLIST.md`
- `RAILWAY_DEBUG_GUIDE.md`
- `PRODUCTION_TEST_GUIDE.md`
- `enhancement_plan.md`
- And all other documentation files

**Changes in documentation:**
- All references to `citaversa.com` → `citavers.com`
- All references to `citaversa` → `citavers`
- All references to `citavErsa` → `citavErs`
- All references to `Citaversa` → `Citavers`
- Database names: `citaversa` → `citavers`
- Bucket names: `citaversa-pdfs` → `citavers-pdfs` (if applicable)
- Token names: `citaversa-backend` → `citavers-backend`

### 6. Environment Variables

Update these environment variables:
- `FRONTEND_URL`: `https://citavers.com`
- `EMAIL_FROM`: `noreply@citavers.com`
- `EMAIL_FROM_NAME`: `Citavers`
- `DATABASE_URL`: Update database name if needed
- `S3_BUCKET_NAME`: `citavers-pdfs` (if rebranding bucket)

### 7. Cloud Services Configuration

#### Railway
- Update `FRONTEND_URL` environment variable
- Update service names if applicable

#### Cloudflare Pages/DNS
- Update custom domain from `citaversa.com` to `citavers.com`
- Update DNS records
- Update CORS origins

#### Email Service (Resend/SMTP)
- Verify/update sender domain from `citaversa.com` to `citavers.com`
- Update `FROM_EMAIL` in environment variables

#### Database
- If creating a new database: use name `citavers`
- Update connection strings

#### Cloud Storage (R2/S3)
- Optionally rename bucket from `citaversa-pdfs` to `citavers-pdfs`
- Update CORS configuration with new domain
- Update bucket access policies

### 8. GitHub Repository

#### Repository Settings
- **Note**: GitHub repo URL won't change automatically
- Users accessing via old URL will still work (GitHub redirects)
- Consider updating README with new links

#### Actions/Workflows
- Update badge URLs if pointing to old repo name
- Update deployment URLs

### 9. Test Files

Update all test files:
- `tests/sync/api-sync.test.js`
- `tests/sync/db-sync.test.js`
- `tests/helpers.js`
- Update localStorage key references

### 10. Deployment Files

#### `railway.json`
- Update any hardcoded URLs

#### `backend/render.yaml`
- Update service names

## Step-by-Step Execution Plan

### Phase 1: Code Changes
1. ✅ Update all JavaScript files (config, sync, database)
2. ✅ Update HTML files
3. ✅ Update package.json files
4. ✅ Update database schema comments

### Phase 2: Documentation
1. ✅ Update all .md documentation files
2. ✅ Update README files
3. ✅ Update deployment guides

### Phase 3: Environment & Deployment
1. ⚠️ **Manual**: Update Railway environment variables
2. ⚠️ **Manual**: Update Cloudflare DNS and domain settings
3. ⚠️ **Manual**: Update email service domain verification
4. ⚠️ **Manual**: Update database connection strings if needed
5. ⚠️ **Manual**: Update storage bucket names and CORS if rebranding

### Phase 4: Testing
1. ✅ Run all tests to ensure localStorage key changes work
2. ✅ Verify email sending with new domain
3. ✅ Verify frontend loads correctly
4. ✅ Verify authentication flow
5. ✅ Verify sync functionality

## Important Notes

### Breaking Changes for Existing Users
1. **LocalStorage Keys**: Existing users will need to re-authenticate after the localStorage key changes
   - Their auth tokens will be lost
   - They'll need to log in again
   - This is intentional and acceptable for a rebrand

2. **Database Migration**: If renaming database:
   - Export data from old database
   - Create new database with new name
   - Import data
   - Update connection strings

3. **Domain Migration**: 
   - Set up new domain `citavers.com`
   - Configure DNS
   - Set up SSL certificates
   - Update CORS origins
   - Test email sending from new domain

### Backward Compatibility
- Old domain `citaversa.com` should redirect to `citavers.com` (if configured)
- Consider adding migration script for localStorage keys (optional)

## Verification Checklist

After rebranding, verify:

- [ ] All code files updated (no grep results for "citaversa")
- [ ] HTML title shows "citavErs"
- [ ] Email sender shows "Citavers" and uses `noreply@citavers.com`
- [ ] Documentation updated
- [ ] Environment variables updated in Railway
- [ ] Domain configured and SSL working
- [ ] Email verification working with new domain
- [ ] Frontend loads at new domain
- [ ] Authentication flow works
- [ ] Sync functionality works
- [ ] Tests passing
- [ ] No console errors

## Rollback Plan

If issues arise:
1. Revert code changes (git)
2. Revert environment variables
3. Point domain back to old setup
4. Restore old database name if changed

## Timeline Estimate

- **Code Changes**: ~1 hour (automated)
- **Documentation**: ~30 minutes (automated)
- **Environment Setup**: ~2-4 hours (manual - DNS propagation, email verification, etc.)
- **Testing**: ~1 hour
- **Total**: ~4-6 hours

---

**Status**: Guide created. Ready to execute automated replacements.

