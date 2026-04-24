/**
 * Auth Service - Handles persistent authentication with localStorage
 * Provides token storage, retrieval, validation, and cleanup
 */

const AUTH_STORAGE_KEY = "crisis_auth_token";
const USER_STORAGE_KEY = "crisis_user_data";
const TOKEN_EXPIRY_KEY = "crisis_token_expiry";

// Token expiry duration: 7 days (in milliseconds)
const DEFAULT_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Save authentication token and user data to localStorage
 * @param {Object} user - User object { id, role, name, onDuty }
 * @param {string} token - Authentication token (optional, can generate UUID)
 * @returns {string} The saved token
 */
export function saveAuthToken(user, token = null) {
  try {
    // Generate a token if not provided (UUID-like)
    const authToken = token || generateToken();
    const expiryTime = Date.now() + DEFAULT_TOKEN_EXPIRY;

    localStorage.setItem(AUTH_STORAGE_KEY, authToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      ...user,
      loginTime: Date.now(),
    }));
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    console.log("✓ Auth token saved successfully");
    return authToken;
  } catch (error) {
    console.error("Error saving auth token:", error);
    return null;
  }
}

/**
 * Retrieve stored auth token from localStorage
 * @returns {string|null} The stored token or null if not found
 */
export function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Error retrieving auth token:", error);
    return null;
  }
}

/**
 * Retrieve stored user data from localStorage
 * @returns {Object|null} The stored user data or null if not found
 */
export function getStoredUser() {
  try {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error retrieving user data:", error);
    return null;
  }
}

/**
 * Check if stored token is still valid (not expired)
 * @returns {boolean} True if token exists and is not expired
 */
export function isTokenValid() {
  try {
    const token = getStoredToken();
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !expiryTime) {
      return false;
    }

    // Check if token has expired
    if (Date.now() > parseInt(expiryTime)) {
      console.warn("Token has expired");
      clearAuthData();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}

/**
 * Validate token with backend (optional - for additional security)
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID to validate
 * @returns {Promise<boolean>} True if user exists in Firestore
 */
export async function validateTokenWithBackend(db, userId) {
  try {
    // Import collection and getDocs from firebase/firestore in the component using this
    // This is a placeholder - actual validation would depend on your backend structure
    console.log("Validating token with backend for user:", userId);
    return true; // Replace with actual backend validation
  } catch (error) {
    console.error("Error validating token with backend:", error);
    return false;
  }
}

/**
 * Clear all auth data from localStorage
 * Should be called on logout
 */
export function clearAuthData() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    console.log("✓ Auth data cleared successfully");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
}

/**
 * Generate a pseudo-UUID token for authentication
 * @returns {string} Generated token
 */
function generateToken() {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extend token expiry time (called on page refresh or activity)
 * Useful for "remember me" functionality
 */
export function extendTokenExpiry() {
  try {
    if (isTokenValid()) {
      const newExpiryTime = Date.now() + DEFAULT_TOKEN_EXPIRY;
      localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiryTime.toString());
      console.log("✓ Token expiry extended");
    }
  } catch (error) {
    console.error("Error extending token expiry:", error);
  }
}

/**
 * Get remaining token lifetime in milliseconds
 * @returns {number} Milliseconds until expiry, or 0 if expired
 */
export function getTokenTimeRemaining() {
  try {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return 0;

    const remaining = parseInt(expiryTime) - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    console.error("Error getting token time remaining:", error);
    return 0;
  }
}

/**
 * Format time remaining for display (e.g., "5 days", "2 hours")
 * @returns {string} Formatted time string
 */
export function formatTimeRemaining() {
  const remaining = getTokenTimeRemaining();
  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return "Less than a minute";
}
