/**
 * API Utilities
 * Shared utilities for API error handling, rate limiting, and response parsing
 */

// Rate limit tracking
const rateLimitState = {
    isRateLimited: false,
    rateLimitUntil: null,
    consecutiveFailures: 0,
    backoffDelay: 1000 // Start with 1 second
};

/**
 * Checks if we are currently rate limited.
 * @returns {boolean} True if rate limited.
 */
export function isRateLimited() {
    if (!rateLimitState.isRateLimited) {
        return false;
    }

    // Check if rate limit period has expired
    if (rateLimitState.rateLimitUntil && Date.now() > rateLimitState.rateLimitUntil) {
        clearRateLimit();
        return false;
    }

    return true;
}

/**
 * Sets rate limit state.
 * @param {number} retryAfterSeconds - Optional retry-after duration in seconds.
 */
export function setRateLimit(retryAfterSeconds = null) {
    rateLimitState.isRateLimited = true;
    rateLimitState.consecutiveFailures++;

    // Calculate backoff delay (exponential with jitter)
    const baseDelay = Math.min(30000, rateLimitState.backoffDelay * Math.pow(2, rateLimitState.consecutiveFailures - 1));
    const jitter = Math.random() * 1000; // 0-1 second jitter
    const delay = baseDelay + jitter;

    // Use retry-after if provided, otherwise use calculated backoff
    const waitTime = retryAfterSeconds ? retryAfterSeconds * 1000 : delay;

    rateLimitState.rateLimitUntil = Date.now() + waitTime;

    console.warn(`[Rate Limit] Rate limited for ${Math.round(waitTime / 1000)}s (attempt ${rateLimitState.consecutiveFailures})`);
}

/**
 * Clears rate limit state.
 */
export function clearRateLimit() {
    rateLimitState.isRateLimited = false;
    rateLimitState.rateLimitUntil = null;
    rateLimitState.consecutiveFailures = 0;
    console.log('[Rate Limit] Cleared');
}

/**
 * Gets remaining rate limit time in milliseconds.
 * @returns {number} Milliseconds until rate limit expires, or 0 if not rate limited.
 */
export function getRateLimitRemainingTime() {
    if (!isRateLimited()) {
        return 0;
    }
    return Math.max(0, rateLimitState.rateLimitUntil - Date.now());
}

/**
 * Safely parse JSON response, handling non-JSON error responses.
 * Includes special handling for rate limiting (429).
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed JSON data
 * @throws {Error} If response is not ok or JSON parsing fails
 */
export async function parseJsonResponse(response) {
    // Handle rate limiting (429) specially
    if (response.status === 429) {
        // Try to get retry-after header
        const retryAfter = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;

        // Set rate limit state
        setRateLimit(retryAfterSeconds);

        // Try to parse error message
        let errorMessage = 'Too many requests. Please try again later.';
        try {
            const text = await response.text();
            if (text && text.length < 500) {
                errorMessage = text;
            }
        } catch (e) {
            // Ignore text parsing errors
        }

        throw new Error(`Rate Limited: ${errorMessage}`);
        throw new Error(`Rate Limited: ${errorMessage}`);
    }

    // Handle session expiration (401)
    if (response.status === 401) {
        console.warn('Session expired (401), clearing token and redirecting...');
        localStorage.removeItem('accessToken');
        // Optional: Dispatch a custom event if the app needs to react without reloading
        window.dispatchEvent(new Event('auth:logout'));

        // Redirect to login or reload to trigger auth check
        // We'll throw an error first so the caller stops processing
        throw new Error('Session expired. Please log in again.');
    }

    // Check response status BEFORE parsing JSON
    if (!response.ok) {
        // Try to parse error as JSON, fall back to text
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                errorMessage = result.message || result.error?.message || errorMessage;
            } else {
                // Response is not JSON (probably HTML error page or plain text)
                const text = await response.text();
                if (text && text.length < 500) {
                    // Only include short text responses
                    errorMessage = text;
                } else {
                    errorMessage = `Server error (${response.status}): ${response.statusText}`;
                }
            }
        } catch (parseError) {
            // Can't parse response body, use status text
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    // Parse successful response
    try {
        return await response.json();
    } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid JSON response from server');
    }
}

/**
 * Wraps an API call with rate limit checking.
 * @param {Function} apiFunc - Async function that makes the API call
 * @returns {Promise<any>} Result of the API call
 * @throws {Error} If rate limited or API call fails
 */
export async function withRateLimitCheck(apiFunc) {
    // Check if we're currently rate limited
    if (isRateLimited()) {
        const remainingTime = getRateLimitRemainingTime();
        const remainingSeconds = Math.ceil(remainingTime / 1000);
        throw new Error(`Rate limited. Please wait ${remainingSeconds} seconds before retrying.`);
    }

    try {
        const result = await apiFunc();
        // Clear rate limit on success
        if (rateLimitState.consecutiveFailures > 0) {
            clearRateLimit();
        }
        return result;
    } catch (error) {
        // Check if error is rate limit related
        if (error.message && error.message.includes('Rate Limited')) {
            // Already handled in parseJsonResponse
            throw error;
        }
        // Re-throw other errors
        throw error;
    }
}

/**
 * Creates a standardized error object.
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Error} Error object with additional properties
 */
export function createApiError(message, status = null, details = null) {
    const error = new Error(message);
    if (status) {
        error.status = status;
    }
    if (details) {
        error.details = details;
    }
    return error;
}

