/**
 * useAuth Hook - Manages authentication state and persistence
 * Provides login, logout, and auth status checking functionality
 */

import { useEffect, useState, useCallback } from "react";
import { 
  saveAuthToken, 
  getStoredUser, 
  isTokenValid, 
  clearAuthData, 
  extendTokenExpiry,
  getStoredToken 
} from "../utils/authService";

/**
 * Custom hook for managing authentication state
 * Automatically hydrates user from localStorage on mount
 * 
 * @returns {Object} Auth state and functions
 *   - user: Current logged-in user object or null
 *   - isLoading: Loading state during auth check
 *   - isLoggedIn: Boolean indicating if user is authenticated
 *   - login: Function to login user
 *   - logout: Function to logout user
 *   - checkAuth: Function to manually check/restore auth state
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restore user from localStorage on component mount
   * This is the main "Check Auth" function
   */
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if token is valid
        if (isTokenValid()) {
          const storedUser = getStoredUser();
          if (storedUser) {
            console.log("✓ Auth restored from localStorage:", storedUser);
            setUser(storedUser);
            // Extend token expiry on activity
            extendTokenExpiry();
          } else {
            setUser(null);
          }
        } else {
          console.log("Token is invalid or expired, clearing auth data");
          clearAuthData();
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login user - saves credentials and token to localStorage
   * @param {Object} userData - User data { id, role, name, onDuty }
   * @param {string} token - Optional auth token
   */
  const login = useCallback((userData, token = null) => {
    try {
      saveAuthToken(userData, token);
      setUser(userData);
      console.log("✓ User logged in:", userData.id);
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      return false;
    }
  }, []);

  /**
   * Logout user - clears all auth data and state
   */
  const logout = useCallback(() => {
    try {
      clearAuthData();
      setUser(null);
      console.log("✓ User logged out");
      return true;
    } catch (error) {
      console.error("Error during logout:", error);
      return false;
    }
  }, []);

  /**
   * Update user data in state and storage
   * Useful for updating profile information
   * @param {Object} updatedUserData - Partial user data to merge
   */
  const updateUser = useCallback((updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      saveAuthToken(newUserData);
      setUser(newUserData);
      console.log("✓ User data updated");
      return true;
    } catch (error) {
      console.error("Error updating user data:", error);
      return false;
    }
  }, [user]);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    logout,
    updateUser,
  };
}

/**
 * Alternative hook for just checking if user is logged in (simpler cases)
 * Use this if you only need the auth status, not the full user object
 */
export function useIsLoggedIn() {
  const { isLoggedIn, isLoading } = useAuth();
  return { isLoggedIn, isLoading };
}

export default useAuth;
