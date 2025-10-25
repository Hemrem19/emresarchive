# System Patterns: Emre's Archive

This document describes the system architecture, design patterns, and key technical decisions.

## Architecture

- **Single-Page Application (SPA):** The application operates as an SPA. A single `index.html` file serves as the entry point. All UI changes and "page" transitions are handled client-side by JavaScript without full page reloads.

- **View-Based Routing:** A simple client-side router will be implemented in `app.js`. This router will dynamically render different HTML "views" (Dashboard, Add/Edit, Details, Settings) into a main container element (`<div id="app">`). The content for these views will be sourced from the existing HTML draft files.

- **Local-First Data Layer:** All application data is stored and managed locally in the browser via IndexedDB. There is no server-side backend. This pattern ensures offline capability and user data privacy.
- **Deferred View Mounting:** To prevent race conditions where view logic attempts to interact with DOM elements before they are fully rendered, the `mount` method of each view is executed asynchronously (e.g., via `setTimeout(fn, 0)`) after its HTML content has been injected into the DOM.
 
## Key Design Patterns

- **Repository Pattern (for Data):** A dedicated service or module will be created to abstract the IndexedDB interactions. This "database service" will provide a clean API for the rest of the application to perform CRUD (Create, Read, Update, Delete) operations on papers, notes, and files, without needing to know the specifics of IndexedDB.
- **Repository Pattern (for Data):** The `db.js` file acts as a repository, abstracting all IndexedDB interactions. It provides a clean, promise-based API (`addPaper`, `getAllPapers`, etc.) for the rest of the application to perform CRUD operations without directly touching IndexedDB APIs.

- **Component-Based UI (Conceptual):** Although we are not using a formal framework like React or Vue, the UI is designed with a component-based mindset. The HTML drafts (`main_dashbord_draft.html`, `paper_details_draft.html`, etc.) represent distinct, reusable views or components that will be managed by the client-side router.
- **View-Based UI:** The UI is conceptually component-based. The `views` object in `app.js` holds HTML templates for each "page" (Home, Details, Settings). The `renderView` function acts as a simple renderer, injecting these templates into the main app container.
 
## Core Modules

1.  **`app.js` (Orchestrator):** The main entry point of the application. It handles routing, global state management (`allPapersCache`), and orchestrates the setup of views by calling functions from other modules.
2.  **`db.js` (Repository):** Implements the Repository Pattern for all IndexedDB interactions. It provides a clean, promise-based API for all CRUD operations, abstracting away the complexities of IndexedDB.
3.  **`views.js` (View Templates):** Contains all the HTML string templates for the different "pages" or components of the application (e.g., home, settings, details). This separates the presentation markup from the application logic.
4.  **`ui.js` (UI Rendering):** A dedicated module for all functions that manipulate the DOM and render UI components. This includes `renderPaperList`, `renderSidebarTags`, `showToast`, and other UI-centric helpers.
5.  **`api.js` (API Layer):** Handles all communication with external APIs. Currently, it contains the `fetchDoiMetadata` function for retrieving paper metadata from `doi.org`.
6.  **View Setup Functions (`setup...` in `app.js`):** Each view has a corresponding setup function (e.g., `setupDashboard`, `setupAddEditPaperForm`) responsible for attaching event listeners and managing the state for that specific view.