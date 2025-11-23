/**
 * Views Module Aggregator
 * Exports all view templates from modular files
 * This maintains backward compatibility with existing code that uses `views.home`, `views.add`, etc.
 */

// Import page views
import { homeView } from './pages/home.js';
import { addView } from './pages/add.js';
import { settingsView } from './pages/settings.js';
import { graphView } from './pages/graph.js';

// Import modal views
import { authModalView } from './modals/auth.js';
import { linkModalView } from './modals/link.js';
import { citationModalView } from './modals/citation.js';
import { bibliographyExportModalView } from './modals/bibliography.js';

// Import component views
import { commandPaletteView } from './components/commandPalette.js';

// Export as unified views object
// This maintains backward compatibility with existing code
export const views = {
    // Pages
    home: homeView,
    add: addView,
    settings: settingsView,
    graph: graphView,

    // Modals
    authModal: authModalView,
    linkModal: linkModalView,
    citationModal: citationModalView,
    bibliographyExportModal: bibliographyExportModalView,

    // Components
    commandPalette: commandPaletteView
};
