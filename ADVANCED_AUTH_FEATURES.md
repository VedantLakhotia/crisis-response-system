/**
 * ADVANCED AUTH FEATURES (Optional)
 * These are optional enhancements to the basic persistent auth system
 */

// ============================================
// 1. BACKEND TOKEN VALIDATION
// ============================================

/**
 * Validate token with Firestore on app mount
 * Add this to useAuth hook's checkAuth function
 */

import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export async function validateTokenWithFirestore(userId) {
  try {
    // Check if user still exists in Firestore staff collection
    const userRef = doc(db, "staff", userId);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      console.warn("User no longer in database - clearing auth");
      return false;
    }
    
    // Optionally check if user is still active/not disabled
    const userData = userSnapshot.data();
    if (userData.isDisabled || userData.isDeleted) {
      console.warn("User account disabled - clearing auth");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating token with backend:", error);
    return false;
  }
}

// Usage in useAuth.js checkAuth():
/*
const checkAuth = useCallback(async () => {
  setIsLoading(true);
  try {
    if (isTokenValid()) {
      const storedUser = getStoredUser();
      
      // ADDED: Validate with backend
      const isValid = await validateTokenWithFirestore(storedUser.id);
      
      if (storedUser && isValid) {
        console.log("✓ Auth restored from localStorage:", storedUser);
        setUser(storedUser);
        extendTokenExpiry();
        setIsLoading(false);
        return true;
      }
    }
    // ... rest of logic
  }
}, []);
*/

// ============================================
// 2. AUTOMATIC LOGOUT ON TOKEN EXPIRY
// ============================================

/**
 * Hook to automatically logout when token expires
 * Place this in your main App component
 */

import { useEffect } from "react";
import { getTokenTimeRemaining } from "../utils/authService";
import { toast } from "sonner";

