# Sync Diagnostic Script

Run this in the browser console to diagnose sync issues:

```javascript
// Check sync configuration
console.log('=== SYNC DIAGNOSTIC ===');
console.log('1. Cloud Sync Enabled:', localStorage.getItem('citavers_sync_mode') === 'cloud');
console.log('2. Access Token:', localStorage.getItem('citavers_access_token') ? 'EXISTS' : 'MISSING');
console.log('3. User Data:', localStorage.getItem('citavers_user') ? 'EXISTS' : 'MISSING');
console.log('4. API Base URL:', localStorage.getItem('apiBaseUrl') || 'https://emresarchive-production.up.railway.app');
console.log('5. Last Synced At:', localStorage.getItem('citavers_last_synced_at') || 'NEVER');
console.log('6. Pending Changes:', JSON.parse(localStorage.getItem('citavers_pending_changes') || '{}'));
console.log('7. Sync In Progress:', localStorage.getItem('citavers_sync_in_progress') || 'NO');

// Import and check sync status
import('./db/sync.js').then(module => {
    module.getSyncStatusInfo().then(status => {
        console.log('8. Sync Status:', status);
    });
}).catch(err => console.error('Failed to import sync module:', err));

// Check if sync manager is initialized
import('./core/syncManager.js').then(module => {
    console.log('9. Sync Manager loaded');
}).catch(err => console.error('Failed to import sync manager:', err));
```

## Manual Sync Test

```javascript
// Test manual sync
import('./core/syncManager.js').then(async (module) => {
    try {
        console.log('Attempting manual sync...');
        await module.performManualSync();
        console.log('Manual sync completed');
    } catch (error) {
        console.error('Manual sync failed:', error);
    }
});
```

## Check Pending Changes

```javascript
const changes = JSON.parse(localStorage.getItem('citavers_pending_changes') || '{}');
console.log('Pending Changes:', {
    papers: {
        created: changes.papers?.created?.length || 0,
        updated: changes.papers?.updated?.length || 0,
        deleted: changes.papers?.deleted?.length || 0
    },
    collections: {
        created: changes.collections?.created?.length || 0,
        updated: changes.collections?.updated?.length || 0,
        deleted: changes.collections?.deleted?.length || 0
    },
    annotations: {
        created: changes.annotations?.created?.length || 0,
        updated: changes.annotations?.updated?.length || 0,
        deleted: changes.annotations?.deleted?.length || 0
    }
});
```

