import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nexgen_auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredAuth);

  const value = useMemo(() => {
    function login({ role, email, name }) {
      const nextUser = { role, email, name };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    }

    return {
      user,
      isStudent: user?.role === 'student',
      isStaff: user?.role === 'staff',
      login,
      loginStudent({ email, name }) {
        return login({ role: 'student', email, name });
      },
      loginStaff({ email, name }) {
        return login({ role: 'staff', email, name });
      },
      updateProfile(updates) {
        if (!user) return null;
        const nextUser = { ...user, ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        return nextUser;
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
