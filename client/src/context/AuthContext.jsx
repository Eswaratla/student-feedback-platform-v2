import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nexgen_auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.role || !parsed?.loginId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredAuth);

  const value = useMemo(() => {
    function login(account) {
      const nextUser = {
        role: account.role,
        loginId: account.loginId,
        studentId: account.studentId || null,
        staffId: account.staffId || null,
        email: account.email,
        name: account.name,
        departmentId: account.departmentId || null,
        courseId: account.courseId || null,
        jobTitle: account.jobTitle || '',
        mustChangePassword: Boolean(account.mustChangePassword),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    }

    return {
      user,
      isStudent: user?.role === 'student',
      isStaff: user?.role === 'staff',
      login,
      loginStudent(account) {
        return login({ ...account, role: 'student' });
      },
      loginStaff(account) {
        return login({ ...account, role: 'staff' });
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
