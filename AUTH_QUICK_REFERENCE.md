/**
 * QUICK REFERENCE - Persistent Authentication
 * Copy-paste examples for common auth tasks
 */

// ============================================
// 1. SAVE TOKEN DURING LOGIN (LoginPanel)
// ============================================

// In your LoginPanel.jsx or login handler:
import { saveAuthToken } from "../utils/authService";

const handleLogin = async (userData) => {
  // After validating credentials with Firestore
  const user = {
    id: userData.id,
    role: userData.role,
    name: userData.name,
    onDuty: userData.onDuty || true
  };

  // Save token and user data to localStorage
  const token = saveAuthToken(user);
  
  // Token is now stored with 7-day expiry
  console.log("Token saved:", token);
  
  // Update UI state
  onLogin(user);
};

// ============================================
// 2. CHECK AUTH ON APP LOAD (App.jsx)
// ============================================

import useAuth from "./hooks/useAuth";

function MyApp() {
  const { user, isLoggedIn, isLoading, logout } = useAuth();

  // This hook automatically:
  // - Checks localStorage for stored token on mount
  // - Validates token expiry
  // - Restores user if valid
  // - Clears auth if expired

  if (isLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={logout}
    />
  );
}

// ============================================
// 3. HYDRATE STATE FROM STORED TOKEN
// ============================================

import useAuth from "./hooks/useAuth";
import { useEffect } from "react";

function Dashboard() {
  const { user } = useAuth();
  
  useEffect(() => {
    // User is automatically hydrated from localStorage
    // No additional state management needed!
    console.log("Logged in as:", user.name);
  }, [user]);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>
      <p>Status: {user.onDuty ? "On Duty" : "Off Duty"}</p>
    </div>
  );
}

// ============================================
// 4. LOGOUT AND CLEAR STORAGE
// ============================================

import { useAuth } from "./hooks/useAuth";
import { toast } from "sonner";

function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout(); // Clears localStorage and state
    toast.success("Logged out successfully");
    window.location.href = "/"; // Redirect to login
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}

// ============================================
// 5. SHOW SESSION TIME REMAINING
// ============================================

import { formatTimeRemaining } from "../utils/authService";
import { useEffect, useState } from "react";

function SessionExpiry() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => setTimeLeft(formatTimeRemaining());
    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-sm text-slate-500">
      Session expires in: {timeLeft}
    </div>
  );
}

// ============================================
// 6. EXTEND SESSION ON USER ACTIVITY
// ============================================

import { extendTokenExpiry } from "../utils/authService";
import { useEffect } from "react";

function useActivityTracker() {
  useEffect(() => {
    const handleActivity = () => {
      extendTokenExpiry(); // Reset expiry on any activity
    };

    // Track various user activities
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, []);
}

// Usage in main app component:
// useActivityTracker();

// ============================================
// 7. REDIRECT UNAUTHENTICATED USERS
// ============================================

import useAuth from "./hooks/useAuth";
import { Navigate } from "react-router-dom";

function ProtectedPage() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <div>Protected Content</div>;
}

// ============================================
// 8. UPDATE USER PROFILE
// ============================================

import useAuth from "./hooks/useAuth";
import { toast } from "sonner";

function ProfileSettings() {
  const { user, updateUser } = useAuth();

  const handleNameChange = (newName) => {
    const success = updateUser({ name: newName });
    if (success) {
      toast.success("Profile updated!");
    }
  };

  return (
    <div>
      <h2>{user.name}</h2>
      <input 
        value={user.name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
    </div>
  );
}

// ============================================
// 9. DEBUG AUTH STATE (in DevTools console)
// ============================================

// Copy-paste into browser console to debug:

// Check stored token:
localStorage.getItem("crisis_auth_token");

// Check stored user data:
JSON.parse(localStorage.getItem("crisis_user_data"));

// Check token expiry:
new Date(parseInt(localStorage.getItem("crisis_token_expiry")));

// Check if token is valid:
const expiry = parseInt(localStorage.getItem("crisis_token_expiry"));
Date.now() < expiry; // true if valid

// Clear all auth data:
localStorage.removeItem("crisis_auth_token");
localStorage.removeItem("crisis_user_data");
localStorage.removeItem("crisis_token_expiry");

// ============================================
// 10. HANDLE TOKEN EXPIRY WITH NOTIFICATION
// ============================================

import useAuth from "./hooks/useAuth";
import { getTokenTimeRemaining } from "../utils/authService";
import { useEffect } from "react";
import { toast } from "sonner";

function SessionWarning() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) return;

    const checkExpiry = () => {
      const remaining = getTokenTimeRemaining();
      const oneHourMs = 60 * 60 * 1000;

      // Warn user when 1 hour left
      if (remaining < oneHourMs && remaining > 0) {
        toast.warning("Your session expires in 1 hour. Please save your work.");
      }

      // Auto-logout when expired
      if (remaining === 0) {
        toast.error("Your session has expired. Please log in again.");
        window.location.href = "/login";
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkExpiry, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  return null;
}

// ============================================
// INTEGRATION CHECKLIST
// ============================================

/*
✓ Import useAuth hook in App.jsx
✓ Replace useState(null) with useAuth() for user state
✓ Update logout handler to call logout() function
✓ Update LoginPanel to call login() function
✓ Test login → refresh → still logged in
✓ Test logout → clears localStorage
✓ Check localStorage after login (DevTools)
✓ Verify token expiry is set correctly
✓ Optional: Add session warning
✓ Optional: Add activity tracking to extend expiry
✓ Optional: Add backend token validation
*/
