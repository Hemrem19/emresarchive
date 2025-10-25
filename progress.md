# Project Progress

This file tracks the progress of the research paper manager project.

## Phase 1: Project Setup & UI Shell

- [X] **[DONE]** Review project requirements from `draft_features.md` and HTML drafts.
- [X] **[DONE]** Create `progress.md` to track progress.
- [X] **[DONE]** Create the main `index.html` file by combining the existing HTML drafts into a single-page application structure.
- [X] **[DONE]** Create a `style.css` file and move the custom styles from the HTML drafts into it.
- [X] **[DONE]** Create an `app.js` file for the application logic.
- [X] **[DONE]** Integrate the content for the "Add/Edit Paper" view into `app.js` and add a form ID.

## Phase 2: Core Functionality

- [X] **[DONE]** Implement the database service for IndexedDB.
- [X] **[DONE]** Implement the client-side router to switch between views.
- [X] **[DONE]** Implement the paper dashboard view:
    - [X] **[DONE]** Render the list of papers from the database.
    - [X] **[DONE]** Implement search and sort functionality.
    - [X] **[DONE]** Implement delete functionality for papers.
    - [X] **[DONE]** Implement reading status dropdown and update functionality.
- [X] **[DONE]** Implement the "Add/Edit Paper" view:
    - [X] **[DONE]** Create a form to add and edit paper details.
    - [X] **[DONE]** Implement file upload for PDFs (storage in IndexedDB).
    - [X] **[DONE]** Save paper details and the file to the database.
    - [X] **[DONE]** Implement edit functionality by pre-filling the form.
    - [X] **[DONE]** Add confirmation dialog for unsaved changes.
- [X] **[DONE]** Implement the "Paper Details" view:
    - [X] **[DONE]** Display paper metadata.
    - [X] **[DONE]** Implement the rich text editor for notes.
    - [X] **[DONE]** Implement note saving to the database.
    - [X] **[DONE]** Implement PDF download.

## Phase 3: Settings & Finalization

- [X] **[DONE]** Implement the "Settings" view:
    - [X] **[DONE]** Implement the export functionality.
    - [X] **[DONE]** Implement the import functionality.
    - [X] **[DONE]** Add dark mode toggle.
- [X] **[DONE]** Final testing and bug fixes.

## Known Issues & Bug Fixes

- [X] **[FIXED]** Clicking anywhere on a paper card navigates to the details view. The clickable area has been restricted to the paper title.
- [X] **[FIXED]** The delete button on paper cards was not functional. The event listener has been corrected.
- [X] **[FIXED]** A critical routing bug caused the application to fail on load. The routing logic has been corrected.
- [X] **[FIXED]** The "Quick Add" feature was creating duplicate event listeners, causing exponential additions. This has been refactored to only update the data model and re-render the view.
- [X] **[FIXED]** A syntax error in the `add/edit` form submission handler was preventing the app from loading. This has been corrected.
- [X] **[FIXED]** Sidebar scrolling was dependent on main content length, pushing the settings button off-screen. This has been corrected with `position: sticky`.
- [X] **[FIXED]** Statistics on the settings page were not rendering correctly due to a DOM update issue. This was resolved by ensuring elements exist before attaching listeners.
- [X] **[FIXED]** Papers list became invisible after refactoring due to a missing filter function. This has been restored.
- [X] **[FIXED]** Critical loading issue where pages appeared blank. This was due to a race condition where view `mount` methods were executed before the DOM was fully updated with the new HTML. Resolved by deferring view `mount` execution using `setTimeout(fn, 0)`.

## Enhancements

- [X] **[DONE]** Add feature to automatically fetch paper metadata from a DOI link.
- [X] **[DONE]** Add "Quick Add" feature to add papers directly from the dashboard using a DOI.
- [X] **[DONE]** Add PDF preview feature to the paper details view.
- [X] **[DONE]** Add feature to link related papers together.
- [X] **[DONE]** Make the logo link to the main page.
- [X] **[DONE]** Enhance search to include paper notes.
- [X] **[DONE]** Make the sidebar tags functional for filtering.
- [X] **[DONE]** Make the sidebar responsive with a slide-out menu for mobile.
- [X] **[DONE]** Add sorting by reading status.
- [X] **[DONE]** Add status filters to the sidebar for quick navigation.
- [X] **[DONE]** Add a file preview to the PDF upload form.
- [X] **[DONE]** Improve mobile-friendliness of main content layouts and forms.
- [X] **[DONE]** Fix sidebar to be scrollable, ensuring the settings button is always visible.
- [X] **[DONE]** Add an expandable "Advanced" section to the "Add Paper" form.
- [X] **[DONE]** Add library statistics to the settings page.
- [X] **[DONE]** Refactor monolithic `app.js` into smaller, more manageable modules (`ui.js`, `views.js`, `api.js`).
