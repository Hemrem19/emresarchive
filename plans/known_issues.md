## Known Issues

### Login
    - Login buton on citavErs web clipper does not working. (FIXED)
    - Logging in should trigger background sync.

### Edit Paper
    - After editing completed and save button clicked, it should trigger the background sync and should not wait for its synchronization to return to previous menu.

### citavErs Web Clipper
    - Dark mode button does not work.

### Paper Network (FIXED)
    - ✅ FIXED: Paper network now syncs across devices. Networks are stored on the backend and automatically loaded when the graph view mounts.
    - ✅ FIXED: Paper network is now saved when created and automatically displayed until a new one is generated.

### Sync (FIXED)
    - ✅ FIXED: Tags, notes, summary, and rating were not syncing between devices. Root cause: sync endpoints were missing `summary` and `rating` in database select statements. Fixed in `backend/src/controllers/sync.js`.

### Paper Details
    - Some buttons does not work on notes section such as pointed list, numerated list etc.

### Refactor
    - backend/controller/paper.js

### Rating
    - Every change on the slider send notification to user and probably syncing. It should not send any notification and only sync when slider is dropped.

### Email Verification
    - Although email is verified for user, verify email address notice stays open.

### Import
    - CRITICAL ERROR: Global Error: Uncaught ReferenceError: setDuplicatePreference is not defined at https://citavers.com/settings.view.js:830
    - set all to overwrite/skip button causes this error
    - Importing multiple papers cause rate limit error. Because importing sends all papers individually, it should send them as batch.

node build.js
cmd /c npx cap sync android

