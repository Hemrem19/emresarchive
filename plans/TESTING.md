# Testing Guide - citavErs

**Version:** 2.1  
**Status:** ✅ 1706/1706 tests passing (100%)  
**Last Updated:** April 4, 2026

---

## 📊 Quick Status

```
✅ 1706 tests passing (100% pass rate)
⏱️  ~15 seconds execution time
📁  105 test files
🎯  Core modules fully covered
```

---

## 🧪 Testing Framework

We use **Vitest** - a fast, modern testing framework optimized for ES modules and vanilla JavaScript.

### Key Features
- ✅ Unit tests for core logic
- ✅ Integration tests for workflows  
- ✅ IndexedDB mocking with `fake-indexeddb`
- ✅ Node.js environment (not browser)
- ✅ Code coverage reporting
- ✅ Watch mode for development
- ✅ Interactive UI mode

---

## 📦 Installation

```bash
npm install
```

**Dependencies installed:**
- `vitest` (1.6.0) - Test runner
- `@vitest/ui` - Web-based test interface
- `@vitest/coverage-v8` - Coverage reports
- `fake-indexeddb` (5.0.2) - IndexedDB mock for Node.js
- `happy-dom` (14.12.0) - DOM implementation (not currently used)

---

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Interactive UI mode
npm run test:ui

# Coverage report
npm run test:coverage
```

### Expected Output

```
 RUN  v1.6.1 C:/Users/PC/Python_Projects/emresarchive

 ✓ tests/core-state.test.js
 ✓ tests/db-papers.test.js 
 ✓ tests/api/api-networks.test.js
 ✓ tests/db/adapter.test.js
 ✓ backend/tests/routes/papers.test.js
 ✓ backend/tests/lib/password.test.js
 ...

 Test Files  105 passed | 1 skipped (106)
      Tests  1706 passed | 23 skipped (1729)
   Duration  14.95s
```

---

## 📁 Test Structure

The test suite is divided between the unified frontend and backend directories:

### Frontend Tests (`tests/`)

```
tests/
├── api/                     # Cloud/API interface tests
├── components/              # UI Component tests
├── dashboard/               # Dashboard handlers & services
├── db/                      # Database & adapter tests
├── details/                 # Paper details view managers
├── sync/                    # Sync logic and managers
├── *.test.js                # Core/State/Integration tests
├── setup.js                 # Global test setup (mocks, environment)
└── helpers.js               # Test utilities (createMockPaper, etc.)
```

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── controllers/             # Request handler tests
├── lib/                     # Library/Utilities (auth, s3, emailing)
├── middleware/              # Express middleware tests
├── routes/                  # API routing tests
├── services/                # Business services
├── server.test.js           # Server startup logic
└── setup.js                 # Backend global test setup
```

**Total: 1706 tests across 105 files**

---

## 📝 Test Coverage

### What's Tested ✅

#### Core Application Logic
- ✅ **State Management** (`core-state.test.js`, `core-filters.test.js`)
  - Initial state creation with defaults, active filters, search functionality
- ✅ **UI Helpers & Components** (`ui.test.js`, `ui-helpers.test.js`, `ui-components.test.js`)
  - HTML escaping for XSS prevention, Array normalization, Error handling
- ✅ **Keyboard Shortcuts & Command Palette** (`core-keyboard-shortcuts.test.js`, `core-command-palette.test.js`)
- ✅ **Router Operations** (`core-router.test.js`)
  - URL hash generation and parsing

#### Database Layer & Application Core
- ✅ **Local Document Operations** (`db-papers.test.js`, `db-papers-rating-summary.test.js`, `db-collections.test.js`, `db-data.test.js`)
  - Edit papers with validation, collections structure mappings, missing value fallbacks
- ✅ **Platform Syncing & API Managers** (`api/*.test.js`, `sync/*.test.js`)
  - Request configurations, API utilities rate limiting, auto-sync event queuing 
- ✅ **Adapter Abstraction Layer** (`db/adapter.test.js`, `db/adapter-coverage.test.js`)

#### Backend Verification
- ✅ **Data Processing & Restful Endpoints** (`routes/`, `controllers/`)
  - JWT integration flows, connection creations, PDF routes
