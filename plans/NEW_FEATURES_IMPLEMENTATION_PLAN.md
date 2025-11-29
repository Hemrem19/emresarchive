# New Features Implementation Plan

## 📋 Table of Contents

1. [Overview](#overview)
2. [Feature 1: Paper Rating System](#feature-1-paper-rating-system)
3. [Feature 2: Paper Details Tabs Enhancement](#feature-2-paper-details-tabs-enhancement)
4. [Implementation Timeline](#implementation-timeline)
5. [Dependencies & Risks](#dependencies--risks)

---

## Overview

This document outlines the implementation plan for two new features requested in `new_ideas.md`:

1. **Paper Rating System**: Allow users to rate papers and sort by rating
2. **Paper Details Tabs**: Add Abstract and Summary tabs alongside Notes

Both features enhance user experience by providing better organization and information access.

---

## Feature 1: Paper Rating System

### Goal
Enable users to rate papers (1-10 scale) and sort their library by rating to quickly identify high-quality or important papers.

### Requirements

#### Functional Requirements
1. **Rating Input**
   - Users can assign a rating to any paper (1-10 scale)
   - Rating can be set from paper details page
   - Rating can be set from paper card (quick action)
   - Rating can be cleared/reset
   - Numeric input or slider interface (1-10)

2. **Rating Display**
   - Show rating in paper cards on dashboard
   - Show rating in paper details page
   - Display as numeric value (e.g., "8/10") or visual indicator
   - Show "Unrated" for papers without rating

3. **Sorting**
   - Add "Sort by Rating" option to sort dropdown
   - Sort by highest rating first (default)
   - Sort by lowest rating first (optional)
   - Unrated papers appear at the end (or beginning, configurable)

4. **Filtering** (Optional - Future Enhancement)
   - Filter by minimum rating (e.g., "7/10 and above")
   - Filter by rating range (e.g., "8-10")

#### Non-Functional Requirements
- Rating stored in database (IndexedDB + PostgreSQL)
- Rating synced with cloud (if cloud sync enabled)
- Rating included in export/import
- Backward compatible (existing papers have no rating = null)

### Technical Design

#### Database Schema Changes

**IndexedDB (Local)**
```javascript
// Add to paper object:
{
  // ... existing fields ...
  rating: number | null,  // 1-10 scale, null if unrated
}
```

**PostgreSQL (Backend)**
```sql
-- Migration: Add rating column
ALTER TABLE papers ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 10);
```

**Prisma Schema Update**
```prisma
model Paper {
  // ... existing fields ...
  rating        Int?      // 1-10 scale, nullable
  // ... rest of fields ...
}
```

#### Data Structure

```javascript
// Paper object with rating
{
  id: 1,
  title: "Example Paper",
  // ... other fields ...
  rating: 8,  // 1-10 scale, null if unrated
}
```

### UI/UX Design

#### Paper Details Page - Rating Section

**Location**: In the sidebar, below status or in metadata section

**Option 1: Numeric Display with Slider**
```
┌─────────────────────────────┐
│ Rating                      │
│ 8/10                        │
│ [━━━━━━━━━━] 8              │
│ [Click to rate]             │
└─────────────────────────────┘
```

**Option 2: Numeric Display with Dropdown**
```
┌─────────────────────────────┐
│ Rating                      │
│ [8/10 ▼]                    │
│ Select: 1 2 3 4 5 6 7 8 9 10│
│ [Clear Rating]              │
└─────────────────────────────┘
```

**Option 3: Visual Scale (10 segments)**
```
┌─────────────────────────────┐
│ Rating                      │
│ ████████░░ (8/10)           │
│ Click to rate               │
│ [Clear Rating]              │
└─────────────────────────────┘
```

**Interactive Rating Input:**
- Slider: Drag to set rating (1-10)
- Dropdown: Select from 1-10
- Visual scale: Click on segments
- Hover to preview rating
- Click on current rating to clear
- Visual feedback (filled/empty segments or numeric display)

#### Paper Card - Rating Display

**Option 1: Numeric Badge**
```
┌─────────────────────────────┐
│ Paper Title                 │
│ Authors                     │
│ [8/10]                      │
└─────────────────────────────┘
```

**Option 2: Visual Indicator**
```
┌─────────────────────────────┐
│ Paper Title                 │
│ Authors                     │
│ ████████░░ 8/10             │
└─────────────────────────────┘
```

**Option 3: Compact Numeric**
```
┌─────────────────────────────┐
│ Paper Title                 │
│ Authors                     │
│ ⭐ 8                        │
└─────────────────────────────┘
```

#### Rating Input Modal/Component

**Slider Input:**
```
Rate this paper (1-10):
[━━━━━━━━━━━━━━━━━━━━] 8
1    2    3    4    5    6    7    8    9    10
[Clear Rating]
```

**Dropdown Input:**
```
Rate this paper:
[Select Rating ▼]
  1 - Poor
  2
  3
  4
  5 - Average
  6
  7
  8 - Good
  9
  10 - Excellent
[Clear Rating]
```

### Implementation Steps

#### Phase 1: Database & Data Layer (4-6 hours)

1. **Database Migration**
   - [ ] Update IndexedDB schema (add rating field)
   - [ ] Create migration script for existing papers
   - [ ] Update backend Prisma schema
   - [ ] Create backend migration
   - [ ] Update validation schemas

2. **Data Access Layer**
   - [ ] Update `db/papers.js`:
     - Add rating to `addPaper()` function
     - Add rating to `updatePaper()` function
     - Ensure rating is included in all queries
   - [ ] Update `api/papers.js`:
     - Include rating in API requests/responses
   - [ ] Update backend controllers:
     - Add rating to paper creation/update
     - Add rating validation

3. **Export/Import Support**
   - [ ] Include rating in `exportAllData()`
   - [ ] Handle rating in `importData()`
   - [ ] Test export/import with ratings

#### Phase 2: UI Components (6-8 hours)

1. **Rating Component**
   - [ ] Create `components/rating-input.js`:
     - Reusable rating component (1-10 scale)
     - Props: `value`, `onChange`, `readOnly`, `displayMode`
     - Methods: `render()`, `handleChange()`, `handleSlider()`, `handleDropdown()`
     - Support multiple input modes: slider, dropdown, visual scale
   - [ ] Styles for rating display (numeric, visual indicator)
   - [ ] Accessibility (keyboard navigation, ARIA labels, screen reader support)

2. **Paper Details Integration**
   - [ ] Add rating section to `details/index.js`
   - [ ] Integrate rating component (slider or dropdown)
   - [ ] Add save handler for rating changes
   - [ ] Update paper when rating changes

3. **Paper Card Integration**
   - [ ] Add rating display to paper card template
   - [ ] Show rating in `dashboard/view.js` or card component
   - [ ] Optional: Quick rating from card (hover/click)

#### Phase 3: Sorting Functionality (3-4 hours)

1. **Sort Function**
   - [ ] Update `ui.js` `sortPapers()` function:
     - Add `'rating_desc'` case
     - Add `'rating_asc'` case (optional)
     - Handle null ratings (unrated papers)
   - [ ] Test sorting with various rating combinations

2. **UI Integration**
   - [ ] Add "Rating (Highest First)" to sort dropdown
   - [ ] Add "Rating (Lowest First)" to sort dropdown (optional)
   - [ ] Update sort state management

#### Phase 4: Testing & Polish (3-4 hours)

1. **Unit Tests**
   - [ ] Test rating storage/retrieval
   - [ ] Test sorting by rating
   - [ ] Test rating validation (1-10 range)
   - [ ] Test null/unrated handling

2. **Integration Tests**
   - [ ] Test rating from details page
   - [ ] Test rating from card (if implemented)
   - [ ] Test sorting with ratings
   - [ ] Test export/import with ratings
   - [ ] Test cloud sync with ratings

3. **Edge Cases**
   - [ ] Papers without rating
   - [ ] All papers with same rating
   - [ ] Rating changes and sorting updates
   - [ ] Rating in filtered views

### File Changes

#### New Files
```
components/
  └── rating-input.js         # Reusable rating component (1-10 scale)

db/migrations/
  └── add-rating-field.js     # Migration script for IndexedDB
```

#### Modified Files
```
db/papers.js                  # Add rating field support
db/core.js                    # Update schema version
api/papers.js                 # Include rating in API
backend/prisma/schema.prisma # Add rating column
backend/src/lib/validation.js # Add rating validation
details/index.js              # Add rating UI
dashboard/view.js             # Show rating in cards
ui.js                         # Add rating sort
views/index.js                # Update paper card template
```

### Rating Scale Decision

**Chosen: 1-10 Scale**
- ✅ More granular - allows finer distinctions between papers
- ✅ Better for detailed analysis and research evaluation
- ✅ Familiar scale (like academic grading, IMDB ratings)
- ✅ Numeric display is clear and precise
- ✅ Supports slider, dropdown, or visual scale UI options

**UI Options for 1-10 Scale:**
- **Slider**: Intuitive drag-to-rate interface
- **Dropdown**: Precise selection from 1-10
- **Visual Scale**: 10 segments (like progress bar) for quick selection
- **Numeric Input**: Direct number entry

**Display Options:**
- Numeric: "8/10" (clear and compact)
- Visual: Progress bar style "████████░░ 8/10"
- Badge: "[8/10]" or "[8]" for cards

**Decision: 1-10 Scale** - Provides better granularity for research paper evaluation

### Estimated Effort

- **Phase 1**: 4-6 hours
- **Phase 2**: 6-8 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 3-4 hours
- **Total**: 16-22 hours

---

## Feature 2: Paper Details Tabs Enhancement

### Goal
Enhance the paper details view by adding Abstract and Summary tabs alongside the existing Notes tab, providing better organization of paper information.

### Requirements

#### Functional Requirements
1. **Abstract Tab**
   - Display paper abstract (from `paper.abstract` field)
   - Read-only display (abstract comes from metadata)
   - Format text appropriately (line breaks, paragraphs)
   - Show "No abstract available" if missing

2. **Summary Tab**
   - User-editable summary field (separate from notes)
   - Rich text editor (same as notes)
   - Save summary to database
   - Display existing summary if available

3. **Tab Navigation**
   - Three tabs: Notes, Abstract, Summary
   - Active tab highlighted
   - Smooth tab switching
   - Preserve scroll position (optional)

4. **Data Persistence**
   - Summary stored in database
   - Summary included in export/import
   - Summary synced with cloud

#### Non-Functional Requirements
- Backward compatible (existing papers have no summary)
- Abstract is read-only (from metadata)
- Summary is editable (user content)
- Consistent UI with existing Notes tab

### Technical Design

#### Database Schema Changes

**IndexedDB (Local)**
```javascript
// Add to paper object:
{
  // ... existing fields ...
  abstract: string | null,  // Already exists, from DOI metadata
  summary: string | null,   // NEW: User-written summary (HTML)
}
```

**PostgreSQL (Backend)**
```sql
-- Abstract already exists in schema
-- Add summary column:
ALTER TABLE papers ADD COLUMN summary TEXT;
```

**Prisma Schema Update**
```prisma
model Paper {
  // ... existing fields ...
  abstract        String?   @db.Text  // Already exists
  summary         String?   @db.Text  // NEW: User summary
  // ... rest of fields ...
}
```

#### Data Structure

```javascript
// Paper object
{
  id: 1,
  title: "Example Paper",
  abstract: "This is the paper abstract from DOI metadata...",  // Read-only
  summary: "<p>My personal summary of this paper...</p>",       // Editable
  notes: "<p>My detailed notes...</p>",                        // Editable
}
```

### UI/UX Design

#### Tab Navigation

```
┌─────────────────────────────────────────┐
│ [Notes] [Abstract] [Summary]           │
├─────────────────────────────────────────┤
│                                         │
│  Tab Content Area                       │
│                                         │
└─────────────────────────────────────────┘
```

**Tab States:**
- Active: Primary color border, bold text
- Inactive: Gray text, no border
- Hover: Slight background color change

#### Abstract Tab

**Layout:**
```
┌─────────────────────────────────────────┐
│ Abstract                                │
├─────────────────────────────────────────┤
│                                         │
│ [Abstract text displayed here]          │
│                                         │
│ Line breaks preserved                   │
│ Paragraphs formatted nicely             │
│                                         │
│ [No abstract available] (if missing)    │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Read-only text display
- Proper text formatting
- Scrollable if long
- Copy to clipboard button (optional)

#### Summary Tab

**Layout:**
```
┌─────────────────────────────────────────┐
│ Summary                                  │
├─────────────────────────────────────────┤
│ [B] [I] [•] [1] [H1] [H2] [Code]        │
├─────────────────────────────────────────┤
│                                         │
│ [Rich text editor - same as notes]      │
│                                         │
│ User can write summary here             │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Same rich text editor as Notes tab
- Auto-save on blur/change
- Same toolbar as Notes
- Placeholder text: "Write a summary of this paper..."

### Implementation Steps

#### Phase 1: Database & Data Layer (3-4 hours)

1. **Database Migration**
   - [ ] Update IndexedDB schema (add summary field)
   - [ ] Create migration script
   - [ ] Update backend Prisma schema
   - [ ] Create backend migration
   - [ ] Update validation schemas

2. **Data Access Layer**
   - [ ] Update `db/papers.js`:
     - Add summary to `addPaper()` function
     - Add summary to `updatePaper()` function
     - Ensure summary is included in queries
   - [ ] Update `api/papers.js`:
     - Include summary in API requests/responses
   - [ ] Update backend controllers:
     - Add summary to paper creation/update

3. **Export/Import Support**
   - [ ] Include summary in `exportAllData()`
   - [ ] Handle summary in `importData()`

#### Phase 2: Tab System (4-5 hours)

1. **Tab Component**
   - [ ] Create tab navigation HTML structure
   - [ ] Add tab switching logic
   - [ ] Add active tab styling
   - [ ] Handle tab click events

2. **Tab Content Panels**
   - [ ] Create Notes panel (existing, refactor if needed)
   - [ ] Create Abstract panel (new)
   - [ ] Create Summary panel (new)
   - [ ] Show/hide panels based on active tab

3. **State Management**
   - [ ] Track active tab
   - [ ] Preserve tab state (optional: in URL hash)
   - [ ] Handle tab switching animations

#### Phase 3: Abstract Tab (2-3 hours)

1. **Abstract Display**
   - [ ] Render abstract text in Abstract tab
   - [ ] Format text (preserve line breaks)
   - [ ] Handle missing abstract gracefully
   - [ ] Add styling for readability

2. **Optional Features**
   - [ ] Copy to clipboard button
   - [ ] Text selection enabled
   - [ ] Responsive layout

#### Phase 4: Summary Tab (4-6 hours)

1. **Summary Manager**
   - [ ] Create `details/summary.manager.js`:
     - Similar to `notes.manager.js`
     - Initialize summary editor
     - Handle save operations
     - Auto-save functionality

2. **Rich Text Editor**
   - [ ] Reuse notes editor component
   - [ ] Initialize for summary field
   - [ ] Add toolbar (same as notes)
   - [ ] Handle content changes

3. **Integration**
   - [ ] Add summary tab to details view
   - [ ] Connect summary manager
   - [ ] Handle save/update operations
   - [ ] Show existing summary on load

#### Phase 5: Testing & Polish (3-4 hours)

1. **Unit Tests**
   - [ ] Test summary storage/retrieval
   - [ ] Test abstract display
   - [ ] Test tab switching
   - [ ] Test editor functionality

2. **Integration Tests**
   - [ ] Test all three tabs
   - [ ] Test summary editing and saving
   - [ ] Test abstract display
   - [ ] Test export/import with summary
   - [ ] Test cloud sync with summary

3. **Edge Cases**
   - [ ] Papers without abstract
   - [ ] Papers without summary
   - [ ] Very long abstract/summary
   - [ ] Tab switching during edit
   - [ ] Unsaved changes warning (optional)

### File Changes

#### New Files
```
details/
  └── summary.manager.js     # Summary editor manager (similar to notes.manager.js)

db/migrations/
  └── add-summary-field.js    # Migration script for IndexedDB
```

#### Modified Files
```
db/papers.js                  # Add summary field support
db/core.js                    # Update schema version
api/papers.js                 # Include summary in API
backend/prisma/schema.prisma # Add summary column (if not exists)
backend/src/lib/validation.js # Add summary validation
details/index.js              # Add tabs, Abstract tab, Summary tab
details/notes.manager.js      # Review for reuse patterns
views/index.js                # Update details template
```

### Tab Implementation Approach

**Option 1: Simple Show/Hide**
- Show active tab panel, hide others
- Simple CSS display toggle
- Fast, no animations

**Option 2: Fade Transition**
- Smooth fade between tabs
- Better UX
- Slightly more complex

**Option 3: Slide Transition**
- Slide animation between tabs
- Most polished
- Most complex

**Decision: Option 1 (Simple Show/Hide)** - Can enhance later if needed

### Estimated Effort

- **Phase 1**: 3-4 hours
- **Phase 2**: 4-5 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 4-6 hours
- **Phase 5**: 3-4 hours
- **Total**: 16-22 hours

---

## Implementation Timeline

### Combined Timeline

Both features can be implemented in parallel or sequentially. Recommended approach:

#### Week 1: Database & Core Infrastructure
- **Day 1-2**: Feature 1 - Database migration & data layer
- **Day 3-4**: Feature 2 - Database migration & data layer
- **Day 5**: Testing database changes, export/import

#### Week 2: UI Components
- **Day 1-2**: Feature 1 - Star rating component & details integration
- **Day 3-4**: Feature 2 - Tab system & Abstract tab
- **Day 5**: Feature 2 - Summary tab implementation

#### Week 3: Integration & Polish
- **Day 1-2**: Feature 1 - Card display & sorting
- **Day 3**: Feature 1 - Testing & polish
- **Day 4**: Feature 2 - Testing & polish
- **Day 5**: Combined testing, documentation, final polish

### Sequential Implementation (Alternative)

If implementing sequentially:

1. **Feature 1 First** (Rating System)
   - Week 1: Database & data layer
   - Week 2: UI components & sorting
   - Week 3: Testing & polish

2. **Feature 2 Second** (Tabs Enhancement)
   - Week 1: Database & data layer
   - Week 2: Tab system & content panels
   - Week 3: Testing & polish

### Total Estimated Time

- **Feature 1**: 16-22 hours
- **Feature 2**: 16-22 hours
- **Combined**: 32-44 hours (if done in parallel, can reduce to ~28-36 hours)

---

## Dependencies & Risks

### Dependencies

#### Feature 1 (Rating)
- ✅ No external dependencies
- ✅ Uses existing database infrastructure
- ✅ Uses existing UI components (can reuse patterns)
- ⚠️ Requires database migration (backward compatible)

#### Feature 2 (Tabs)
- ✅ No external dependencies
- ✅ Reuses existing notes editor
- ✅ Uses existing database infrastructure
- ⚠️ Requires database migration (backward compatible)

### Risks

#### Technical Risks

1. **Database Migration**
   - **Risk**: Migration fails on existing data
   - **Mitigation**: Test migrations thoroughly, provide rollback

2. **Cloud Sync Compatibility**
   - **Risk**: New fields not syncing correctly
   - **Mitigation**: Test sync thoroughly, handle null values

3. **Performance**
   - **Risk**: Additional fields slow down queries
   - **Mitigation**: Fields are lightweight, minimal impact expected

#### UX Risks

1. **Rating System**
   - **Risk**: Users confused by rating vs status
   - **Mitigation**: Clear labeling, tooltips, documentation

2. **Tab System**
   - **Risk**: Too many tabs clutter interface
   - **Mitigation**: Three tabs is manageable, can collapse if needed

3. **Summary vs Notes**
   - **Risk**: Users confused about difference
   - **Mitigation**: Clear labels, help text, documentation

### Mitigation Strategies

1. **Backward Compatibility**
   - All new fields nullable
   - Existing papers work without new fields
   - Gradual migration

2. **Testing**
   - Comprehensive unit tests
   - Integration tests
   - User acceptance testing

3. **Documentation**
   - Update user docs
   - Add tooltips/help text
   - Update API documentation

---

## Success Criteria

### Feature 1: Rating System

- ✅ Users can rate papers (1-10 scale)
- ✅ Rating displayed in cards and details
- ✅ Sort by rating works correctly
- ✅ Rating persists across sessions
- ✅ Rating syncs with cloud
- ✅ Rating included in export/import
- ✅ No performance degradation

### Feature 2: Tabs Enhancement

- ✅ Three tabs visible and functional
- ✅ Abstract displays correctly
- ✅ Summary editable and saves
- ✅ Tab switching smooth
- ✅ Data persists correctly
- ✅ Export/import includes summary
- ✅ Cloud sync works with summary
- ✅ No performance issues

---

## Future Enhancements

### Rating System

1. **Advanced Filtering**
   - Filter by minimum rating
   - Filter by rating range
   - Show only unrated papers

2. **Rating Analytics**
   - Average rating across library
   - Rating distribution chart
   - Most highly rated papers collection

3. **Rating Reasons**
   - Add notes/comments to ratings
   - Tag reasons (quality, relevance, etc.)

### Tabs Enhancement

1. **Additional Tabs**
   - Citations tab
   - Related Papers tab
   - Annotations tab

2. **Tab Customization**
   - User can show/hide tabs
   - Reorder tabs
   - Custom tab names

3. **Tab Persistence**
   - Remember last active tab
   - URL hash for tab state
   - Deep linking to specific tab

---

## Conclusion

Both features enhance citavErs by providing:
- **Better Organization**: Rating system helps prioritize papers
- **Better Information Access**: Tabs organize paper information clearly
- **Improved UX**: More intuitive and feature-rich interface

Implementation is straightforward with minimal risks. Both features are backward compatible and can be implemented incrementally.

**Recommended Approach**: Implement Feature 1 first (simpler), then Feature 2. This allows for learning and refinement between implementations.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Ready for Implementation

