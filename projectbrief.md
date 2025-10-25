# Project Brief: Emre's Archive

This document outlines the core requirements and goals for the Research Hub application. It serves as the source of truth for the project's scope.

## 🎯 Core Objective

To create a simple, free, and user-controlled research paper management application. The application will be a single-page, offline-first web app that runs entirely in the browser, giving users full ownership of their data.

## Core Features

### 1. Paper Dashboard
- A home screen listing all added papers.
- Each entry will display: Title, Author(s), Year, and Reading Status.
- A visual indicator will show if a PDF file is attached.
- Functionality for searching and sorting papers.

### 2. Add/Edit Paper Form
- A form for manual entry of paper details:
  - Title
  - Authors (comma-separated)
  - Journal / Conference
  - Publication Year
  - URL or DOI
  - Tags (comma-separated)
- Optional PDF file upload.

### 3. Paper Detail & Notes View
- Displays all metadata for a selected paper.
- A "Download PDF" button and an embedded PDF previewer if a file is attached.
- A rich text editor for taking notes, supporting:
  - Bold, italics
  - Bulleted and numbered lists
- A feature to link to other related papers.

### 4. Data Management
- **Local-First Storage:** All data (metadata, notes, and PDF files) will be stored in the browser using IndexedDB.
- **Import/Export:** Critical functionality to allow users to back up their entire library to a single file and restore it, ensuring data portability and ownership.