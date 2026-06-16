import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper to decode JWT and extract user data
const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      role: payload.role,
      isProfileComplete: payload.isProfileComplete,
      name: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      profilePicture: payload.profilePicture,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  
  // Auth Modal State
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const openAuth = (type = 'login') => setAuthModal(type);
  const closeAuth = () => setAuthModal(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
      } else {
        logout();
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = (newToken, userData) => {
    sessionStorage.setItem('token', newToken);
    // Ensure any leftover localStorage tokens from before the fix are cleared
    localStorage.removeItem('token');
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    const decoded = decodeToken(newToken);
    setUser({ ...userData, ...decoded });
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, authModal, openAuth, closeAuth }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
