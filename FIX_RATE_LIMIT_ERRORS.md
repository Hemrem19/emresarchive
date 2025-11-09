# Rate Limit & JSON Parse Error Fix

## Problem Summary
When uploading PDFs or performing sync operations, the application was hitting rate limits (HTTP 429) from the Railway backend. The server returned plain text error messages instead of JSON, causing cascading JSON parse errors throughout the application.

## Root Causes
1. **Inconsistent Error Handling**: API functions were calling `response.json()` directly without checking if the response was JSON
2. **No Rate Limit Detection**: The app had no mechanism to detect or handle 429 errors
3. **Cascading Failures**: Multiple sync operations triggered simultaneously, amplifying the rate limit issue
4. **Missing Exponential Backoff**: No retry strategy for rate-limited requests

## Solution Implemented

### 1. Created Shared API Utilities (`api/utils.js`)
- **`parseJsonResponse()`**: Safely parses responses, handles non-JSON errors (like plain text 429 responses)
- **Rate Limit Tracking**: Tracks rate limit state with exponential backoff
- **`isRateLimited()`**: Checks if currently rate-limited
- **`setRateLimit()`**: Sets rate limit with exponential backoff + jitter
- **`clearRateLimit()`**: Clears rate limit when successful
- **Exponential Backoff**: 1s → 2s → 4s → 8s → 16s → 30s (max) + random jitter

### 2. Updated All API Files
Updated these files to use `parseJsonResponse()` consistently:
- ✅ `api/papers.js` - All 8 functions updated
- ✅ `api/sync.js` - All 3 sync functions updated
- ✅ `api/collections.js` - All 5 functions updated
- ✅ `api/annotations.js` - All 5 functions updated
- ✅ `api/user.js` - Updated

### 3. Enhanced Sync Manager (`core/syncManager.js`)
- **Pre-Sync Rate Limit Check**: Skips sync if rate-limited
- **Better Error Messages**: Shows remaining time for rate limits
- **Silent Failures**: Rate limit errors don't show on automatic syncs
- **User Notifications**: Shows toast with countdown when manually triggered

### 4. Error Handling Improvements
**Before:**
```
SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

**After:**
```
Rate Limited: Too many requests. Please wait 15 seconds.
```

## Benefits
1. ✅ **No More JSON Parse Errors**: All non-JSON responses handled gracefully
2. ✅ **Rate Limit Awareness**: App knows when it's rate-limited and waits
3. ✅ **Exponential Backoff**: Automatically increases wait time on repeated failures
4. ✅ **Better UX**: Clear error messages with time remaining
5. ✅ **Prevents Cascading Errors**: Stops unnecessary API calls when rate-limited
6. ✅ **Consistent Error Handling**: All API files use the same pattern

## Testing Instructions

### Test 1: Normal PDF Upload
1. Open the app in browser
2. Open Developer Console (F12)
3. Navigate to a paper and upload a PDF
4. **Expected**: PDF uploads successfully with no errors

### Test 2: Rate Limit Handling (If You Hit Limit)
1. Perform multiple actions quickly (upload PDFs, edit papers, sync)
2. If you hit rate limit, you should see:
   - Console: `[Sync Manager] Rate limited, skipping sync. Retry in Xs`
   - Console: `[Rate Limit] Rate limited for Xs (attempt N)`
   - Toast (if manual sync): "Rate limited. Sync will resume in X seconds."
3. **Expected**: No JSON parse errors, clean rate limit messages

### Test 3: Automatic Recovery
1. Wait for the rate limit period to expire
2. Perform another sync operation
3. **Expected**: 
   - Console: `[Rate Limit] Cleared`
   - Operations resume normally

### Test 4: Monitor Console During Normal Use
1. Use the app normally (add papers, edit, upload PDFs)
2. Watch the console for errors
3. **Expected**: 
   - No "SyntaxError: JSON.parse" errors
   - No "Cloud sync failed, falling back to local" errors (unless actually rate-limited)
   - Clean error messages if any errors occur

## What to Look For
✅ **Good Signs:**
- No JSON parse errors
- Rate limit messages show countdown
- App continues to work after rate limit expires
- Local storage fallback works smoothly

❌ **Bad Signs:**
- JSON parse errors still appearing
- Rate limit not detected
- App keeps retrying during rate limit

## Backend Considerations
You may want to:
1. **Review Rate Limits**: Are they too strict? (current seems very aggressive)
2. **Add Rate Limit Headers**: Send `Retry-After` header in 429 responses
3. **Log Rate Limit Hits**: Monitor backend to see which IPs are hitting limits
4. **Consider Per-User Rate Limits**: Instead of per-IP (better for cloud deployments)

## Files Modified
- `api/utils.js` (NEW) - Shared utilities for error handling and rate limiting
- `api/papers.js` - Updated all 8 API functions
- `api/sync.js` - Updated all 3 sync functions  
- `api/collections.js` - Updated all 5 functions
- `api/annotations.js` - Updated all 5 functions
- `api/user.js` - Updated clearAllUserData function
- `core/syncManager.js` - Added rate limit checking and better error handling

## No Breaking Changes
- All changes are backwards compatible
- Existing functionality preserved
- Only improves error handling and resilience

