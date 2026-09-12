import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaBookmark, FaRegBookmark, FaQrcode,
  FaMapMarkerAlt, FaSearch, FaBell,
  FaBolt, FaTint, FaRoad, FaTrash, FaLightbulb, FaShieldAlt,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { PageSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CAT = {
  electricity:  { icon: FaBolt,      bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',  grad: 'from-amber-400 to-orange-400'   },
  water:        { icon: FaTint,      bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',    grad: 'from-sky-400 to-cyan-400'       },
  road:         { icon: FaRoad,      bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',  grad: 'from-slate-400 to-gray-500'     },
  garbage:      { icon: FaTrash,     bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200',grad: 'from-emerald-400 to-teal-400'   },
  streetlight:  { icon: FaLightbulb, bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',   grad: 'from-cyan-400 to-sky-400'       },
  sewage:       { icon: FaShieldAlt, bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200', grad: 'from-indigo-400 to-violet-400'  },
  park:         { icon: FaShieldAlt, bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',   grad: 'from-teal-400 to-emerald-400'   },
  noise:        { icon: FaShieldAlt, bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200', grad: 'from-violet-400 to-purple-400'  },
  encroachment: { icon: FaShieldAlt, bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',   grad: 'from-rose-400 to-pink-400'      },
  other:        { icon: FaShieldAlt, bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',   grad: 'from-gray-400 to-slate-400'     },
};
const STATUS_MAP = {
  pending:       { key: 'pending',         cls: 'bg-slate-100 text-slate-700'     },
  filed:         { key: 'submitted',       cls: 'bg-blue-100 text-blue-700'       },
  under_review:  { key: 'underReviewStatus', cls: 'bg-amber-100 text-amber-700'   },
  assigned:      { key: 'assignedStatus',  cls: 'bg-violet-100 text-violet-700'   },
  investigating: { key: 'underReviewStatus', cls: 'bg-orange-100 text-orange-700' },
  approved:      { key: 'approved',        cls: 'bg-emerald-100 text-emerald-700' },
  in_progress:   { key: 'inProgressStatus', cls: 'bg-cyan-100 text-cyan-700'      },
  completed:     { key: 'completed',       cls: 'bg-teal-100 text-teal-700'       },
  resolved:      { key: 'resolvedStatus',  cls: 'bg-green-100 text-green-700'     },
  closed:        { key: 'closedStatus',    cls: 'bg-slate-100 text-slate-600'     },
  rejected:      { key: 'rejectedStatus',  cls: 'bg-rose-100 text-rose-700'       },
  escalated:     { key: 'escalatedStatus', cls: 'bg-red-100 text-red-700'         },
};

function QRModal({ grievance, onClose, t }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
        className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <FaQrcode className="text-2xl text-violet-600" />
        </div>
        <p className="font-mono text-xs text-slate-400 mb-0.5">{grievance.grievance_id}</p>
        <p className="font-bold text-slate-800 mb-4 text-sm line-clamp-2">{grievance.title}</p>
        {grievance.qr_code_url
          ? <img src={grievance.qr_code_url} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border-2 border-slate-100 shadow-sm" />
          : (
            <div className="w-44 h-44 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center">
              <FaQrcode className="text-6xl text-slate-300" />
            </div>
          )
        }
        <p className="text-xs text-slate-400 mt-3">{t('scanToTrack')}</p>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
        >
          {t('close')}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ComplaintCard({ g, onToggleFollow, onShowQR, t }) {
  const cat = CAT[g.category] || CAT.other;
  const st = STATUS_MAP[g.status] || { key: g.status, cls: 'bg-slate-100 text-slate-600' };
  const Icon = cat.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl overflow-hidden shadow-sm border ${cat.border} hover:shadow-lg transition-all duration-200`}
    >
      {/* Image area */}
      <div className="relative h-44 overflow-hidden">
        {g.first_image
          ? <img src={g.first_image} alt={g.title} className="w-full h-full object-cover" />
          : (
            <div className={`w-full h-full bg-gradient-to-br ${cat.grad} flex items-center justify-center`}>
              <Icon className="text-6xl text-white/40" />
            </div>
          )
        }
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* AI Category badge — top left */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 ${cat.bg} ${cat.text} px-2.5 py-1 rounded-full text-xs font-bold border ${cat.border} shadow-sm backdrop-blur-sm`}>
          <Icon className="text-xs" />
          <span className="capitalize">{g.ai_category || g.category}</span>
          {g.ai_confidence > 0 && (
            <span className="opacity-60 font-normal">· {Math.round(g.ai_confidence * 100)}%</span>
          )}
        </div>

        {/* Status badge — top right */}
        <div className={`absolute top-3 right-3 ${st.cls} px-2.5 py-1 rounded-full text-xs font-bold shadow-sm`}>
          {t(st.key) || g.status}
        </div>

        {/* QR mini preview — bottom right */}
        <button
          onClick={() => onShowQR(g)}
          className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md hover:bg-white transition"
        >
          {g.qr_code_url
            ? <img src={g.qr_code_url} alt="QR" className="w-7 h-7 rounded" />
            : <FaQrcode className="text-slate-500 text-sm" />
          }
        </button>
      </div>

      <div className="p-4">
        <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-2">{g.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <FaMapMarkerAlt className="flex-shrink-0 text-violet-400" />
          <span className="truncate">{g.address || t('locationNotSpecified')}</span>
        </div>

        {/* App ID row */}
        <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3 flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-xs text-slate-400">{t('appId')}</p>
            <p className="font-mono text-xs font-bold text-violet-700 tracking-wide">{g.grievance_id}</p>
          </div>
          <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(g.submitted_at), { addSuffix: true })}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Save / Follow */}
          <button
            onClick={() => onToggleFollow(g)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition flex-1 justify-center border ${
              g.is_following
                ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
            }`}
          >
            {g.is_following
              ? <><FaBookmark className="text-xs" /> {t('following')}</>
              : <><FaRegBookmark className="text-xs" /> {t('save')}</>
            }
          </button>

          {/* Track */}
          <Link
            to={`/track/${g.grievance_id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition flex-1 justify-center"
          >
            {t('trackBtn')}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrTarget, setQrTarget] = useState(null);
  const [trackInput, setTrackInput] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        axios.get('/api/grievances/dashboard_stats/'),
        axios.get('/api/grievances/'),
      ]);
      setStats(sRes.data);
      setComplaints(lRes.data.results || lRes.data || []);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFollow = async (g) => {
    try {
      const res = await axios.post(`/api/grievances/${g.grievance_id}/toggle_follow/`);
      setComplaints(prev => prev.map(c =>
        c.grievance_id === g.grievance_id ? { ...c, is_following: res.data.following } : c
      ));
      toast.success(res.data.following ? t('following') + '!' : 'Removed');
    } catch { toast.error('Failed'); }
  };

  const handleTrack = (e) => {
    e.preventDefault();
    const id = trackInput.trim();
    if (id) navigate(`/track/${id}`);
  };

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: t('total'),       value: stats?.total || 0,       color: 'from-violet-500 to-purple-600',  icon: '📋' },
    { label: t('underReview'), value: stats?.filed || 0,        color: 'from-amber-400 to-orange-500',   icon: '🔍' },
    { label: t('inProgress'),  value: stats?.in_progress || 0,  color: 'from-cyan-500 to-sky-600',       icon: '⚙️' },
    { label: t('resolved'),    value: stats?.resolved || 0,     color: 'from-emerald-500 to-teal-600',   icon: '✅' },
  ];

  const filtered = filter === 'all' ? complaints
    : filter === 'active' ? complaints.filter(c => ['filed','assigned','investigating','in_progress'].includes(c.status))
    : filter === 'resolved' ? complaints.filter(c => c.status === 'resolved')
    : complaints.filter(c => c.is_following);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white px-4 pt-8 pb-20 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-violet-300 text-sm">{t('goodDay')}</p>
              <h1 className="text-2xl font-bold">{user?.first_name || user?.username}</h1>
            </div>
            <Link
              to="/submit"
              className="flex items-center gap-2 bg-white text-violet-700 px-4 py-2.5 rounded-full font-bold text-sm hover:bg-violet-50 transition shadow-lg shadow-violet-900/30"
            >
              <FaPlus /> {t('newComplaint')}
            </Link>
          </div>

          {/* Track search */}
          <form onSubmit={handleTrack} className="flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                placeholder={t('trackId')}
                className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
              />
            </div>
            <button type="submit" className="bg-white/20 border border-white/30 text-white px-5 py-3 rounded-2xl text-sm font-semibold hover:bg-white/30 transition">
              {t('track')}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 pb-12 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-4 shadow-lg`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{s.label}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'all',      label: t('all')      },
            { key: 'active',   label: t('active')   },
            { key: 'resolved', label: t('resolved') },
            { key: 'saved',    label: `🔖 ${t('saved')}` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                filter === f.key
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300 hover:text-violet-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Complaint cards */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-14 text-center border border-slate-100 shadow-sm"
          >
            <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <FaBell className="text-3xl text-violet-300" />
            </div>
            <p className="text-slate-700 font-bold text-lg mb-1">{t('noComplaints')}</p>
            <p className="text-slate-400 text-sm mb-6">{t('fileFirst')}</p>
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-violet-700 transition shadow-md shadow-violet-200"
            >
              <FaPlus /> {t('fileComplaint')}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map(g => (
                <ComplaintCard
                  key={g.id}
                  g={g}
                  onToggleFollow={toggleFollow}
                  onShowQR={setQrTarget}
                  t={t}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {qrTarget && <QRModal grievance={qrTarget} onClose={() => setQrTarget(null)} t={t} />}
      </AnimatePresence>
    </div>
  );
}
