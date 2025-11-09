# Rate Limit Improvements - V2

## Additional Changes to Prevent Excessive API Calls

### Problem
Even with rate limit detection in place, the app was still making too many requests:
- **Settings view polling**: Every 30 seconds, regardless of rate limit status
- **No pre-flight checks**: Requests were made even when already rate-limited
- **Cascading operations**: One action (e.g., PDF upload) triggered 5+ API calls

### Solution

#### 1. Pre-flight Rate Limit Checks in Adapter (`db/adapter.js`)
- **New function**: `canAttemptCloudSync()` - Checks auth AND rate limit status before attempting cloud operations
- **Replaced**: All `shouldUseCloudSync()` calls with `canAttemptCloudSync()` in key functions:
  - `getAllPapers()` - Stops unnecessary paper fetching when rate-limited
  - `getPaperById()` - Skips individual paper fetches
  - `updatePaper()` - Prevents paper update attempts
  - `deletePaper()` - Blocks delete operations
  - `getAllCollections()` - Stops collection fetching
  - `getCollectionById()` - Skips individual collection fetches

**Benefit**: Operations fall back to local storage immediately without making doomed API calls.

#### 2. Sync Status Pre-checks (`db/sync.js`)
- **Enhanced**: `getSyncStatusInfo()` now checks if rate-limited BEFORE calling API
- **Fallback**: Returns cached local status when rate-limited instead of making API call
- **Prevents**: Constant sync status polling from hitting rate limits

#### 3. Settings View Improvements (`settings.view.js`)
- **Polling frequency reduced**: 30s → 60s (less aggressive)
- **Pre-check added**: Checks rate limit status before each sync status update
- **Early exit**: Skips update entirely if rate-limited

### Impact

**Before (from user's logs):**
```
Upload 1 PDF → 5+ API requests immediately → All rate-limited → Exponential backoff to 17s
```

**After:**
```
Upload 1 PDF → Check rate limit → Skip unnecessary requests → Fall back to local → Clean recovery
```

### How It Works

1. **User uploads PDF** (successful)
2. **App tries to update paper**:
   - Adapter calls `canAttemptCloudSync()`
   - Checks: Authenticated? ✅ Rate limited? ✅
   - **Skips API call**, uses local storage instead
   - Logs: `[Adapter] Skipping cloud sync - rate limited for Xs`
3. **Settings view tries to update status**:
   - Checks `isRateLimited()`
   - **Skips API call**
   - Logs: `[Settings] Skipping sync status update - rate limited for Xs`
4. **Sync manager** (already had pre-checks):
   - Logs: `[Sync Manager] Rate limited, skipping sync. Retry in Xs`

### Request Reduction

**Typical scenario - Uploading 1 PDF:**

| Action | Before (Requests) | After (Requests) |
|--------|------------------|------------------|
| Upload PDF | 1 ✅ | 1 ✅ |
| Update paper | 1 ❌ (rate limited) | 0 (skipped) |
| Get papers | 1 ❌ (rate limited) | 0 (skipped) |
| Get collections | 1 ❌ (rate limited) | 0 (skipped) |
| Sync status (settings) | 1 ❌ (rate limited) | 0 (skipped) |
| Sync status (again) | 1 ❌ (rate limited) | 0 (skipped) |
| **Total** | **6 requests, 5 failed** | **1 request, 1 succeeded** |

### Console Output Improvements

**Before:**
```
Get papers error: Error: Rate Limited...
Cloud sync failed, falling back to local...
Get collections error: Error: Rate Limited...
Cloud sync failed, falling back to local...
[Rate Limit] Rate limited for 17s (attempt 5)  ← Growing exponentially
```

**After:**
```
[Adapter] Skipping cloud sync - rate limited for 8s
[Settings] Skipping sync status update - rate limited for 8s
[Sync Manager] Rate limited, skipping sync. Retry in 8s
← No unnecessary API calls, clean logs
```

### Files Modified
- ✅ `db/adapter.js` - Added pre-flight rate limit checks
- ✅ `db/sync.js` - Return cached status when rate-limited
- ✅ `settings.view.js` - Reduced polling frequency, added pre-checks

### Testing
After these changes, uploading a PDF while rate-limited should:
1. ✅ Complete the upload successfully
2. ✅ Show clean log messages about skipping operations
3. ✅ Fall back to local storage immediately
4. ✅ Recover automatically when rate limit expires
5. ✅ Make MANY fewer failed API requests

### Backend Recommendation
The rate limiting is still quite aggressive. Consider:
- **Increasing limits**: 5-10 requests per 10 seconds seems very low
- **Per-user limits**: Instead of per-IP (better for cloud apps)
- **Different limits per endpoint**: Read operations (GET) vs Write operations (POST/PUT/DELETE)
- **Grace period**: Allow burst of requests, then rate limit

