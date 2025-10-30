// Test setup file - runs before all tests
import { vi, beforeEach } from 'vitest';

// Import fake-indexeddb for browser-like environment
import 'fake-indexeddb/auto';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Override IndexedDB with fake-indexeddb (happy-dom provides window object)
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;
if (typeof window !== 'undefined') {
  window.indexedDB = indexedDB;
  window.IDBKeyRange = IDBKeyRange;
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

