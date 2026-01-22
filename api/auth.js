/**
 * Authentication API Service
 * Handles user authentication with the backend API
 */

import { API_CONFIG } from '../config.js';
import { showToast } from '../ui.js';

const AUTH_ENDPOINT = `${API_CONFIG.BASE_URL}/api/auth`;

// Promise deduplication for token refresh
let refreshPromise = null;

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
 * Parses API error response to extract user-friendly error message.
 * @param {Response} response - Fetch response object.
 * @param {Object} result - Parsed JSON result.
 * @returns {string} User-friendly error message.
 */
function parseApiError(response, result) {
    // Handle validation errors (422 or 400 with details)
    if (result.error?.details && Array.isArray(result.error.details)) {
        const fieldErrors = result.error.details.map(err => {
            const field = err.field || err.path?.[0] || '';
            const message = err.message || '';
            return field ? `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}` : message;
        });
        return fieldErrors.join('. ') || result.error.message || 'Validation error';
    }

    // Handle error object with message
    if (result.error?.message) {
        return result.error.message;
    }

    // Handle direct message
    if (result.message) {
        return result.message;
    }

    // Handle HTTP status codes
    switch (response.status) {
        case 400:
            return 'Invalid request. Please check your input.';
        case 401:
            return 'Invalid email or password.';
        case 403:
            return 'Access denied.';
        case 404:
            return 'Service not found.';
        case 409:
            return 'This account already exists.';
        case 422:
            return 'Invalid input data. Please check all fields.';
        case 429:
            return 'Too many requests. Please try again later.';
        case 500:
        case 502:
        case 503:
            return 'Server error. Please try again later.';
        default:
            return 'An error occurred. Please try again.';
    }
}

/**
 * Handles network errors and creates user-friendly messages.
 * @param {Error} error - Network error.
 * @returns {Error} Error with user-friendly message.
 */
function handleNetworkError(error) {
    // Network fetch failed (offline, CORS, timeout, etc.)
    if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return new Error('Network error. Please check your internet connection and try again.');
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return new Error('Request timed out. Please try again.');
    }

    // CORS errors
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        return new Error('Connection error. Please contact support if this persists.');
    }

    return error;
}

/**
 * Registers a new user.
 * @param {Object} data - Registration data { email, password, name }.
 * @returns {Promise<Object>} Promise resolving to { accessToken, user }.
 */
export async function register(data) {
    try {
        // Validate input before sending
        if (!data.email || !data.password) {
            throw new Error('Email and password are required.');
        }

        if (data.email && !data.email.includes('@')) {
            throw new Error('Please enter a valid email address.');
        }

        if (data.password && data.password.length < 8) {
            throw new Error('Password must be at least 8 characters long.');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            const errorMessage = parseApiError(response, result);
            const error = new Error(errorMessage);
            error.status = response.status;
            error.details = result.error?.details;
            throw error;
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
        // Handle AbortError (timeout)
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timed out. Please try again.');
        }

        // Handle network errors
        if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('CORS'))) {
            throw handleNetworkError(error);
        }

        // Re-throw known errors
        if (error.message && !error.message.includes('Server returned')) {
            throw error;
        }

        console.error('Registration error:', error);
        throw handleNetworkError(error);
    }
}

/**
 * Logs in a user.
 * @param {Object} data - Login data { email, password }.
 * @returns {Promise<Object>} Promise resolving to { accessToken, user }.
 */
