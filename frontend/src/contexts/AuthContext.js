import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token'));
  // Tracks whether login() already hydrated the user — prevents double fetchUser
  const loginHydratedRef = useRef(false);

  useEffect(() => {
    if (accessToken && !loginHydratedRef.current) {
      // Page refresh or external token — need to fetch user
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      fetchUser();
    } else if (!accessToken) {
      setLoading(false);
    }
    // Reset the flag after the effect runs
    loginHydratedRef.current = false;
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me/');
      setUser(res.data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login/', { username, password });
      const { access, refresh, user: userData } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      // Mark that login already hydrated the user — skip fetchUser in useEffect
      loginHydratedRef.current = true;
      setUser(userData);
      setLoading(false);
      setAccessToken(access);
      toast.success('Login successful!');
      return userData;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
      return null;
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register/', userData);
      const { access, refresh, user: newUser } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      loginHydratedRef.current = true;
      setUser(newUser);
      setLoading(false);
      setAccessToken(access);
      toast.success('Registration successful!');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    loginHydratedRef.current = false;
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAuthenticated: !!accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
