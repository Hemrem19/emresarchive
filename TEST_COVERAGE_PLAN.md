# Unit Test Coverage Improvement Plan

**Current State:**
- ✅ 175 tests passing (100% pass rate)
- 📊 Overall coverage: **13.77%**
- 🎯 Target: **Increase to 40-50%** (focusing on critical modules)

---

## 📋 Coverage Analysis

### Current Coverage by Module

| Module | Coverage | Priority | Status |
|--------|----------|----------|--------|
| **Sync Modules (New)** | | | |
| `db/sync.js` | 25.71% | 🔴 HIGH | Critical new feature |
| `db/adapter.js` | 20.44% | 🔴 HIGH | Routes cloud/local operations |
| `core/syncManager.js` | 31.25% | 🔴 HIGH | Auto-sync triggers |
| `api/sync.js` | 30.65% | 🔴 HIGH | Sync API client |
| **Database Modules** | | | |
| `db/annotations.js` | 50.5% | 🟡 MEDIUM | Partially tested |
| `db/core.js` | 74.09% | 🟢 LOW | Already good |
| `db/papers.js` | 74.72% | 🟢 LOW | Already good |
| `db/collections.js` | 75% | 🟢 LOW | Already good |
| **Core Modules** | | | |
| `core/filters.js` | 37.95% | 🟡 MEDIUM | Partially tested |
| `core/state.js` | 93.44% | 🟢 LOW | Already good |
| **Utility Modules** | | | |
| `citation.js` | 0% | 🟡 MEDIUM | Useful utility |
| `config.js` | 83.78% | 🟢 LOW | Already good |
| `ui.js` | 25.64% | 🟡 MEDIUM | Some helpers tested |

---

## 🎯 Implementation Plan

### Phase 1: Sync System (HIGH PRIORITY) 🔴
**Goal:** Increase sync-related modules to 70%+ coverage

#### 1.1 `db/sync.js` Tests (Target: 70%+)
**Current:** 25.71% | **Target:** 70%

**Test Areas:**
- ✅ Change tracking functions
  - `trackPaperCreated`, `trackPaperUpdated`, `trackPaperDeleted`
  - `trackCollectionCreated`, `trackCollectionUpdated`, `trackCollectionDeleted`
  - `trackAnnotationCreated`, `trackAnnotationUpdated`, `trackAnnotationDeleted`
  - `getPendingChanges`, `clearPendingChanges`
- ✅ Data mapping functions
  - `prepareChangesForSync` (maps local to API format)
- ✅ Server change application
  - `applyServerChanges` (papers, collections, annotations)
  - Conflict handling
- ✅ Sync orchestration
  - `performFullSync` (initial sync)
  - `performIncrementalSync` (subsequent syncs)
  - `performSync` (chooses full vs incremental)
  - `getSyncStatusInfo` (combines local + server status)

**Estimated Tests:** ~40 tests

#### 1.2 `api/sync.js` Tests (Target: 60%+)
**Current:** 30.65% | **Target:** 60%

**Test Areas:**
- ✅ Client ID management
  - `getClientId` (generates and persists)
- ✅ Last sync timestamp
  - `getLastSyncedAt`, `setLastSyncedAt`
- ✅ Data mapping functions
  - `mapPaperFromApi`, `mapCollectionFromApi`, `mapAnnotationFromApi`
  - `mapPaperToApi`, `mapCollectionToApi`, `mapAnnotationToApi`
- ✅ API calls (with mocked fetch)
  - `fullSync` (GET /api/sync/full)
  - `incrementalSync` (POST /api/sync/incremental)
  - `getSyncStatus` (GET /api/sync/status)
  - Token refresh on 401

**Estimated Tests:** ~25 tests

#### 1.3 `core/syncManager.js` Tests (Target: 70%+)
**Current:** 31.25% | **Target:** 70%

**Test Areas:**
- ✅ Sync state checking
  - `shouldAutoSync` (cloud enabled + authenticated)
- ✅ Auto-sync execution
  - `performAutoSync` (silent vs verbose)
  - Notification logic (server changes, conflicts)
