# Testing Checklist - Phase 2 Features (A1 & B2)

**Version:** 1.3  
**Database Version:** 4  
**Features to Test:** Saved Filters/Collections (A1) + Command Palette (B2)  
**Priority:** HIGH - Both features are untested in production environment

---

## 🧪 Testing Environment Setup

### Prerequisites
- [ ] Browser: Chrome/Edge (latest version)
- [ ] Browser: Firefox (latest version)
- [ ] Browser: Safari (if on Mac)
- [ ] Mobile device or browser DevTools mobile emulation
- [ ] DevTools Console open (to monitor for errors)
- [ ] Dark mode and light mode testing

### Initial Setup
1. [ ] Navigate to application URL
2. [ ] Open browser DevTools (F12)
3. [ ] Clear IndexedDB if needed: `Application > IndexedDB > delete all`
4. [ ] Verify app loads without errors in console
5. [ ] Add 5-10 test papers with various statuses and tags

---

## 📁 Feature A1: Saved Filters / Collections

### Test Category 1: Database Operations ✅

#### 1.1 Create Collection
- [ ] Apply a status filter (e.g., "To Read")
- [ ] Click "+" button in Collections section of sidebar
- [ ] Enter collection name "My To Read Papers"
- [ ] Verify collection appears in sidebar immediately
- [ ] Refresh page - verify collection persists
- [ ] Check DevTools Console - no errors
- [ ] Try saving collection with no filters active - should show warning toast

**Expected:** Collection saved, appears in sidebar, persists after refresh

#### 1.2 Read Collections
- [ ] Create 3 different collections with different names
- [ ] Verify all 3 appear in sidebar
- [ ] Verify they are listed (check if sorted by createdAt)
- [ ] Close and reopen browser - verify all collections still there

**Expected:** All collections visible, sorted correctly, persistent

#### 1.3 Apply Collection (Restore Filters)
- [ ] Create a collection with Status="Reading" + Tag="machine-learning"
- [ ] Clear all filters (go to "All Papers")
- [ ] Click the saved collection in sidebar
- [ ] Verify status filter applied (sidebar highlights "Reading")
- [ ] Verify tag filter applied (sidebar highlights tag)
- [ ] Verify paper list shows only matching papers
- [ ] Verify success toast appears

**Expected:** All saved filters restored correctly, papers filtered, toast shown

#### 1.4 Edit Collection
- [ ] Hover over a collection in sidebar
- [ ] Click edit button (pencil icon)
- [ ] Click OK to rename
- [ ] Enter new name "Updated Collection Name"
- [ ] Verify name updates in sidebar immediately
- [ ] Refresh page - verify new name persists

**Expected:** Collection renamed successfully, persists

#### 1.5 Delete Collection
- [ ] Hover over a collection
- [ ] Click edit button
- [ ] Click Cancel to delete
- [ ] Confirm deletion in confirmation dialog
- [ ] Verify collection disappears from sidebar
- [ ] Refresh page - verify collection still deleted
- [ ] Verify success toast appears

**Expected:** Collection deleted, sidebar updates, toast shown

---

### Test Category 2: Export/Import Integration ✅

#### 2.1 Export with Collections
- [ ] Create 2-3 collections
- [ ] Go to Settings
- [ ] Click "Export All Data"
- [ ] Save JSON file
- [ ] Open JSON file in text editor
- [ ] Verify structure: `{papers: [...], collections: [...]}`
- [ ] Verify collections array has correct data
- [ ] Verify each collection has: id, name, icon, color, filters, createdAt

**Expected:** Export includes collections in new format

#### 2.2 Import with Collections
- [ ] Export data with collections (from 2.1)
- [ ] Go to Settings > "Clear All Data" (confirm)
- [ ] Verify all papers and collections removed
- [ ] Go to Settings > "Import Data"
- [ ] Select the exported JSON file
- [ ] Verify import success toast
- [ ] Verify papers restored
- [ ] Verify collections restored in sidebar
- [ ] Click a collection - verify filters work

**Expected:** Full restore of papers and collections

#### 2.3 Backward Compatibility (Old Export Format)
- [ ] Create an old-format export file (array of papers, no collections)
  ```json
  [
    {"id": 1, "title": "Test Paper", ...}
  ]
  ```
- [ ] Clear all data
- [ ] Import the old-format file
- [ ] Verify papers import successfully
- [ ] Verify no errors in console
- [ ] Verify import success toast

**Expected:** Old format imports without errors

