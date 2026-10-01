import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('crisisgrid_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('crisisgrid_token');
      const storedUser = localStorage.getItem('crisisgrid_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Refresh user data in background
          const meData = await authService.getMe();
          if (meData.user) {
            setUser(meData.user);
            localStorage.setItem('crisisgrid_user', JSON.stringify(meData.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid. Logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('crisisgrid_token', res.token);
      localStorage.setItem('crisisgrid_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Invalid response from server.');
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('crisisgrid_token', res.token);
      localStorage.setItem('crisisgrid_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Registration failed.');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('crisisgrid_token');
    localStorage.removeItem('crisisgrid_user');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isCitizen: user?.role === 'citizen'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
