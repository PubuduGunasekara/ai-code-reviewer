import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

// The context — a global "box" that holds the user state
// Any component can reach into this box and get the user
const AuthContext = createContext(null);

// The Provider — wraps your entire app
// Everything inside it can read the user state
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, check if the user is already logged in
  // (they might have a valid session cookie from before)
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false); // done checking — show the app
    }
  }

  function login() {
    // Redirect to backend OAuth route
    // Backend handles the entire GitHub OAuth dance
    // and redirects back here with a session cookie set
    window.location.href = '/auth/github';
  }

  async function logout() {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if logout API fails, clear local state
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }

  // Expose user, login, logout to all child components
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — clean way for any component to use auth
// Instead of: const { user } = useContext(AuthContext);
// Just write: const { user } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}