#### 2.4 Clear All Data
- [ ] Create papers and collections
- [ ] Go to Settings > "Clear All Data"
- [ ] Confirm deletion
- [ ] Verify all papers removed from dashboard
- [ ] Verify all collections removed from sidebar
- [ ] Verify success toast
- [ ] Refresh page - verify data still cleared

**Expected:** Both papers and collections cleared

---

### Test Category 3: UI/UX Testing ✅

#### 3.1 Sidebar Rendering
- [ ] **No Collections:** Verify collections section hidden
- [ ] **With Collections:** Verify section appears with header
- [ ] **Icons:** Verify default icon is "folder"
- [ ] **Hover:** Verify edit button appears on hover
- [ ] **Desktop Sidebar:** Verify collections render correctly
- [ ] **Mobile Sidebar:** Open mobile menu, verify collections there too

**Expected:** Collections section adapts based on data, works on desktop and mobile

#### 3.2 Active State Highlighting
- [ ] Click a collection
- [ ] Verify collection is highlighted in sidebar
- [ ] Click "All Papers" - verify collection unhighlighted
- [ ] Navigate to another page and back - verify highlight state

**Expected:** Active collection properly highlighted

#### 3.3 Empty States
- [ ] Delete all collections
- [ ] Verify collections section disappears from sidebar
- [ ] Create one collection
- [ ] Verify section reappears

**Expected:** Graceful empty state handling

---

### Test Category 4: Edge Cases & Error Handling ✅

#### 4.1 Validation
- [ ] Try saving collection with empty name (cancel prompt)
- [ ] Try saving collection with only spaces in name
- [ ] Try saving collection when no filters active

**Expected:** Appropriate error messages/warnings

#### 4.2 Long Names
- [ ] Create collection with very long name (100+ characters)
- [ ] Verify name truncates in UI with ellipsis
- [ ] Verify full name visible when editing

**Expected:** Long names handled gracefully

#### 4.3 Special Characters
- [ ] Create collection with special characters: `Test "Collection" & <Stuff>`
- [ ] Verify HTML escaped (no XSS)
- [ ] Verify name displays correctly

**Expected:** Special characters escaped safely

#### 4.4 Rapid Operations
- [ ] Quickly create 5 collections in succession
- [ ] Quickly delete 3 collections
- [ ] Verify no race conditions or errors

**Expected:** Multiple operations handled correctly

---

## ⌨️ Feature B2: Command Palette

### Test Category 5: Keyboard Shortcuts ✅

#### 5.1 Open Palette
- [ ] Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- [ ] Verify palette opens with overlay
- [ ] Verify input is auto-focused (cursor blinking)
- [ ] Verify smooth fade-in and slide-down animations
- [ ] Try opening from different views (Dashboard, Details, Settings)

**Expected:** Palette opens consistently from all views

#### 5.2 Close Palette
- [ ] Open palette (`Ctrl+K`)
- [ ] Press `Esc` - verify closes
- [ ] Open palette again
- [ ] Click overlay (dark area) - verify closes
- [ ] Open palette, type search, press `Esc` - verify closes and input clears

**Expected:** Multiple close methods work correctly

#### 5.3 Keyboard Navigation
- [ ] Open palette
- [ ] Type "paper" to get results
- [ ] Press `↓` (down arrow) - verify selection moves down
- [ ] Press `↓` multiple times - verify circular navigation (wraps to top)
- [ ] Press `↑` (up arrow) - verify selection moves up
- [ ] Verify selected item highlights correctly
- [ ] Verify selected item scrolls into view

**Expected:** Full keyboard navigation works smoothly

#### 5.4 Execute Action
- [ ] Search for a paper by title
- [ ] Use arrow keys to select it
- [ ] Press `Enter`
- [ ] Verify navigates to paper details view
- [ ] Verify palette closes after action

**Expected:** Enter executes selected action and closes palette

---

### Test Category 6: Search Functionality ✅

#### 6.1 Search Papers
- [ ] Open palette
- [ ] Type partial paper title (e.g., "neural")
- [ ] Verify papers with matching titles appear
- [ ] Verify author names shown in subtitle
- [ ] Type author name
- [ ] Verify papers by that author appear
- [ ] Verify case-insensitive (try "NEURAL", "Neural", "neural")

**Expected:** Papers searchable by title and author, case-insensitive

#### 6.2 Search Tags
- [ ] Add papers with tags: "machine-learning", "nlp", "computer-vision"
- [ ] Open palette
- [ ] Type "machine"
- [ ] Verify tag "#machine-learning" appears under "Tags" category
- [ ] Click the tag
- [ ] Verify navigates to tag filter view
- [ ] Verify palette closes

