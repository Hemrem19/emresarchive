/**
 * This file centralizes application-wide configurations, such as reading statuses.
 */

export const DEFAULT_STATUSES = ['Reading', 'To Read', 'Finished', 'Archived'];
const STATUS_STORAGE_KEY = 'readingStatusOrder';

/**
 * Retrieves the user-defined status order from localStorage, or returns the default.
 * @returns {string[]} An array of status strings in the correct order.
 */
export function getStatusOrder() {
    const storedOrder = localStorage.getItem(STATUS_STORAGE_KEY);
    return storedOrder ? JSON.parse(storedOrder) : [...DEFAULT_STATUSES];
}

/**
 * Saves the new status order to localStorage.
 * @param {string[]} newOrder - The new array of status strings to save.
 */
export function saveStatusOrder(newOrder) {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(newOrder));
}

