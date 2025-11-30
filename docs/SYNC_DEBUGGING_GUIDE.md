# Sync Debugging Guide

## Issue: Tags, Notes, Summary, and Rating Not Syncing

### Root Causes Found

1. **Missing Fields in Sync Select Statements** (FIXED)
   - `fullSync` and `incrementalSync` were missing `summary` and `rating` in database select statements
   - Fixed in commit `dda8aaf`

2. **Missing Fields in Batch Operations** (FIXED)
   - `batchOperations` had an `allowedFields` whitelist missing `summary` and `rating`
   - Fixed in current session

### Verification Checklist

1. **Backend Deployment**
   - ✅ Code changes committed to GitHub
   - ⚠️ **REQUIRED**: Deploy backend to Railway
   - The fix won't work until the backend is deployed with the updated code

2. **Database Schema**
   - ✅ `summary` and `rating` fields exist in Prisma schema
   - ✅ Migration already applied (from previous commit)

3. **Sync Endpoints**
   - ✅ `fullSync` now selects `summary` and `rating`
   - ✅ `incrementalSync` now selects `summary` and `rating`
   - ✅ Update logic spreads `updateData` correctly

4. **Mapping Functions**
   - ✅ `mapPaperToApi` preserves all fields (uses spread operator)
   - ✅ `mapPaperFromApi` preserves all fields (uses spread operator)

5. **Validation**
   - ✅ `paperUpdateSchema` includes `summary` and `rating`
   - ✅ Validation middleware allows these fields

### Testing Steps

1. **Deploy Backend to Railway**
   ```bash
   # Railway should auto-deploy from GitHub, or manually trigger deployment
   ```

2. **Test Full Sync**
   - On Device A: Add a paper with tags, notes, summary, and rating
   - On Device B: Perform full sync
   - Verify all fields appear correctly

3. **Test Incremental Sync**
   - On Device A: Update tags, notes, summary, or rating
   - Trigger sync manually or wait for auto-sync
   - On Device B: Trigger sync
   - Verify changes appear

4. **Test Partial Updates**
   - Update only rating: `updatePaper(id, { rating: 7 })`
   - Update only summary: `updatePaper(id, { summary: 'New summary' })`
   - Update only tags: `updatePaper(id, { tags: ['tag1', 'tag2'] })`
   - Update only notes: `updatePaper(id, { notes: 'New notes' })`
   - Verify each syncs correctly

### Debugging Commands

Check backend logs on Railway:
- Look for sync requests in logs
- Check for validation errors
- Verify database queries include all fields

Check frontend console:
- Look for sync errors
- Check pending changes in localStorage: `localStorage.getItem('citavers_pending_changes')`
- Check last synced timestamp: `localStorage.getItem('citavers_last_synced_at')`

### Common Issues

1. **Backend Not Deployed**
   - Symptoms: Changes don't sync, but no errors
   - Solution: Deploy backend to Railway

2. **Version Conflicts**
   - Symptoms: Updates rejected with "Version conflict"
   - Solution: This is expected behavior - last-write-wins

3. **Validation Errors**
   - Symptoms: 422 errors in console
   - Solution: Check validation schema includes all fields

4. **Fields Set to null**
   - Prisma requires explicit `null` to clear fields
   - Current code handles this correctly via spread operator

### Files Modified

- `backend/src/controllers/sync.js` - Added `summary` and `rating` to select statements
- `backend/src/controllers/papers.js` - Added `summary` and `rating` to batch operations whitelist

### Next Steps

1. **Deploy backend to Railway** (CRITICAL)
2. Test sync on multiple devices
3. Monitor Railway logs for any errors
4. Verify all fields sync correctly

