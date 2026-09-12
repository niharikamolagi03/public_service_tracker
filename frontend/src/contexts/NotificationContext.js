import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  fetchNotifications: () => {},
  markAllRead: () => {},
  markRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Track last fetch time so officer dashboard can detect new complaints
  const lastFetchRef = useRef(new Date().toISOString());

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications/list_notifications/');
      const data = res.data;
      const prevUnread = unreadCount;
      const newUnread = data.filter(n => !n.is_read).length;

      // Show toast for new unread notifications (officer/admin: new complaint alerts)
      if (newUnread > prevUnread) {
        const newest = data.find(n => !n.is_read);
        if (newest && (user.role === 'officer' || user.role === 'admin')) {
          toast(newest.title, {
            icon: '🔔',
            duration: 5000,
            style: { background: '#4c1d95', color: '#fff', fontWeight: '600' },
          });
        }
      }

      setNotifications(data);
      setUnreadCount(newUnread);
      lastFetchRef.current = new Date().toISOString();
    } catch (_) {}
  }, [user, unreadCount]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 seconds for near-real-time updates
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await axios.post('/api/notifications/mark_all_read/');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    await axios.post(`/api/notifications/${id}/mark_read/`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAllRead, markRead, lastFetchRef }}>
      {children}
    </NotificationContext.Provider>
  );
};
