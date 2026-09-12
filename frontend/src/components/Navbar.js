import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLang } from '../contexts/LangContext';
import { FaBell, FaCheckDouble, FaBars, FaTimes, FaSignOutAlt, FaUser, FaShieldAlt, FaSignInAlt } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const TYPE_COLORS = {
  filed: 'bg-violet-100 text-violet-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  escalated: 'bg-orange-100 text-orange-700',
  comment: 'bg-slate-100 text-slate-700',
  info: 'bg-slate-100 text-slate-600',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const { lang, changeLang } = useLang();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = user?.role === 'admin';
  const isOfficer = user?.role === 'officer' || isAdmin;

  return (
    <nav className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 font-bold text-xl hover:opacity-90 transition">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <FaShieldAlt className="text-base text-purple-200" />
            </div>
            <span className="hidden sm:inline tracking-wide">CivicRedress</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            {user ? (
              <>
                <Link to="/dashboard" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Dashboard</Link>
                <Link to="/submit" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">File Complaint</Link>
                <Link to="/followed" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Saved</Link>
                {isOfficer && <Link to="/admin" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Officer Portal</Link>}
                {isAdmin && <Link to="/analytics" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Analytics</Link>}
              </>
            ) : (
              /* Prominent Sign In + Register when logged out */
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="flex items-center gap-2 bg-white text-purple-700 px-5 py-2 rounded-full font-semibold text-sm hover:bg-purple-50 transition shadow-sm">
                  <FaSignInAlt className="text-xs" /> Sign In
                </Link>
                <Link to="/register"
                  className="flex items-center gap-2 bg-white/15 border border-white/30 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-white/25 transition">
                  Register Free
                </Link>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifs(v => !v)}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition">
                  <FaBell className="text-xl" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-purple-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-purple-100">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-purple-50">
                      <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                          <FaCheckDouble /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y">
                      {notifications.length === 0 && <p className="text-center text-slate-400 text-sm py-6">No notifications yet</p>}
                      {notifications.map(n => (
                        <div key={n.id}
                          onClick={() => { markRead(n.id); if (n.grievance_id) { navigate(`/track/${n.grievance_id}`); setShowNotifs(false); } }}
                          className={`px-4 py-3 cursor-pointer hover:bg-purple-50 transition ${!n.is_read ? 'bg-violet-50' : ''}`}>
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${TYPE_COLORS[n.notification_type] || TYPE_COLORS.info}`}>
                              {n.notification_type?.replace(/_/g, ' ')}
                            </span>
                            {!n.is_read && <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-sm font-medium text-slate-800 mt-1">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="relative group hidden md:block">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm">
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                    <FaUser className="text-xs" />
                  </div>
                  <span className="max-w-[100px] truncate">{user.username}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl hidden group-hover:block z-50 border border-purple-100 overflow-hidden">
                  <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                    <span className="text-xs text-purple-600 capitalize">{user.role}</span>
                  </div>
                  <Link to="/profile" className="block px-4 py-2.5 text-slate-700 hover:bg-purple-50 text-sm transition">Profile</Link>
                  <hr className="border-purple-100" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-sm transition">
                    <FaSignOutAlt /><span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Mobile-visible Sign In button */
              <Link to="/login"
                className="md:hidden flex items-center gap-1.5 bg-white text-purple-700 px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-purple-50 transition shadow-sm">
                <FaSignInAlt className="text-xs" /> Sign In
              </Link>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition text-xl">
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
            {/* Language switcher */}
            <select
              value={lang}
              onChange={e => changeLang(e.target.value)}
              className="bg-white/15 border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="en" className="text-slate-800">EN</option>
              <option value="kn" className="text-slate-800">ಕನ್ನಡ</option>
              <option value="hi" className="text-slate-800">हिंदी</option>
            </select>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-white/20 space-y-1 text-sm">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">Dashboard</Link>
                <Link to="/submit" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">File Complaint</Link>
                <Link to="/followed" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">Saved</Link>
                {isOfficer && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">Officer Portal</Link>}
                {isAdmin && <Link to="/analytics" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">Analytics</Link>}
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition">Profile</Link>
                <button onClick={handleLogout} className="w-full text-left py-2.5 px-3 hover:bg-white/10 rounded-lg transition text-rose-300 flex items-center gap-2">
                  <FaSignOutAlt /> Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-white text-purple-700 py-2.5 px-3 rounded-lg font-semibold transition">
                  <FaSignInAlt /> Sign In
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="block py-2.5 px-3 hover:bg-white/10 rounded-lg transition text-center">
                  Register Free
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