- ✅ Debounced sync
  - `triggerDebouncedSync` (delays and batches)
- ✅ Sync lifecycle
  - `initializeAutoSync` (on app load)
  - `startPeriodicSync`, `stopPeriodicSync`
  - `setupNetworkReconnectListener` (online/offline events)
  - `restartAutoSync`, `stopAutoSync`
- ✅ Manual sync
  - `performManualSync`

**Estimated Tests:** ~20 tests

#### 1.4 `db/adapter.js` Tests (Target: 50%+)
**Current:** 20.44% | **Target:** 50%

**Test Areas:**
- ✅ Data format mapping
  - `mapPaperDataToApi`, `mapPaperDataFromApi`
  - `mapCollectionDataToApi`, `mapCollectionDataFromApi`
  - `mapAnnotationDataToApi`, `mapAnnotationDataFromApi`
- ✅ Cloud sync routing
  - Papers: `addPaper`, `updatePaper`, `deletePaper` (cloud mode)
  - Collections: `addCollection`, `updateCollection`, `deleteCollection` (cloud mode)
  - Annotations: `addAnnotation`, `updateAnnotation`, `deleteAnnotation` (cloud mode)
  - Fallback to local on cloud failures
- ✅ Local-only routing
  - Operations when cloud sync disabled
- ✅ Sync trigger integration
  - `triggerDebouncedSync` called after operations

**Estimated Tests:** ~30 tests

**Phase 1 Total:** ~115 tests

---

### Phase 2: Database & Core Modules (MEDIUM PRIORITY) 🟡

#### 2.1 `db/annotations.js` Tests (Target: 80%+)
**Current:** 50.5% | **Target:** 80%

**Test Areas:**
- ✅ CRUD operations (extend existing tests)
  - `addAnnotation` (validation, defaults)
  - `getAnnotationsByPaperId` (filtering, sorting)
  - `getAnnotationById` (error handling)
  - `updateAnnotation` (partial updates)
  - `deleteAnnotation` (cascade behavior)
  - `deleteAnnotationsByPaperId` (bulk delete)
- ✅ Edge cases
  - Missing paperId
  - Invalid annotation data
  - Non-existent annotations

**Estimated Tests:** ~15 tests

#### 2.2 `core/filters.js` Tests (Target: 60%+)
**Current:** 37.95% | **Target:** 60%

**Test Areas:**
- ✅ URL hash functions (extend existing)
  - `updateUrlHash` (complex filter combinations)
  - `parseUrlHash` (malformed hashes)
- ✅ Filter combinations
  - Status + tags + search (all together)
  - Empty results handling
  - Edge cases (special characters in tags)

**Estimated Tests:** ~10 tests

---

### Phase 3: Utility Modules (MEDIUM PRIORITY) 🟡

#### 3.1 `citation.js` Tests (Target: 80%+)
**Current:** 0% | **Target:** 80%

**Test Areas:**
- ✅ Citation format generation
  - APA format (various paper types)
  - MLA format
  - Chicago format
  - BibTeX format
- ✅ Author formatting
  - Single author, multiple authors
  - Missing authors
- ✅ Date formatting
  - With year, without year
- ✅ Journal/venue formatting
  - Journal names, conferences
- ✅ Edge cases
  - Missing fields
  - Special characters
  - Long titles

**Estimated Tests:** ~30 tests

---

## 📊 Coverage Targets

### Overall Goals
- **Current:** 13.77%
- **Phase 1 Target:** ~25% (sync modules)
- **Phase 2 Target:** ~35% (database + core)
- **Phase 3 Target:** ~45% (utilities)

### Module-Specific Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| `db/sync.js` | 25.71% | 70%+ | 🔴 HIGH |
| `api/sync.js` | 30.65% | 60%+ | 🔴 HIGH |
| `core/syncManager.js` | 31.25% | 70%+ | 🔴 HIGH |
| `db/adapter.js` | 20.44% | 50%+ | 🔴 HIGH |
| `db/annotations.js` | 50.5% | 80%+ | 🟡 MEDIUM |
| `core/filters.js` | 37.95% | 60%+ | 🟡 MEDIUM |
| `citation.js` | 0% | 80%+ | 🟡 MEDIUM |

