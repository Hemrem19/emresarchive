/**
 * Authentication API Service
 * Handles user authentication with the backend API
 */

import { API_CONFIG } from '../config.js';
import { showToast } from '../ui.js';

const AUTH_ENDPOINT = `${API_CONFIG.BASE_URL}/api/auth`;

/**
 * Gets the stored access token.
 * @returns {string|null} The access token or null if not found.
 */
export function getAccessToken() {
    return localStorage.getItem(API_CONFIG.ACCESS_TOKEN_KEY);
}

/**
 * Gets the stored user data.
 * @returns {Object|null} The user data or null if not found.
 */
export function getUser() {
    const userStr = localStorage.getItem(API_CONFIG.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Stores authentication tokens and user data.
 * @param {string} accessToken - The JWT access token.
 * @param {Object} user - The user data.
 */
export function setAuth(accessToken, user) {
    localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
}

/**
 * Clears authentication tokens and user data.
 */
export function clearAuth() {
    localStorage.removeItem(API_CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
}

/**
 * Checks if user is authenticated.
 * @returns {boolean} True if authenticated, false otherwise.
 */
export function isAuthenticated() {
    return !!getAccessToken();
}

/**
 * Registers a new user.
 * @param {Object} data - Registration data { email, password, name }.
 * @returns {Promise<Object>} Promise resolving to { accessToken, user }.
 */
export async function register(data) {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Registration failed');
        }

        if (result.success && result.data) {
            // Store auth data
            setAuth(result.data.accessToken, result.data.user);
            
            // Store refresh token in httpOnly cookie (handled by backend)
            // Access token stored in localStorage for API calls
            
            return {
                accessToken: result.data.accessToken,
                user: result.data.user
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Logs in a user.
 * @param {Object} data - Login data { email, password }.
 * @returns {Promise<Object>} Promise resolving to { accessToken, user }.
 */
export async function login(data) {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies for refresh token
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Login failed');
        }

        if (result.success && result.data) {
            // Store auth data
            setAuth(result.data.accessToken, result.data.user);
            
            return {
                accessToken: result.data.accessToken,
                user: result.data.user
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Logs out the current user.
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        const accessToken = getAccessToken();
        
        if (accessToken) {
            // Call logout endpoint to invalidate refresh token
            await fetch(`${AUTH_ENDPOINT}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Continue with local logout even if API call fails
    } finally {
        // Always clear local auth data
        clearAuth();
    }
}

/**
 * Refreshes the access token using the refresh token cookie.
 * @returns {Promise<string>} Promise resolving to new access token.
 */
export async function refreshToken() {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}/refresh`, {
            method: 'POST',
            credentials: 'include' // Include refresh token cookie
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Token refresh failed');
        }

        if (result.success && result.data && result.data.accessToken) {
            const user = getUser();
            setAuth(result.data.accessToken, user);
            return result.data.accessToken;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Token refresh error:', error);
        // If refresh fails, user needs to log in again
        clearAuth();
        throw error;
    }
}

/**
 * Gets the current user's profile.
 * @returns {Promise<Object>} Promise resolving to user data.
 */
export async function getCurrentUser() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            // If token expired, try refreshing
            if (response.status === 401) {
                try {
                    const newToken = await refreshToken();
                    // Retry with new token
                    const retryResponse = await fetch(`${AUTH_ENDPOINT}/me`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${newToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const retryResult = await retryResponse.json();
                    if (retryResponse.ok && retryResult.success) {
                        setAuth(newToken, retryResult.data.user);
                        return retryResult.data.user;
                    }
                } catch (refreshError) {
                    // Refresh failed, need to login again
                    clearAuth();
                    throw new Error('Session expired. Please log in again.');
                }
            }
            throw new Error(result.message || result.error || 'Failed to get user');
        }

        if (result.success && result.data) {
            setAuth(accessToken, result.data.user);
            return result.data.user;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get user error:', error);
        throw error;
    }
}

