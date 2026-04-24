# Persistent Authentication Implementation Guide

## Overview
This authentication system implements persistent login using localStorage with token expiration. Users remain logged in until they manually log out or their token expires (7 days by default).

## Architecture

### Three-Layer System:

#### 1. **Auth Service** (`src/utils/authService.js`)
Low-level utilities for token and user data storage:
- `saveAuthToken(user, token)` - Save credentials to localStorage
- `getStoredToken()` - Retrieve stored token
- `getStoredUser()` - Retrieve stored user data
- `isTokenValid()` - Check if token is expired
- `clearAuthData()` - Clear all auth data (logout)
- `extendTokenExpiry()` - Extend token lifetime
- `formatTimeRemaining()` - Display time until expiry

#### 2. **Auth Hook** (`src/hooks/useAuth.js`)
React hook that manages auth state and automatically restores user on app mount:
- `user` - Current logged-in user object or null
- `isLoggedIn` - Boolean auth status
- `isLoading` - Loading state during auth check
- `login(userData, token?)` - Login user and save credentials
- `logout()` - Logout user and clear storage
- `checkAuth()` - Manually check/restore auth state
- `updateUser(newData)` - Update user profile

#### 3. **App Integration** (`src/App.jsx`)
Components use the hook to manage auth:
```javascript
const { user, login, logout, isLoggedIn } = useAuth();
```

## How It Works

### Login Flow:
```
User enters credentials in LoginPanel
    ↓
LoginPanel calls onLogin() callback
    ↓
App calls login() from useAuth hook
    ↓
login() saves user + token to localStorage
    ↓
State updates → User appears logged in
```

### Persistence Flow (Page Refresh):
```
App mounts → useAuth hook runs
    ↓
checkAuth() called on useEffect
    ↓
Checks localStorage for valid token
    ↓
If token valid → restores user data
    ↓
If token expired → clears auth data
    ↓
Component re-renders with user state
```

### Logout Flow:
```
User clicks Logout button
    ↓
logout() function called
    ↓
Clears localStorage
    ↓
Clears state
    ↓
User must log in again
```

## Storage Structure

### localStorage Keys:
```javascript
// Auth token identifier
"crisis_auth_token" → "token_1234567890_abc123def"

// User data
"crisis_user_data" → {
  "id": "STAFF-001",
  "role": "staff",
  "name": "John Doe",
  "onDuty": true,
  "loginTime": 1234567890000
}

// Token expiry timestamp
"crisis_token_expiry" → "1234567890000"
```

## Usage Examples

### Basic Login:
```javascript
const { login } = useAuth();

const handleLogin = (userData) => {
  login({
    id: "STAFF-001",
    role: "staff",
    name: "John Doe",
    onDuty: true
  });
};
```

### Check Auth Status in Components:
```javascript
const { user, isLoggedIn, isLoading } = useAuth();

if (isLoading) return <LoadingSpinner />;
if (!isLoggedIn) return <LoginPage />;

return <Dashboard user={user} />;
```

### Logout with Confirmation:
```javascript
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  toast.success("Logged out successfully");
  navigate("/");
};
```

### Update User Profile:
```javascript
const { updateUser } = useAuth();

const handleProfileUpdate = (newName) => {
  updateUser({ name: newName });
  toast.success("Profile updated");
};
```

## Configuration

### Modify Token Expiry:
Edit `src/utils/authService.js`:
```javascript
// Change from 7 days to your desired duration
const DEFAULT_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;  // 7 days
```

### Examples:
- 1 hour: `60 * 60 * 1000`
- 1 day: `24 * 60 * 60 * 1000`
- 30 days: `30 * 24 * 60 * 60 * 1000`

### Custom Storage Keys:
Edit storage keys in `src/utils/authService.js`:
```javascript
const AUTH_STORAGE_KEY = "crisis_auth_token";
const USER_STORAGE_KEY = "crisis_user_data";
const TOKEN_EXPIRY_KEY = "crisis_token_expiry";
```

## Security Considerations

### Current Implementation:
- ✅ Token stored with expiry check
- ✅ User data stored for quick hydration
- ✅ Automatic token expiry after 7 days
- ✅ Clear logout removes all stored data

### For Production (Recommended Enhancements):

#### 1. **Use HttpOnly Cookies** (More Secure):
```javascript
// Install: npm install js-cookie
import Cookies from 'js-cookie';

// Save token in HttpOnly cookie (server-side)
// Client cannot access HttpOnly cookies via JavaScript
```

