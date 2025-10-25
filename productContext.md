# Product Context: Emre's Archive

## The "Why"

This project exists to provide researchers, students, and academics with a free, private, and offline-capable tool for managing their research papers. Commercial solutions often involve subscriptions, cloud storage with privacy concerns, or a lack of user control over data. This application aims to solve that by being a "local-first" tool where the user is in complete control.

## User Experience Goals

- **Simplicity:** The interface should be clean, intuitive, and focused on the core tasks of adding, finding, and annotating papers.
- **Offline-First:** The application must be fully functional without an internet connection. All data is stored locally in the browser.
- **Data Ownership:** The user must be able to easily export all their data (including notes and PDFs) into a single backup file and import it into another browser or computer. This is a non-negotiable feature that ensures data portability and prevents lock-in.
- **Responsive Design:** The UI is fully responsive and optimized for a seamless experience across different screen sizes, from desktops to mobile phones.

## User Flow

1.  **Dashboard:** The user lands on the main dashboard, which displays a list of all their papers.
2.  **Adding a Paper:** The user clicks "Add Paper" to navigate to a form where they can input metadata and optionally upload a PDF.
    - Alternatively, the user can use the "Quick Add" feature on the dashboard to add a paper by its DOI. The user can also filter the list of papers by tag or reading status using the sidebar.
3.  **Viewing Details:** The user clicks on a paper from the dashboard to go to the details view.
4.  **Taking Notes:** In the details view, the user can read paper metadata, preview the PDF, and write/format notes in a rich text editor. They can also download the attached PDF and link to related papers.
5.  **Managing Data:** From a dedicated "Settings" view, the user can export their entire library for backup or import a previous backup to restore their data.