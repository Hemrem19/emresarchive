# Production Testing Guide

This guide helps you systematically test the production backend deployment on Railway.

## 🎯 Testing Checklist

### Phase 1: Authentication ✅
- [ ] **1.1** Register a new user
  - Open frontend at `https://citaversa.com`
  - Click "Sign Up" or "Login" button
  - Create new account (email + password)
  - Expected: Success message, logged in state

- [ ] **1.2** Login with existing user
  - Logout if logged in
  - Click "Login"
  - Enter email + password
  - Expected: Success message, logged in state

- [ ] **1.3** Logout
  - Click logout button
  - Expected: Returned to logged out state

- [ ] **1.4** Token refresh (automatic)
  - Stay logged in for >15 minutes
  - Perform action (refresh should happen automatically)
  - Expected: No "session expired" errors

### Phase 2: Cloud Sync Toggle ✅
- [ ] **2.1** Enable cloud sync
  - Go to Settings
  - Toggle "Cloud Sync" to ON
  - Expected: Toggle switches to enabled state

- [ ] **2.2** Verify sync mode
  - Check browser console for sync mode messages
  - Expected: Console logs show "cloud sync enabled"

### Phase 3: Papers CRUD ✅
- [ ] **3.1** Create paper (via form)
  - Go to "Add Paper" form
  - Fill in: Title, Authors, DOI (optional), Tags
  - Save
  - Expected: Paper appears in dashboard, saved to cloud

- [ ] **3.2** Read all papers
  - Go to Dashboard
  - Expected: All papers load from cloud API

- [ ] **3.3** Update paper
  - Open paper details
  - Click "Edit"
  - Change title or status
  - Save
  - Expected: Changes saved to cloud

- [ ] **3.4** Delete paper
  - Open paper details
  - Click "Delete"
  - Confirm
  - Expected: Paper removed from cloud

### Phase 4: PDF Upload ✅
- [ ] **4.1** Upload PDF via form
  - Go to "Add Paper" or "Edit Paper"
  - Click "Upload PDF" or drag & drop
  - Select PDF file
  - Expected: File uploads to S3, presigned URL generated

- [ ] **4.2** Verify PDF in details view
  - Open paper with uploaded PDF
  - Click "View PDF"
  - Expected: PDF viewer opens, displays PDF from S3

- [ ] **4.3** Download PDF
  - In paper details, find download option
  - Click download
  - Expected: PDF downloads from S3 presigned URL

### Phase 5: Collections CRUD ✅
- [ ] **5.1** Create collection
  - On dashboard, save current filters as collection
  - Or go to Settings → Collections
  - Create new collection
  - Expected: Collection saved to cloud

- [ ] **5.2** Read collections
  - Go to sidebar or Settings
  - Expected: All collections load from cloud

- [ ] **5.3** Update collection
  - Edit collection name or filters
  - Save
  - Expected: Changes saved to cloud

- [ ] **5.4** Delete collection
  - Delete a collection
  - Confirm
  - Expected: Collection removed from cloud

### Phase 6: Dual-Mode Fallback ✅
- [ ] **6.1** Cloud sync disabled → local mode
  - Disable cloud sync in Settings
  - Create/update paper
  - Expected: Data saved to IndexedDB (local only)

- [ ] **6.2** Network error → fallback to local
  - Disable network (airplane mode) OR set wrong API URL
  - Try to create paper with cloud sync enabled
  - Expected: Falls back to local IndexedDB, shows warning

- [ ] **6.3** Auth error → fallback to local
  - Logout while cloud sync enabled
  - Try to create paper
  - Expected: Falls back to local IndexedDB, shows warning

### Phase 7: Error Handling ✅
- [ ] **7.1** Invalid credentials
  - Try to login with wrong password
  - Expected: Clear error message

- [ ] **7.2** Network timeout
  - Slow network or simulate timeout
  - Perform action
  - Expected: Timeout error handled gracefully

- [ ] **7.3** Server error (500)
  - (May need to simulate via wrong endpoint)
  - Expected: Error message, falls back to local if possible

## 🔍 How to Test

### 1. Open Frontend
```
URL: https://citaversa.com
```

### 2. Open Browser DevTools
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to **Console** tab for logs
- Go to **Network** tab for API requests

### 3. Monitor API Calls
In Network tab:
- Filter by "Fetch/XHR"
- Look for requests to `emresarchive-production.up.railway.app`
- Check status codes (200 = success, 401 = auth error, 500 = server error)

### 4. Check Console Logs
Look for:
- ✅ `CORS: Allowed origin: https://citaversa.com` (CORS working)
- ✅ `Cloud sync enabled` (when enabled)
- ⚠️ `Cloud sync failed, falling back to local` (fallback working)
- ❌ `Error:` (any errors)

## 📊 Expected API Endpoints

You should see calls to:
- `POST /api/auth/register` - Registration
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/papers` - Get all papers
- `POST /api/papers` - Create paper
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper
- `POST /api/papers/upload-url` - Get S3 upload URL
- `GET /api/papers/:id/pdf-url` - Get S3 download URL

## 🐛 Troubleshooting

### Issue: "CORS Missing Allow Origin"
- **Check:** Railway `FRONTEND_URL` variable set correctly
- **Check:** URL matches exactly (including https://)
- **Fix:** Update Railway environment variable

### Issue: "401 Unauthorized"
- **Check:** User is logged in (check auth state)
- **Check:** Token not expired
- **Fix:** Logout and login again

### Issue: "500 Internal Server Error"
- **Check:** Railway logs for error details
- **Check:** DATABASE_URL is correct format
- **Check:** All environment variables set

### Issue: "NetworkError"
- **Check:** Backend is running (check Railway dashboard)
- **Check:** API URL in `config.js` is correct
- **Check:** Network connectivity

## ✅ Success Criteria

All tests pass when:
1. ✅ Authentication works (register, login, logout)
2. ✅ Papers CRUD works (create, read, update, delete)
3. ✅ PDF upload works (S3 presigned URLs)
4. ✅ Collections CRUD works
5. ✅ Dual-mode fallback works (cloud → local)
6. ✅ No CORS errors in console
7. ✅ No 401/500 errors for valid operations

---

## 🚀 Ready to Test?

Start with Phase 1 (Authentication) and work through each phase systematically. Take notes of any errors or unexpected behavior!