export async function login(data) {
    try {
        // Validate input before sending
        if (!data.email || !data.password) {
            throw new Error('Email and password are required.');
        }

        if (data.email && !data.email.includes('@')) {
            throw new Error('Please enter a valid email address.');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies for refresh token
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            const errorMessage = parseApiError(response, result);
            const error = new Error(errorMessage);
            error.status = response.status;
            error.details = result.error?.details;
            throw error;
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
        // Handle AbortError (timeout)
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timed out. Please try again.');
        }

        // Handle network errors
        if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('CORS'))) {
            throw handleNetworkError(error);
        }

        // Re-throw known errors
        if (error.message && !error.message.includes('Server returned')) {
            throw error;
        }

        console.error('Login error:', error);
        throw handleNetworkError(error);
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
    // Return existing promise if one is already in progress
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${AUTH_ENDPOINT}/refresh`, {
                method: 'POST',
                credentials: 'include', // Include refresh token cookie
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            // Handle non-JSON responses
            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                const errorMessage = parseApiError(response, result);
                const error = new Error(errorMessage);
                error.status = response.status;
                throw error;
            }

            if (result.success && result.data && result.data.accessToken) {
                const user = getUser();
                setAuth(result.data.accessToken, user);
                return result.data.accessToken;
            }

            throw new Error('Invalid response from server');
        } catch (error) {
            // Handle AbortError (timeout)
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                clearAuth();
                throw new Error('Session refresh timed out. Please log in again.');
            }

            // Handle network errors
            if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
                // Don't clear auth on network errors - might be temporary
                throw new Error('Network error. Please check your connection.');
            }

            console.error('Token refresh error:', error);
            // If refresh fails (401, 403, etc.), user needs to log in again
            if (error.status === 401 || error.status === 403) {
                clearAuth();
                throw new Error('Session expired. Please log in again.');
            }

            throw error;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Verifies email with a verification token.
 * @param {string} token - Verification token from email.
 * @returns {Promise<Object>} Promise resolving to verification result.
 */
export async function verifyEmail(token) {
    try {
        if (!token || typeof token !== 'string' || token.trim().length === 0) {
            throw new Error('Verification token is required.');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token }),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error('Server returned invalid response. Please try again.');
        }

        if (!response.ok) {
            const errorMessage = parseApiError(response, result);
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        // If user is logged in, update their user data
        if (isAuthenticated()) {
            const user = getUser();
            if (user) {
                user.emailVerified = true;
                setAuth(getAccessToken(), user);
            }
        }

        return result;
    } catch (error) {
        // Handle AbortError (timeout)
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Verification request timed out. Please try again.');
        }

        // Handle network errors
        if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('CORS'))) {
            throw handleNetworkError(error);
        }

        console.error('Email verification error:', error);
        throw error;
    }
}

/**
 * Resends verification email (requires authentication).
 * @returns {Promise<Object>} Promise resolving to send result.
 */
export async function resendVerificationEmail() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            throw new Error('Please log in to resend verification email.');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/resend-verification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            throw new Error('Server returned invalid response. Please try again.');
        }

        if (!response.ok) {
            // If token expired, try refreshing
            if (response.status === 401) {
                try {
                    const newToken = await refreshToken();
                    // Retry with new token
                    const retryResponse = await fetch(`${AUTH_ENDPOINT}/resend-verification`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${newToken}`,
                            'Content-Type': 'application/json'
                        },
                        signal: AbortSignal.timeout(10000)
                    });

                    const retryContentType = retryResponse.headers.get('content-type');
                    let retryResult;
                    if (retryContentType && retryContentType.includes('application/json')) {
                        retryResult = await retryResponse.json();
                    } else {
                        throw new Error('Server returned invalid response. Please try again.');
                    }

                    if (!retryResponse.ok) {
                        const errorMessage = parseApiError(retryResponse, retryResult);
                        throw new Error(errorMessage);
                    }
                    return retryResult;
                } catch (refreshError) {
                    clearAuth();
                    throw new Error('Session expired. Please log in again.');
                }
            }

            const errorMessage = parseApiError(response, result);
            throw new Error(errorMessage);
        }

        return result;
    } catch (error) {
        // Handle AbortError (timeout)
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timed out. Please try again.');
        }

        // Handle network errors
        if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('CORS'))) {
            throw handleNetworkError(error);
        }

        console.error('Resend verification email error:', error);
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
            throw new Error('Not authenticated. Please log in.');
        }

        const response = await fetch(`${AUTH_ENDPOINT}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            throw new Error('Server returned invalid response. Please try again.');
        }

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
                        },
                        signal: AbortSignal.timeout(10000)
                    });

                    const retryContentType = retryResponse.headers.get('content-type');
                    let retryResult;
                    if (retryContentType && retryContentType.includes('application/json')) {
                        retryResult = await retryResponse.json();
                    } else {
                        throw new Error('Server returned invalid response. Please try again.');
                    }

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

            const errorMessage = parseApiError(response, result);
            throw new Error(errorMessage);
        }

        if (result.success && result.data) {
            setAuth(accessToken, result.data.user);
            return result.data.user;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        // Handle AbortError (timeout)
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timed out. Please try again.');
        }

        // Handle network errors
        if (!error.status && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('CORS'))) {
            throw handleNetworkError(error);
        }

        console.error('Get user error:', error);
        throw error;
    }
}