- ✅ **Middlewares & Security Configurations** (`middleware/`)
- ✅ **Library Utilities** (`lib/validation.test.js`, `lib/password.test.js`)

#### End-to-End & Application Views
- ✅ **Integration Workflows** (`integration.test.js`, `integration-batch-operations.test.js`, `ui-e2e.test.js`)
  - Complete document lifecycle tracking
- ✅ **View memory safety** (`landing-view-memory-leaks.test.js`)

### What's NOT Tested ⚠️

These require browser environment or E2E framework (Playwright/Cypress):

- ❌ View modules (`*.view.js`) - Heavy DOM dependencies
- ❌ Router (`core/router.js`) - Browser history API
- ❌ Command palette (`core/commandPalette.js`) - DOM-heavy
- ❌ Keyboard shortcuts (`core/keyboardShortcuts.js`) - Browser events
- ❌ PDF viewer logic - Complex browser APIs (PDF.js)
- ❌ File upload interactions - File API
- ❌ Graph visualization - vis-network library
- ❌ Touch gestures - Mobile device emulation

**Recommendation:** Use manual testing checklist (see below) for these features.

---

## 🛠️ Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from '../module.js';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

### Using Test Helpers

```javascript
import { createMockPaper, createMockCollection } from './helpers.js';

// Create a single mock paper
const paper = createMockPaper({ 
  title: 'Custom Title',
  tags: ['machine-learning']
});

// Create multiple mock papers
const papers = createMockPapers(10);

// Create a mock collection
const collection = createMockCollection({
  name: 'My Collection',
  filters: { status: 'Reading', tags: ['ai'] }
});
```

### Testing Async Database Operations

```javascript
import { openDB } from '../db/core.js';
import { addPaper, getAllPapers } from '../db/papers.js';

describe('Database Tests', () => {
  it('should add a paper', async () => {
    // Add paper
    const paperId = await addPaper({ 
      title: 'Test',
      authors: ['Author'],
      year: 2024 
    });
    
    // Verify
    const papers = await getAllPapers();
    expect(papers).toHaveLength(1);
    expect(papers[0].id).toBe(paperId);
  });
});
```

### Testing with AppState

```javascript
import { getFilteredPapers } from '../core/filters.js';

it('should filter by status', () => {
  const appState = {
    activeFilters: { status: 'Reading', tags: [] },
    currentSearchTerm: '',
    searchMode: 'all'
  };
  
  const filtered = getFilteredPapers(mockPapers, appState);
  expect(filtered.every(p => p.readingStatus === 'Reading')).toBe(true);
});
```

---

## 🐛 Debugging Tests

### Run a Single Test File
```bash
npx vitest run tests/core-state.test.js
```

### Run Tests Matching a Pattern
```bash
npx vitest run -t "should filter by status"
```

### Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Use Vitest UI for Debugging
```bash
npm run test:ui
```
Then open `http://localhost:51204` to:
- View test results in browser
- See detailed error messages
- Inspect test execution time
- Re-run individual tests

---

## 📊 Code Coverage

### Generate Coverage Report
```bash
npm run test:coverage
```

### View Report
```bash
# Open in browser
coverage/index.html
```

### Coverage Goals
- **Core Logic** (`core/`): 90%+ coverage
- **Database Layer** (`db/`): 85%+ coverage
- **UI Helpers** (`ui.js`): 80%+ coverage
- **Overall**: 70%+ coverage

### Current Coverage
Run `npm run test:coverage` to see current metrics.

---

## 🔧 Troubleshooting

### Tests Hanging
**Problem:** Tests appear to hang during execution.

**Solution:**
- Ensure all async operations use `await`
- Check for unresolved Promises
- Verify database cleanup in `afterEach` hooks
- Check timeout settings in `vitest.config.js`

### IndexedDB Errors
**Problem:** "IndexedDB not available" or "Database not supported" errors.

**Solution:**
- Verify `fake-indexeddb/auto` is imported in `tests/setup.js`
- Check that `global.indexedDB` and `global.IDBKeyRange` are set
- Ensure tests use `await openDB()` before database operations

### Import Errors
**Problem:** "Cannot find module" errors.

**Solution:**
- Use relative imports (e.g., `'../db.js'` not `'/db.js'`)
- Verify file extensions (`.js`) are included
- Check that barrel exports (`db.js`) are correct

