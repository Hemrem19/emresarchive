# Tech Context: Emre's Archive

This document outlines the technologies, dependencies, and technical constraints for the project.

## Frontend Stack

- **HTML5:** The core markup language.
- **CSS3:** For styling.
  - **Tailwind CSS:** A utility-first CSS framework used for rapid UI development. It is loaded via a CDN with a JIT compiler.
  - **Custom CSS (`style.css`):** A separate file for styles that are not easily handled by Tailwind utilities, such as the `material-symbols-outlined` font settings.
- **JavaScript (ES6+):** The primary language for application logic.
  - **No Framework:** The project is being built with vanilla JavaScript to keep it lightweight and dependency-free.
  - **ES6 Modules:** The code is organized into modules (`import`/`export`) to improve maintainability and separate concerns.

## Key Web APIs & Libraries

- **IndexedDB:** The in-browser NoSQL database used for all data storage. This is the core of the "local-first" architecture. It will store:
  - Paper metadata (as objects).
  - Notes content (as text/HTML).
  - PDF files (as Blobs).
- **Google Fonts:** Used for the `Manrope` display font.
- **DOI.org API:** Used to fetch paper metadata from a DOI. This is an external network dependency for the "Fetch DOI" and "Quick Add" features.
- **Material Symbols:** Used for icons throughout the application.

## Development Setup

- **Structure:** The application is structured as a Single-Page Application (SPA).
  - `index.html`: The main shell of the application.
  - `app.js`: The main application orchestrator.
  - `db.js`: The database repository layer.
  - `views.js`: Contains all HTML view templates.
  - `ui.js`: Handles UI rendering and manipulation.
  - `api.js`: Manages external API calls.
- **Tooling:** No complex build tools (like Webpack or Vite) are planned. The project relies on browser-native features and CDN-hosted libraries.