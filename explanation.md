📂 Project Identity Card
Name: citavErs (formerly Emre's Archive)
Tagline: "Your Research, Reimagined. Local-First, Privacy-Focused, Beautifully Designed."
Core Philosophy: You own your data. No vendor lock-in. Offline-first reliability with modern web conveniences.
Tech Stack: Vanilla JS, Tailwind CSS, IndexedDB (Local), Node.js/PostgreSQL (Optional Cloud).
Target Audience: Researchers, PhD students, Academics, and anyone tired of clunky reference managers like Mendeley or Zotero.
📝 Content Pillar 1: The "Why Switch?" (Problem/Solution)
Use these points for threads, carousel posts, or "vs" comparison videos.
The Problem: The "Old Guard" (Mendeley/Zotero)
Clunky Interfaces: Existing tools feel like software from 2010. They are powerful but slow and ugly.
Data Lock-in: Mendeley stores your data on Elsevier's servers. If they kill a feature (like they did the desktop app), you're stuck.
Privacy Concerns: Your reading habits and research data are valuable. Why give them away?
Online Dependency: Many modern tools break if your internet cuts out.
The Solution: citavErs
Local-First Architecture: Your data lives in your browser (IndexedDB). It works 100% offline.
Modern UX: A fluid, single-page application (SPA) that feels like a modern app, not a spreadsheet.
Visual Discovery: The Network Graph visualizes how your papers are connected, turning a list of text into a map of knowledge.
Freedom: Export everything (JSON/RIS) at any time. No questions asked.
💎 Content Pillar 2: Feature Spotlights
Use these for "Feature of the Week" posts or short demo videos.
1. 🕸️ Interactive Network Graph
The Hook: "Stop looking at lists. Start seeing connections."
Description: A dynamic visualization where papers are nodes and relationships are links.
Visual Idea: A video showing nodes bouncing as you drag them, color-coded by "Read" status. Zoom in to find a cluster of unread papers.
2. ⚡ Command Palette (Ctrl+K)
The Hook: "Manage your library at the speed of thought."
Description: Access every feature without lifting your hands from the keyboard. Search papers, toggle themes, or export data instantly.
Visual Idea: A split-screen showing a mouse user clicking through menus vs. a citavErs user typing Ctrl+K -> "Add" -> Done.
3. 📄 Professional PDF Viewer
The Hook: "Read, annotate, and focus without leaving the app."
Description: Built-in PDF engine (PDF.js) with search, zoom, and dark mode support.
Visual Idea: Show the smooth transition from "Dark Mode" dashboard to "Dark Mode" PDF reading experience.
4. 🔄 Conflict-Free Sync
The Hook: "Local privacy, cloud convenience."
Description: Works offline by default. When you go online, it syncs changes to the cloud using a "Last-Write-Wins" strategy, preventing data loss.
Technical Note: Uses a smart "Hard Delete" workflow to ensure no duplicate DOIs ever mess up your library.
5. 🏷️ Smart Batch Operations
The Hook: "Organize 100 papers as easily as 1."
Description: Select multiple papers to bulk-tag, change status, or export bibliographies in 6 different formats (APA, IEEE, Harvard, etc.).
🛠️ Content Pillar 3: The "Technical Deep Dive"
Use this for developer-focused content (Dev.to, Reddit r/webdev, Twitter tech circles).
"How We Built a Complex App with 0 Frameworks"
The Angle: In a world of React/Next.js, citavErs is built with Vanilla JavaScript and No Build Step.
Architecture:
View-Based Routing: Custom router handles hash changes (#/details/:id) and mounts/unmounts distinct View Modules.
Repository Pattern: db.js abstracts IndexedDB calls, allowing the UI to be agnostic about where data comes from (Local vs. Cloud).
Deferred Mounting: Uses setTimeout(fn, 0) to prevent race conditions during DOM injection.
The Win: 167 automated tests passing, 100% coverage on core logic, and the app loads instantly because there's no massive bundle to parse.
🎨 Visuals & Media Briefs
Ideas for images/videos you can create.
Image 1: The "Clean Desk" Comparison
Left Side (Messy): Screenshot of a cluttered Mendeley/Zotero interface with popups.
Right Side (Clean): citavErs Dashboard in Dark Mode. Clean typography, tag chips, and progress bars.
Caption: "Research doesn't have to be messy."
Image 2: The Architecture Diagram
Visual: A simple flow chart showing:
User Action -> View Module -> Repository (db.js) -> IndexedDB (Browser) <--> Sync Service <--> PostgreSQL
Caption: "Local-First Architecture: Speed by default, Sync by choice."
Video: The "Offline Test"
Action: Record screen.
Load citavErs.
Turn off Wi-Fi (Show icon).
Search for a paper, open a PDF, add a note.
Turn on Wi-Fi.
Show "Sync Complete" toast notification.
Caption: "The internet went down. My research didn't."
📣 Social Media Copy Drafts
Tweet / X Thread
> 🧵 I built a research manager because I was tired of waiting for Zotero to look good.
>
> Meet citavErs:
> ✅ Local-First (Your data is YOURS)
> ✅ Interactive Graph View
> ✅ 100% Offline Capable
> ✅ No Frameworks (Vanilla JS + Tailwind)
>
> Here's why it's different 👇 [Link]
LinkedIn Post
> Research Data Privacy Matters.
>
> Many academics don't realize their reference managers track their reading habits. That's why I built citavErs with a "Local-First" philosophy.
>
> By default, your library lives entirely in your browser's IndexedDB. No servers, no tracking. Cloud sync is purely optional.
>
> It proves you don't need to sacrifice modern UX for privacy. We built a reactive, single-page application using pure Vanilla JavaScript—no frameworks attached.
>
> Check it out here: [Link] #OpenSource #Privacy #AcademicTwitter #WebDev
Instagram/TikTok Script
> (Face to camera)
> "Are you still using this?" (Show screenshot of old Mendeley)
> "It's time to upgrade."
> (Cut to screen recording of citavErs)
> "This is citavErs. It's free, it's open-source, and it actually looks good."
> (Show Graph View)
> "It visualizes your research connections..."
> (Show PDF Dark Mode)
> "...and lets you read in true dark mode."
> "Best part? It
works offline. Link in bio."