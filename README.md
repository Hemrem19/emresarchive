# citavErs

[![Tests](https://github.com/Hemrem19/citavers/actions/workflows/test.yml/badge.svg)](https://github.com/Hemrem19/citavers/actions/workflows/coverage.yml)
[![Coverage](https://github.com/Hemrem19/citavers/actions/workflows/coverage.yml/badge.svg)](https://github.com/Hemrem19/citavers/actions/workflows/coverage.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A local-first research paper management application built with vanilla JavaScript

## ✨ Features

- 📚 **Paper Management** - Add, edit, organize research papers
- 📝 **Rich Notes** - Take detailed notes with formatting support
- 🔍 **Powerful Search** - Full-text search across titles, authors, and notes
- 🏷️ **Smart Tagging** - Organize with custom tags and filters
- 📊 **Collections** - Save filter combinations for quick access
- 📄 **PDF Viewer** - Built-in PDF viewer with search, zoom, and rotation
- 🔗 **Paper Linking** - Connect related papers visually
- 📈 **Network Graph** - Interactive visualization of paper relationships
- ⌨️ **Keyboard Shortcuts** - Command palette and global shortcuts
- 🌙 **Dark Mode** - Easy on the eyes
- 📱 **Mobile Friendly** - Touch gestures and responsive design
- 💾 **Local-First** - All data stored in your browser (IndexedDB)
- 📤 **Export/Import** - Full data portability

## 🚀 Quick Start

### Use Online
Visit: **https://citavers.com**

### Run Locally
```bash
# Clone the repository
git clone https://github.com/Hemrem19/citavers.git
cd citavers

# Serve with any static file server
python -m http.server 8000
# or
npx serve

# Open http://localhost:8000
```

## 🧪 Development

### Prerequisites
- Node.js 18+ (for testing only)

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Test Status
- ✅ **119 tests passing** (100% pass rate)
- ⏱️ **~2 second execution time**
- 📊 **Coverage:** 93% state, 87% filter branches, 74% database

## 📁 Project Structure

```
research/
├── index.html              # Main application shell
├── app.js                  # Application initialization
├── views.js                # HTML templates
├── ui.js                   # UI helpers
├── api.js                  # External API calls
├── config.js               # Configuration
├── core/                   # Core modules
│   ├── state.js           # State management
│   ├── filters.js         # Filtering & pagination
│   ├── router.js          # Client-side routing
│   ├── commandPalette.js  # Command palette
│   └── keyboardShortcuts.js # Global shortcuts
├── db/                     # Database layer
│   ├── core.js            # DB initialization
│   ├── papers.js          # Paper CRUD
│   ├── collections.js     # Collections CRUD
│   ├── annotations.js     # Annotations CRUD
│   └── data.js            # Import/Export
├── *.view.js              # View modules
└── tests/                 # Test suite
```

## 🏗️ Architecture

- **No Framework** - Pure vanilla JavaScript (ES6+)
- **No Build Tools** - Browser-native ES6 modules
- **Local-First** - IndexedDB for all data storage
- **CDN Libraries** - PDF.js, vis-network, Tailwind CSS
- **View-Based Routing** - Clean separation of concerns
- **Repository Pattern** - Database abstraction layer

## 🎨 Tech Stack

- **Frontend:** HTML5, CSS3 (Tailwind), Vanilla JavaScript (ES6+)
- **Storage:** IndexedDB
- **Libraries:** PDF.js, vis-network, Material Symbols
- **Testing:** Vitest, fake-indexeddb
- **CI/CD:** GitHub Actions

## 📖 Documentation

- [`TESTING.md`](TESTING.md) - Testing guide
- [`REFACTORING_PLAN.md`](REFACTORING_PLAN.md) - Refactoring documentation
- [`enhancement_plan.md`](enhancement_plan.md) - Feature roadmap
- [`MOBILE_IMPLEMENTATION_SUMMARY.md`](MOBILE_IMPLEMENTATION_SUMMARY.md) - Mobile optimization

## 🤝 Contributing

This is a personal project, but issues and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with ❤️ for researchers everywhere
- Inspired by the need for a simple, privacy-focused research tool
- No user tracking, no analytics, no servers - just your data, your way

## 📊 Project Stats

- **Version:** 2.1
- **Total Features:** 47+
- **Lines of Code:** ~4,000
- **Test Coverage:** Growing!
- **Status:** Production Ready ✅

---

**Made with vanilla JS** 🍦 | **Local-first** 💾 | **Privacy-focused** 🔒

