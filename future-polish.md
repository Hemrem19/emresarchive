## Future Polish

This document tracks optional enhancements, refinements, and follow-up work that can be tackled after the current production-ready milestones.

### Phase 3 — Cache Management (Dashboard)

- **Objective**: Centralize all dashboard caching behavior in a `dashboard/services/cache-manager.js` module so handlers no longer mutate `appState.allPapersCache` directly.
- **Key Capabilities**:
  - `updatePaperCache(cache, paperId, updates)` to apply safe, atomic updates.
  - `removePaperFromCache(cache, paperId)` for consistent removal logic.
  - `invalidateCache()` and `syncCacheWithDB()` hooks to refresh the cache on demand.
- **Benefits**:
  - Reduces the chance of stale UI when papers change.
  - Simplifies handler code and keeps business logic focused.
  - Provides a single place to evolve caching strategy (e.g., smarter invalidation rules).
  - Makes debugging easier by consolidating cache reads/writes.
- **Status & Effort**: Not started; estimated 2–3 hours. Optional because current behavior is stable, but it lays groundwork for future dashboard optimizations.

---

Add future polish items below as they are identified.

