🎯 Core Features: The Foundation

This is the essential functionality your app needs to be useful.

    Paper Dashboard:

        This is your home screen. A clean, simple list of all the papers you've added.

        Each entry should show the Title, main Author(s), Year, and your custom Reading Status (To Read, Reading, Finished).

        A visual indicator (like a paperclip icon 📎) should show if you've attached a file to an entry.

    Add/Edit Paper Form:

        A straightforward form to input the paper's details manually:

            Title

            Authors

            Journal / Conference

            Publication Year

            URL or DOI (as a reference link)

        Optional File Upload: A button to attach the paper's PDF. The app will store this file, but not display it.

        Tags Field: A place to add keywords or tags (e.g., #machine-learning, #project-alpha).

    Paper Detail & Notes View:

        Clicking a paper in the dashboard takes you here.

        Metadata Display: Clearly shows all the information you entered.

        Download Button: If a file is attached, a prominent "Download PDF" button will be visible.

        Rich Notes Editor: This is the heart of the app. A simple but powerful text area where you can write and format your thoughts. It should support:

            Bold, italics, and underlining.

            Bulleted and numbered lists.

            Hyperlinks.

📦 Data Handling: Keeping it Free and User-Controlled

This is how you'll manage the data without relying on paid services.

    Local-First Storage: The best approach is to store all your data directly in the browser using IndexedDB.

        Why IndexedDB? It's a robust, built-in browser database that can handle everything you need—from structured data (like paper titles and your notes) to the PDF files themselves (as Blobs).

        Benefit: The application will be incredibly fast and will work completely offline. You are not dependent on any company's servers.

    Import/Export Functionality: This is CRITICAL for a local-first app. You must have:

        Export to File: A button to download your entire library (all metadata, notes, and even the stored PDFs) into a single file (like a .json or .zip). This is your backup.

        Import from File: A way to upload that backup file to restore your entire library on a new computer or a different browser. This gives you full ownership and portability of your data.