---

## ✅ Best Practices

1. **Keep tests focused** - One concept per test
2. **Use descriptive names** - "should filter papers by status" not "test filter"
3. **Clean up after tests** - Use `beforeEach`/`afterEach` hooks
4. **Mock external dependencies** - Don't rely on external APIs
5. **Test edge cases** - Empty arrays, null values, undefined
6. **Avoid test interdependence** - Each test runs independently
7. **Use helpers** - Reduce duplication with `createMockPaper`, etc.
8. **Follow AAA pattern** - Arrange, Act, Assert
9. **Test behavior, not implementation** - Test what, not how

---

## 📋 Manual Testing Checklist

For features not covered by automated tests:

### Core Functionality
- [ ] **Papers**: Add, edit, delete papers
- [ ] **Search**: Test all search modes (all fields, notes only)
- [ ] **Filters**: Status filters, tag filters (single and multiple)
- [ ] **Collections**: Create, edit, delete, apply collections
- [ ] **Sorting**: Test all sort options (title, authors, year, created, tags, status, progress)
- [ ] **Pagination**: Navigate through pages, change items per page

### PDF Viewer
- [ ] Upload PDF and view
- [ ] Zoom in/out (check quality at all levels)
- [ ] Rotate pages
- [ ] Navigate pages
- [ ] Fullscreen mode
- [ ] Search in PDF
- [ ] Print PDF

### Graph View
- [ ] Papers appear as nodes
- [ ] Related papers show connections
- [ ] Click node to navigate to paper
- [ ] Hover shows paper details
- [ ] Layout adjusts automatically

### Command Palette & Keyboard Shortcuts
- [ ] Open with Ctrl+K / Cmd+K
- [ ] Search for papers
- [ ] Search for commands
- [ ] Navigate with arrow keys
- [ ] Execute with Enter
- [ ] Close with Esc
- [ ] Global shortcuts (n, /, g, Esc)

### Mobile
- [ ] Responsive layout
- [ ] Touch gestures (pinch zoom, swipe)
- [ ] Mobile sidebar toggle
- [ ] Touch targets (44px min)
- [ ] Virtual keyboard handling

### Data Management
- [ ] Export data
- [ ] Import data
- [ ] Clear all data (with confirmation)
- [ ] Dark mode toggle

### Edge Cases
- [ ] Large library (100+ papers)
- [ ] Very long titles/notes
- [ ] Special characters in fields
- [ ] Large PDFs (10MB+)
- [ ] Network offline
- [ ] Browser refresh (state persistence)

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run tests
      run: npm test
    
    - name: Generate coverage
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
```

---

## 🎯 Implementation History

### Phase 1: Setup (Initial Session)
- ✅ Installed Vitest and dependencies
- ✅ Created `vitest.config.js`
- ✅ Created test setup and helpers
- ✅ Added test scripts to `package.json`
- ✅ Updated `.gitignore`

### Phase 2: Test Writing
- ✅ Core state management tests (12)
- ✅ Filtering and search tests (30)
- ✅ UI helper tests (26)
- ✅ Database operation tests (36)
- ✅ Integration workflow tests (12)

### Phase 3: Debugging (30 failures → 0 failures)
- ✅ Fixed function signatures (16 tests)
- ✅ Fixed search term casing (7 tests)
- ✅ Added database default values (3 tests)
- ✅ Added hasPdf flag (2 tests)
- ✅ Fixed test data (2 tests)

**Total effort:** ~2 hours  
**Final result:** 1706/1706 passing ✅

---

## 🚀 Future Enhancements

### Short Term
- [ ] Increase coverage to 80%+
- [ ] Add coverage badges to README
- [ ] Set up CI/CD pipeline

### Medium Term
- [ ] Add E2E tests with Playwright
  - PDF viewer interactions
  - File upload flows
  - Command palette
  - Graph visualization

### Long Term
- [ ] Performance benchmarks
- [ ] Visual regression tests
- [ ] Mobile-specific E2E tests
- [ ] Accessibility tests (WCAG compliance)

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)
- [Playwright](https://playwright.dev/) - For future E2E tests

---

**Status:** ✅ Complete & Passing  
**Maintainer:** citavErs Team  
**Questions?** Check test files for examples or open an issue.
