# Extension Roadmap & ArXiv Integration Plan

## Phase 1: Core Backend & ArXiv Support
**Goal:** Enable the backend to accept external paper adds and support arXiv identifiers.

1.  **arXiv API Integration**
    *   Update `api.js` (frontend) and `backend/src/lib/` (backend) to support arXiv IDs.
    *   Implement `normalizePaperIdentifier` to accept `arxiv.org` URLs and IDs (e.g., `2310.00123`).
    *   Create `fetchArxivMetadata` function to query the arXiv API (XML parsing required).
    *   Map arXiv metadata to our schema (Journal -> "arXiv", DOI -> null or "10.48550/arXiv.{id}").

2.  **Extension API Endpoint**
    *   Create a new endpoint `POST /api/extension/save` in the backend.
    *   This endpoint accepts `{ url, doi, arxivId, title }`.
    *   It validates the JWT token (shared from the browser session).
    *   It fetches metadata (via DOI or arXiv) server-side.
    *   It saves the paper to the user's cloud database.
    *   It returns success status to the extension.

## Phase 2: Chrome Extension Development
**Goal:** Build the actual browser extension artifact.

1.  **Extension Scaffold**
    *   Create `extension/` directory.
    *   `manifest.json` (MV3): Define permissions (`activeTab`, `scripting`, `cookies`, `storage`).
    *   `background.js`: Service worker to handle API requests.
    *   `popup.html` / `popup.js`: Simple UI to show "Saving..." or "Login Required".

2.  **Content Script (The "Scraper")**
    *   `content.js`: Injected into the active tab.
    *   Logic to scrape the page for DOIs (using regex) or `citation_doi` meta tags.
    *   Logic to detect arXiv IDs from URL.
    *   Sends the found identifier to `background.js`.

3.  **Authentication Bridge**
    *   The extension needs the user's auth token.
    *   **Strategy:** The extension requests the `citavers.com` cookies (permission required).
    *   If a valid session cookie/token exists, it uses it for the API call.
    *   If not, it prompts the user to "Log in to citavErs" (opens a new tab).

## Phase 3: Frontend Integration & Sync
**Goal:** Ensure the saved papers appear in the web app.

1.  **Cloud-to-Local Sync**
    *   The extension writes to the Cloud DB.
    *   The Local Web App needs to know about this new paper.
    *   **Action:** Ensure the existing `sync` logic pulls these new records down on the next app open or sync interval.
    *   **Note:** This confirms the "Cloud-First" approach for the extension. Guest users cannot use this.

2.  **UI Feedback**
    *   When the extension saves a paper, the extension icon should change (e.g., green checkmark).

## Phase 4: Packaging & Distribution
1.  **Build Script:** Simple zip script for the `extension/` folder.
2.  **Developer Mode Guide:** Instructions for users to load unpacked extension.
3.  **Store Prep:** Assets (icons, screenshots) for Chrome Web Store (future step).

---

## Technical Specifications

### 1. arXiv Identifier Logic
*   **Pattern:** `(\d{4}\.\d{4,5}(v\d+)?)`
*   **API:** `http://export.arxiv.org/api/query?id_list={id}`
*   **Mapping:**
    *   `title` -> `entry.title`
    *   `authors` -> `entry.author.name`
    *   `summary` -> `notes` (Abstract)
    *   `link[title=pdf]` -> `pdfUrl`

### 2. Extension Auth Flow
*   **Check:** `chrome.cookies.get({ url: "https://citavers.com", name: "accessToken" })`
*   **If Missing:** Open `https://citavers.com/#/login`
*   **If Present:** Use value in `Authorization: Bearer {token}` header for `POST /api/extension/save`.

### 3. File Structure Changes
```
root/
├── extension/ (NEW)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   └── icons/
├── api/
│   └── arxiv.js (NEW - shared logic if possible, or distinct)
└── backend/src/routes/extension.js (NEW)
```