export function useAutoLogout() {
  useEffect(() => {
    const checkExpiry = () => {
      const remaining = getTokenTimeRemaining();

      // Auto-logout when token expires
      if (remaining === 0) {
        console.log("Token expired - logging out");
        toast.error("Your session has expired. Please log in again.");
        
        // Dispatch logout action if using Redux/Zustand
        // Or navigate to login page
        window.location.href = "/";
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}

// Usage:
/*
function App() {
  useAutoLogout(); // Automatically logout on expiry
  return <AppContent />;
}
*/

// ============================================
// 3. SESSION WARNING (1 HOUR BEFORE EXPIRY)
// ============================================

/**
 * Warn user when session is about to expire
 */

import { useEffect, useState } from "react";
import { getTokenTimeRemaining } from "../utils/authService";

export function useSessionWarning() {
  const [warningLevel, setWarningLevel] = useState(null);

  useEffect(() => {
    const checkTimeLeft = () => {
      const remaining = getTokenTimeRemaining();
      const oneHourMs = 60 * 60 * 1000;
      const thirtyMinMs = 30 * 60 * 1000;
      const fiveMinMs = 5 * 60 * 1000;

      if (remaining === 0) {
        setWarningLevel("expired");
      } else if (remaining < fiveMinMs) {
        setWarningLevel("critical"); // Show red warning
      } else if (remaining < thirtyMinMs) {
        setWarningLevel("urgent"); // Show orange warning
      } else if (remaining < oneHourMs) {
        setWarningLevel("warning"); // Show yellow warning
      } else {
        setWarningLevel(null);
      }
    };

    checkTimeLeft();
    const interval = setInterval(checkTimeLeft, 30 * 1000); // Check every 30 sec
    return () => clearInterval(interval);
  }, []);

  return warningLevel;
}

// Usage:
/*
function Header() {
  const warning = useSessionWarning();

  return (
    <div>
      {warning === "warning" && (
        <div className="bg-yellow-500/20 text-yellow-400 p-2">
          Session expires in 1 hour
        </div>
      )}
      {warning === "urgent" && (
        <div className="bg-orange-500/20 text-orange-400 p-2">
          Session expires in 30 minutes
        </div>
      )}
      {warning === "critical" && (
        <div className="bg-red-500/20 text-red-400 p-2 animate-pulse">
          Session expires in 5 minutes!
        </div>
      )}
    </div>
  );
}
*/

// ============================================
// 4. USER ACTIVITY TRACKING
// ============================================

/**
 * Track user activity and extend session automatically
 * This keeps user logged in as long as they're active
 */

import { useEffect } from "react";
import { extendTokenExpiry } from "../utils/authService";

export function useActivityTracking() {
  useEffect(() => {
    const activities = [
      "mousedown",
      "keydown",
      "touchstart",
      "click",
      "mousemove",
      "scroll"
    ];

    const handleActivity = () => {
      // Reset token expiry on any user activity
      extendTokenExpiry();
    };

    // Use capture phase and throttle to avoid excessive calls
    let lastActivity = Date.now();
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastActivity > 60000) { // Throttle to once per minute
        handleActivity();
        lastActivity = now;
      }
    };

    activities.forEach(activity => {
      window.addEventListener(activity, throttledHandler, true);
    });

    return () => {
      activities.forEach(activity => {
        window.removeEventListener(activity, throttledHandler, true);
      });
    };
  }, []);
}

// Usage in App component:
/*
function App() {
  useActivityTracking(); // Extends session on user activity
  return <AppContent />;
}
*/

// ============================================
// 5. MULTI-TAB SYNCHRONIZATION
// ============================================

/**
 * Keep auth state synchronized across browser tabs
 * When user logs in/out in one tab, other tabs update automatically
 */

import { useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

export function useCrossTabSync() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    // Listen for storage changes in other tabs
    const handleStorageChange = (event) => {
      // If auth-related keys changed, check auth status
      if (
        event.key === "crisis_auth_token" ||
        event.key === "crisis_user_data" ||
        event.key === "crisis_token_expiry"
      ) {
        console.log("Auth changed in another tab - syncing...");
        checkAuth(); // Re-check and sync state
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth]);
}

// Usage:
/*
function App() {
  useCrossTabSync(); // Sync auth across tabs
  return <AppContent />;
}

// Now if user logs in on tab A, tab B will automatically update!
*/

// ============================================
// 6. LOGOUT ALL SESSIONS
// ============================================

/**
 * Logout user from all open tabs
 */

import { clearAuthData } from "../utils/authService";

export function logoutAllSessions() {
  // Clear from current tab
  clearAuthData();

  // Notify other tabs
  localStorage.setItem("crisis_logout_event", Date.now().toString());

  // Broadcast to other tabs via BroadcastChannel API (if supported)
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("auth_channel");
    channel.postMessage({ type: "LOGOUT" });
    channel.close();
  }
}

// Usage:
/*
function Settings() {
  const handleLogoutEverywhere = () => {
    logoutAllSessions();
    window.location.href = "/";
  };

  return (
    <button onClick={handleLogoutEverywhere}>
      Logout from All Devices
    </button>
  );
}
*/

// ============================================
// 7. REMEMBER ME (EXTENDED EXPIRY)
// ============================================

/**
 * Allow user to extend token lifetime (e.g., 30 days instead of 7)
 */

import { saveAuthToken, getStoredUser } from "../utils/authService";

const EXTENDED_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export function rememberMe(rememberMeChecked) {
  const user = getStoredUser();
  
  if (rememberMeChecked && user) {
    // Extend expiry to 30 days
    const expiryTime = Date.now() + EXTENDED_EXPIRY;
    localStorage.setItem("crisis_token_expiry", expiryTime.toString());
    console.log("✓ Remember me activated - session extended to 30 days");
  }
}

// Usage in LoginPanel:
/*
function LoginPanel({ onLogin, onClose }) {
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (userData) => {
    const token = saveAuthToken(userData);
    rememberMe(rememberMe); // Extend if checked
    onLogin(userData);
  };

  return (
    <div>
      <input
        type="checkbox"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
      />
      <label>Remember me for 30 days</label>
    </div>
  );
}
*/

// ============================================
// 8. ROLE-BASED ACCESS PROTECTION
// ============================================

/**
 * Protect routes based on user role
 */

import useAuth from "./useAuth";
import { Navigate } from "react-router-dom";

export function RoleProtectedRoute({ 
  element, 
  requiredRoles 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
}

// Usage:
/*
<Routes>
  <Route 
    path="/admin"
    element={
      <RoleProtectedRoute 
        element={<AdminPanel />}
        requiredRoles={["admin"]}
      />
    }
  />
  <Route 
    path="/staff-dashboard"
    element={
      <RoleProtectedRoute 
        element={<StaffDash />}
        requiredRoles={["staff", "admin"]}
      />
    }
  />
</Routes>
*/

// ============================================
// 9. ENABLE ALL FEATURES (COMPLETE INTEGRATION)
// ============================================

/**
 * Complete setup with all advanced features
 * Add this to your App.jsx main component
 */

/*
import useAuth from "./hooks/useAuth";
import { useAutoLogout } from "./utils/advancedAuth";
import { useActivityTracking } from "./utils/advancedAuth";
import { useCrossTabSync } from "./utils/advancedAuth";
import { useSessionWarning } from "./utils/advancedAuth";

export default function App() {
  // Basic auth
  const { user, isLoading } = useAuth();

  // Advanced features
  useAutoLogout();                 // Logout on expiry
  useActivityTracking();           // Extend session on activity
  useCrossTabSync();               // Sync across tabs
  const warning = useSessionWarning(); // Show warnings

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      {warning && <SessionWarningBanner level={warning} />}
      {user ? <Dashboard /> : <LoginPage />}
    </div>
  );
}
*/

// ============================================
// 10. DEBUGGING HELPER
// ============================================

/**
 * Console utilities for debugging auth issues
 * Paste into browser console to debug
 */

export const authDebug = {
  // Check current auth state
  status: () => {
    const token = localStorage.getItem("crisis_auth_token");
    const user = JSON.parse(localStorage.getItem("crisis_user_data"));
    const expiry = new Date(parseInt(localStorage.getItem("crisis_token_expiry")));
    
    return {
      hasToken: !!token,
      hasUser: !!user,
      user,
      expiresAt: expiry,
      expiresIn: Math.max(0, expiry - Date.now()) / 1000 / 60 + " minutes",
      isExpired: Date.now() > expiry
    };
  },

  // Clear auth
  clear: () => {
    localStorage.removeItem("crisis_auth_token");
    localStorage.removeItem("crisis_user_data");
    localStorage.removeItem("crisis_token_expiry");
    console.log("✓ Auth cleared");
  },

  // Extend session
  extend: () => {
    const newExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("crisis_token_expiry", newExpiry.toString());
    console.log("✓ Session extended");
  }
};

// Usage in console:
/*
authDebug.status()      // Check auth
authDebug.clear()       // Clear auth
authDebug.extend()      // Extend session
*/