**Expected:** Tags searchable and clickable

#### 6.3 Search Collections
- [ ] Create 2-3 collections with distinct names
- [ ] Open palette
- [ ] Type part of a collection name
- [ ] Verify collection appears under "Collections" category
- [ ] Verify shows custom icon
- [ ] Click collection
- [ ] Verify filters applied (collection activated)
- [ ] Verify palette closes

**Expected:** Collections searchable and clickable

#### 6.4 Search Status Filters
- [ ] Open palette
- [ ] Type "reading"
- [ ] Verify "Reading" appears under "Status Filters"
- [ ] Click it
- [ ] Verify navigates to status filter view
- [ ] Verify papers filtered by "Reading" status

**Expected:** Status filters searchable

#### 6.5 Search Actions
- [ ] Open palette
- [ ] Type "add"
- [ ] Verify "Add New Paper" appears under "Actions"
- [ ] Type "export"
- [ ] Verify "Export Data" appears
- [ ] Click "Add New Paper"
- [ ] Verify navigates to add paper form

**Expected:** Quick actions searchable

---

### Test Category 7: Result Rendering ✅

#### 7.1 Grouping
- [ ] Open palette
- [ ] Type "a" (broad search)
- [ ] Verify results grouped by type:
  - Papers
  - Tags
  - Collections
  - Status Filters
  - Actions
- [ ] Verify each group has a header
- [ ] Verify groups appear in correct order

**Expected:** Results properly grouped with headers

#### 7.2 Icons and Subtitles
- [ ] Search for papers - verify "description" icon
- [ ] Search for tags - verify "label" icon
- [ ] Search for collections - verify custom icons
- [ ] Search for status - verify "filter_alt" icon
- [ ] Search for actions - verify action-specific icons
- [ ] Verify subtitles show relevant info

**Expected:** All items have appropriate icons and subtitles

#### 7.3 Empty States
- [ ] Open palette (no search query)
- [ ] Verify "Quick Navigation" empty state shows
- [ ] Type "zzzzzzzzz" (no results)
- [ ] Verify "No results found" state shows
- [ ] Clear search
- [ ] Verify returns to empty state

**Expected:** Appropriate empty and no-results states

#### 7.4 Visual Selection
- [ ] Open palette and search
- [ ] Hover over item - verify hover highlight
- [ ] Use keyboard to select - verify selection highlight
- [ ] Verify selected item has different background color
- [ ] Verify highlight visible in both light and dark mode

**Expected:** Clear visual indication of selection

---

### Test Category 8: Integration Testing ✅

#### 8.1 Command Palette + Collections
- [ ] Create a collection via UI
- [ ] Open command palette
- [ ] Search for the collection
- [ ] Click it in palette
- [ ] Verify collection filters applied
- [ ] Open palette again
- [ ] Search for papers matching those filters
- [ ] Verify correct results

**Expected:** Palette integrates with collections feature

#### 8.2 Multi-Step Workflows
- [ ] Open palette (`Ctrl+K`)
- [ ] Search for "Add New Paper"
- [ ] Execute action (navigate to form)
- [ ] Fill out form
- [ ] Save paper
- [ ] Open palette again
- [ ] Search for the newly added paper
- [ ] Verify it appears in results

**Expected:** Palette always has up-to-date data

#### 8.3 Performance with Large Dataset
- [ ] Add 50+ papers (or use bulk import)
- [ ] Open palette
- [ ] Type search query
- [ ] Verify search completes quickly (< 500ms)
- [ ] Verify no lag in keyboard navigation

**Expected:** Acceptable performance with large datasets

---

### Test Category 9: Mobile & Responsive Testing ✅

#### 9.1 Mobile Command Palette
- [ ] Open app on mobile device (or emulate in DevTools)
- [ ] Try `Ctrl+K` equivalent (might not work on mobile)
- [ ] Note: Mobile users would need a button to open (not implemented)
- [ ] Verify palette UI is responsive if opened via code
- [ ] Verify touch scrolling works in results
- [ ] Verify keyboard hints hide on small screens

**Expected:** Palette UI adapts to mobile (button to open would be future enhancement)

#### 9.2 Mobile Collections
- [ ] Open mobile sidebar (hamburger menu)
- [ ] Verify collections section appears
- [ ] Tap a collection
- [ ] Verify filters applied
- [ ] Verify mobile menu closes
- [ ] Tap edit button on collection
- [ ] Verify edit dialog works on mobile

**Expected:** Collections fully functional on mobile

---

