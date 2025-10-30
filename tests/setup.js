// Test setup file - runs before all tests
import { vi } from 'vitest';

// Import fake-indexeddb for Node environment
import 'fake-indexeddb/auto';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Make IndexedDB available globally for Node environment
if (typeof window === 'undefined') {
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;
  // Create minimal window object with indexedDB
  global.window = { 
    indexedDB: indexedDB,
    IDBKeyRange: IDBKeyRange,
    location: { hash: '#/' }
  };
}

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;

// Mock window.location.hash for routing tests (only if window exists)
if (typeof window !== 'undefined') {
  delete window.location;
  window.location = { hash: '#/' };
} else {
  global.window = { location: { hash: '#/' } };
}

// Mock Material Symbols (icons) - just return the text
global.materialSymbols = (icon) => icon;

// Mock FileReader for PDF conversion tests
global.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
    this.onerror = null;
  }

  readAsDataURL(blob) {
    // Simulate async reading
    setTimeout(() => {
      // Convert blob to base64 data URL
      if (blob instanceof Blob) {
        this.result = `data:${blob.type};base64,ZmFrZSBwZGYgY29udGVudA==`;
        if (this.onloadend) {
          this.onloadend();
        }
      } else {
        if (this.onerror) {
          this.onerror(new Error('Invalid blob'));
        }
      }
    }, 0);
  }
};

// Reset mocks before each test
beforeEach(() => {
  localStorage.clear();
  if (typeof window !== 'undefined') {
    window.location.hash = '#/';
  } else if (global.window) {
    global.window.location.hash = '#/';
  }
});

