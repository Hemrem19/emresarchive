# citavErs Extension Documentation

## 1. Overview
The **citavErs Web Clipper** is a Chrome Extension designed to seamlessly capture research papers from the web and save them directly to the citavErs cloud library. It prioritizes a lightweight, privacy-focused architecture that respects the user's local-first workflow while offering cloud convenience.

## 2. Current Architecture

### 2.1 Authentication Strategy: Explicit Login
We use an **Explicit Login** flow, which is more robust than shared cookies.
*   **Storage:** The JWT Access Token is stored in `chrome.storage.local`.
*   **Flow:**
    1.  User opens extension.
    2.  Extension checks storage for `accessToken`.
    3.  **If missing:** Shows Login UI (Email/Password).
    4.  **If present:** Shows Main UI (Paper Detector).
    5.  **Login:** Sends credentials to `/api/auth/login`, receives token, saves to storage.
    6.  **Logout:** Clears token from storage, returns to Login UI.

### 2.2 Detection Engine
The extension uses a lightweight content script (`content.js`) to detect papers on the active tab using three methods (in order of priority):
1.  **arXiv ID:** Regex match on URL (e.g., `arxiv.org/abs/2310.xxxxx`).
2.  **DOI (URL):** Regex match for DOIs in the URL (e.g., `10.1103/...`).
3.  **DOI (Meta Tags):** Scrapes standard academic meta tags (`citation_doi`, `dc.identifier`, `prism.doi`).

### 2.3 Data Flow (Cloud-Direct)
The extension talks directly to the backend API, bypassing the local web app interface.
1.  **User clicks "Save":**
2.  **Extension:** Sends `POST /api/extension/save` with `{ url, doi, arxivId, title }`.
3.  **Backend:**
    *   Validates JWT.
    *   Fetches full metadata (Title, Authors, Abstract, PDF Link) from CrossRef (DOI) or arXiv API.
    *   Saves paper to the PostgreSQL database.
4.  **Sync:** The next time the user opens the citavErs web app, the sync engine pulls this new paper down to IndexedDB.

## 3. Project Structure (`extension/`)

```
extension/
├── manifest.json       # MV3 Configuration, permissions
├── popup.html          # The UI (Login + Save screens)
├── popup.js            # Main logic (Auth, API calls, UI toggling)
├── content.js          # Scrapes active tab for DOI/arXiv ID
├── background.js       # Service worker (currently minimal)
└── icons/              # Application icons (16, 48, 128)
```

## 4. API Endpoints (Backend)

*   `POST /api/extension/save`
    *   **Headers:** `Authorization: Bearer <token>`
    *   **Body:** `{ doi?: string, arxivId?: string, url?: string, title?: string }`
    *   **Logic:** Fetches metadata server-side and saves to DB.

*   `POST /api/auth/login`
    *   **Body:** `{ email, password }`
    *   **Returns:** `{ success: true, data: { accessToken, user } }`

## 5. Roadmap & Future Improvements

### Phase 1: Core Functionality (✅ Completed)
*   [x] Extension Scaffold (MV3)
*   [x] arXiv & DOI Detection
*   [x] Backend "Save" Endpoint
*   [x] Explicit Login UI

### Phase 2: Enhanced Detection (To Do)
*   [ ] **PDF Detection:** If user is viewing a PDF directly (`.pdf`), attempt to resolve its DOI using its URL or metadata.
*   [ ] **Google Scholar Support:** Parse search results to allow batch saving (advanced).
*   [ ] **Manual Entry:** Allow users to manually enter a DOI if detection fails.

### Phase 3: UX Polish (To Do)
*   [ ] **Tags & Notes:** Allow adding tags/notes directly in the popup before saving.
*   [ ] **Collection Support:** "Save to Collection..." dropdown.
*   [ ] **Duplicate Check:** Check if paper exists *before* user clicks save (show "Already in Library").

### Phase 4: Distribution (To Do)
*   [ ] **Firefox Port:** Test and package for Firefox Add-ons.
*   [ ] **Chrome Web Store:** Prepare screenshots, description, and submit for review.

## 6. Developer Guide

### Installation (Unpacked)
1.  Open Chrome -> `chrome://extensions`
2.  Enable **Developer Mode**.
3.  Click **Load Unpacked**.
4.  Select the `extension/` folder.

### Testing
*   **Localhost:** Change `API_BASE_URL` in `popup.js` to `http://localhost:3000`.
*   **Production:** Keep as `https://emresarchive-production.up.railway.app`.

---
*Last Updated: November 22, 2025*