---

## 🛠️ Implementation Strategy

### Test File Organization
```
tests/
├── setup.js (existing)
├── helpers.js (existing)
├── sync/
│   ├── db-sync.test.js (new)
│   ├── api-sync.test.js (new)
│   ├── sync-manager.test.js (new)
│   └── adapter.test.js (new)
├── db/
│   └── annotations-extended.test.js (extend existing)
├── core/
│   └── filters-extended.test.js (extend existing)
└── citation.test.js (new)
```

### Testing Patterns

#### 1. Mocking Strategy
- **localStorage**: Use `vitest`'s built-in mocking
- **fetch**: Mock with `vi.fn()` for API tests
- **IndexedDB**: Use `fake-indexeddb` (already set up)
- **Timeouts/Intervals**: Mock with `vi.useFakeTimers()`

#### 2. Test Structure
```javascript
describe('Module Name', () => {
  beforeEach(() => {
    // Reset mocks, clear localStorage, reset IndexedDB
  });

  describe('Function Group', () => {
    it('should handle normal case', () => {});
    it('should handle edge case', () => {});
    it('should handle error case', () => {});
  });
});
```

#### 3. Helper Functions
Extend `tests/helpers.js` with:
- Mock auth state (`setMockAuth`, `clearMockAuth`)
- Mock sync state (`setMockSyncEnabled`)
- Mock fetch responses (`createMockFetchResponse`)
- Mock localStorage operations

---

## 📝 Implementation Checklist

### Phase 1: Sync System
- [ ] Create `tests/sync/db-sync.test.js`
  - [ ] Change tracking (9 functions)
  - [ ] Data mapping (1 function)
  - [ ] Server change application (3 functions)
  - [ ] Sync orchestration (4 functions)
- [ ] Create `tests/sync/api-sync.test.js`
  - [ ] Client ID & timestamp (4 functions)
  - [ ] Data mapping (6 functions)
  - [ ] API calls (3 functions with mocked fetch)
- [ ] Create `tests/sync/sync-manager.test.js`
  - [ ] Sync state checking (1 function)
  - [ ] Auto-sync execution (1 function)
  - [ ] Debounced sync (1 function)
  - [ ] Sync lifecycle (6 functions)
- [ ] Create `tests/sync/adapter.test.js`
  - [ ] Data mapping (6 functions)
  - [ ] Cloud sync routing (9 operations)
  - [ ] Local fallback (3 operations)
  - [ ] Sync triggers (verification)

### Phase 2: Database & Core
- [ ] Extend `tests/db-annotations.test.js`
  - [ ] Additional CRUD edge cases
  - [ ] Bulk operations
- [ ] Extend `tests/core-filters.test.js`
  - [ ] URL hash edge cases
  - [ ] Complex filter combinations

### Phase 3: Utilities
- [ ] Create `tests/citation.test.js`
  - [ ] All citation formats (4 formats)
  - [ ] Author formatting
  - [ ] Edge cases

---

## 🎯 Success Criteria

1. ✅ All sync modules: 60%+ coverage
2. ✅ Overall coverage: 40%+ (up from 13.77%)
3. ✅ All tests passing (maintain 100% pass rate)
4. ✅ Test execution time: < 10 seconds
5. ✅ Comprehensive edge case coverage

---

## 📅 Estimated Timeline

- **Phase 1:** 6-8 hours (sync system - critical)
- **Phase 2:** 2-3 hours (database & core extensions)
- **Phase 3:** 3-4 hours (utilities)
- **Total:** 11-15 hours

---

## 🚀 Next Steps

1. Start with Phase 1.1 (`db/sync.js`) - highest priority
2. Add test helpers for mocking auth/sync state
3. Implement tests systematically, one module at a time
4. Run coverage after each module to track progress
5. Update `TESTING.md` with new test documentation