#### 2. **Backend Token Validation**:
Validate token with backend on app mount:
```javascript
const validateTokenWithBackend = async (token) => {
  const response = await fetch('/api/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.ok;
};
```

#### 3. **Refresh Token Strategy**:
Implement refresh tokens that rotate:
```javascript
// Short-lived access token (15 min)
// Long-lived refresh token (7 days)
// Exchange refresh token for new access token
```

#### 4. **Add CSRF Protection**:
Include CSRF token with authenticated requests.

## Troubleshooting

### User Logs Out Immediately After Login:
1. Check if token is being saved: `localStorage.getItem('crisis_auth_token')`
2. Check if token expiry is in future: `localStorage.getItem('crisis_token_expiry')`
3. Verify `isTokenValid()` returns true

### Auth State Lost on Page Refresh:
1. Check browser localStorage is enabled
2. Verify `checkAuth()` hook is being called on mount
3. Check console for errors in `useAuth` hook

### User Data Not Updating:
1. Verify `saveAuthToken()` is called in login flow
2. Check user object structure matches storage format
3. Use `updateUser()` to sync state with storage

### Token Expiry Not Working:
1. Verify `DEFAULT_TOKEN_EXPIRY` is set correctly
2. Check `TOKEN_EXPIRY_KEY` in localStorage
3. Call `extendTokenExpiry()` on user activity to refresh

## Testing Persistence

### Manual Test:
1. Login to the app
2. Open browser DevTools → Application → localStorage
3. Verify `crisis_auth_token`, `crisis_user_data`, `crisis_token_expiry` are present
4. Refresh page (F5) → User should still be logged in
5. Clear localStorage → User should be logged out
6. Logout manually → localStorage should be cleared

### Automated Test (Example):
```javascript
// Test: Persistence after refresh
test('User remains logged in after page refresh', async () => {
  const { login } = renderHook(() => useAuth());
  
  login({ id: 'TEST-001', role: 'staff', name: 'Test User' });
  
  // Simulate page refresh by checking localStorage
  const stored = localStorage.getItem('crisis_user_data');
  expect(stored).toContain('TEST-001');
  
  // New mount should restore user
  const { result } = renderHook(() => useAuth());
  expect(result.current.user.id).toBe('TEST-001');
});
```

## API Reference

### `authService.js`

#### `saveAuthToken(user, token?)`
- **Parameters**: 
  - `user` (Object): User data to store
  - `token` (String, optional): Auth token
- **Returns**: Generated/provided token string
- **Usage**: Called after successful login

#### `getStoredToken()`
- **Returns**: Stored token string or null
- **Usage**: Retrieve current auth token

#### `getStoredUser()`
- **Returns**: Stored user object or null
- **Usage**: Get stored user profile

#### `isTokenValid()`
- **Returns**: Boolean indicating if token is valid and not expired
- **Usage**: Check if user should be logged in

#### `clearAuthData()`
- **Returns**: void
- **Usage**: Clear all auth data (called on logout)

#### `extendTokenExpiry()`
- **Returns**: void
- **Usage**: Extend token lifetime on user activity

#### `getTokenTimeRemaining()`
- **Returns**: Number of milliseconds until expiry
- **Usage**: Get remaining session time

#### `formatTimeRemaining()`
- **Returns**: Formatted string (e.g., "5 days", "2 hours")
- **Usage**: Display expiry time to user

### `useAuth.js` Hook

#### `useAuth()`
Custom React hook that manages authentication.

**Returns Object**:
```javascript
{
  user: Object | null,           // Current user data
  isLoggedIn: Boolean,           // Auth status
  isLoading: Boolean,            // Loading state
  login: Function,               // Login user
  logout: Function,              // Logout user
  checkAuth: Function,           // Manually check auth
  updateUser: Function           // Update user data
}
```

**Usage**:
```javascript
const { user, login, logout, isLoggedIn, isLoading } = useAuth();
```

## Next Steps

1. **Test the implementation** by logging in and refreshing the page
2. **Configure token expiry** duration to match your requirements
3. **Add backend validation** for enhanced security
4. **Implement refresh token** strategy for production
5. **Set up automatic logout** on token expiry
6. **Add session activity monitoring** to extend tokens on user action

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify localStorage is enabled in browser
3. Check that all files are imported correctly
4. Review the troubleshooting section above
