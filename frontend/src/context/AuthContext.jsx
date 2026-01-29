import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Configure axios defaults
  const api = axios.create({
    baseURL: API_URL,
  });

  // Add token to requests
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, role, phone, firstName, lastName) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', {
        email,
        password,
        role,
        phone,
        first_name: firstName,
        last_name: lastName,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  const updateProfile = async (data) => {
    try {
      setError(null);
      const response = await api.put('/auth/profile', data);
      setUser(response.data.user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isFarmer: user?.role === 'farmer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