### Test Category 10: Dark Mode Testing ✅

#### 10.1 Collections in Dark Mode
- [ ] Toggle dark mode
- [ ] Verify collections in sidebar have correct colors
- [ ] Verify hover states work in dark mode
- [ ] Verify collection highlight visible
- [ ] Toggle back to light mode - verify works

**Expected:** Collections look good in both modes

#### 10.2 Command Palette in Dark Mode
- [ ] Enable dark mode
- [ ] Open command palette (`Ctrl+K`)
- [ ] Verify overlay color appropriate (dark, semi-transparent)
- [ ] Verify modal background dark
- [ ] Verify text readable (light on dark)
- [ ] Verify hover/selection highlights visible
- [ ] Verify borders visible

**Expected:** Palette fully supports dark mode

---

### Test Category 11: Error Handling & Edge Cases ✅

#### 11.1 Network Errors (if applicable)
- [ ] Go offline
- [ ] Open palette
- [ ] Verify still works (local data)
- [ ] Try collections - verify works offline

**Expected:** Features work offline (local-first)

#### 11.2 Browser Compatibility
- [ ] Test in Chrome - verify all features work
- [ ] Test in Firefox - verify all features work
- [ ] Test in Safari (Mac) - verify all features work
- [ ] Test in Edge - verify all features work

**Expected:** Cross-browser compatibility

#### 11.3 Console Errors
- [ ] Open DevTools Console
- [ ] Perform all major operations:
  - Create/edit/delete collection
  - Open/close palette
  - Search in palette
  - Execute actions
- [ ] Verify **ZERO** console errors
- [ ] Verify no warnings

**Expected:** No errors or warnings in console

#### 11.4 Memory Leaks (Optional)
- [ ] Open DevTools Performance/Memory tab
- [ ] Record memory profile
- [ ] Open/close palette 20 times
- [ ] Create/delete collections 10 times
- [ ] Check memory usage - should not continuously increase

**Expected:** No significant memory leaks

---

## 📊 Testing Summary Template

After completing all tests, fill out this summary:

**Date Tested:** ___________  
**Tester:** ___________  
**Browser(s):** ___________  
**Platform:** Desktop / Mobile / Both

### Results

**Collections (A1):**
- Database Operations: ✅ PASS / ❌ FAIL
- Export/Import: ✅ PASS / ❌ FAIL
- UI/UX: ✅ PASS / ❌ FAIL
- Edge Cases: ✅ PASS / ❌ FAIL

**Command Palette (B2):**
- Keyboard Shortcuts: ✅ PASS / ❌ FAIL
- Search Functionality: ✅ PASS / ❌ FAIL
- Result Rendering: ✅ PASS / ❌ FAIL
- Integration: ✅ PASS / ❌ FAIL
- Mobile/Responsive: ✅ PASS / ❌ FAIL
- Dark Mode: ✅ PASS / ❌ FAIL
- Error Handling: ✅ PASS / ❌ FAIL

### Issues Found

| Issue # | Feature | Description | Severity | Status |
|---------|---------|-------------|----------|--------|
| 1 | | | High/Med/Low | Open/Fixed |
| 2 | | | High/Med/Low | Open/Fixed |

### Overall Assessment

- [ ] **APPROVED** - Both features ready for production
- [ ] **APPROVED WITH MINOR ISSUES** - Can deploy with known issues documented
- [ ] **NEEDS WORK** - Critical issues must be fixed before deployment

**Notes:**
___________________________________________
___________________________________________
___________________________________________

---

## 🎯 Priority Test Scenarios (Quick Smoke Test)

If you only have 15 minutes, test these critical paths:

### Collections (5 min)
1. [ ] Create collection with status filter
2. [ ] Apply collection (verify filters restored)
3. [ ] Delete collection
4. [ ] Export data, clear all, import - verify collections restored

### Command Palette (10 min)
1. [ ] Open with `Ctrl+K`
2. [ ] Search for paper by title - press Enter to navigate
3. [ ] Search for tag - click to filter
4. [ ] Search for "add" - execute "Add New Paper" action
5. [ ] Use arrow keys to navigate, Enter to execute
6. [ ] Press Esc to close
7. [ ] Test in dark mode

If all of these work, the features are likely production-ready!

---

## 📝 Testing Notes

- **IndexedDB:** All data stored locally in browser
- **No Backend:** All operations are client-side
- **Browser Storage:** Clear IndexedDB to reset completely
- **Debug:** Use DevTools Console for error messages
- **Performance:** Features should feel instant (<100ms)

**Happy Testing!** 🚀

