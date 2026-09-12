import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LangProvider } from './contexts/LangContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitGrievance from './pages/SubmitGrievance';
import TrackGrievance from './pages/TrackGrievance';
import FollowedGrievances from './pages/FollowedGrievances';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

const HIDE_NAVBAR = ['/', '/login', '/register'];

function AppInner() {
  const location = useLocation();
  const hideNav = HIDE_NAVBAR.includes(location.pathname);
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && <Navbar />}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/submit" element={<PrivateRoute><SubmitGrievance /></PrivateRoute>} />
        <Route path="/track/:grievanceId" element={<PrivateRoute><TrackGrievance /></PrivateRoute>} />
        <Route path="/followed" element={<PrivateRoute><FollowedGrievances /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute requiredRole={['officer', 'admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute requiredRole={['admin']}><Analytics /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <LangProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppInner />
          </NotificationProvider>
        </AuthProvider>
      </LangProvider>
    </Router>
  );
}

export default App;
