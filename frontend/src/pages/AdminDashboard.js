import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  FaSearch, FaTimes, FaEye, FaUserTie, FaCheckCircle, FaTimesCircle,
  FaExclamationTriangle, FaClock, FaShieldAlt, FaIdCard, FaUserCheck,
  FaThumbsUp, FaThumbsDown, FaChartBar, FaBell, FaSyncAlt,
} from 'react-icons/fa';
import { PageSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-700', under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700', completed: 'bg-teal-100 text-teal-700',
  filed: 'bg-sky-100 text-sky-700', assigned: 'bg-violet-100 text-violet-700',
  investigating: 'bg-orange-100 text-orange-700', in_progress: 'bg-cyan-100 text-cyan-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-600',
  rejected: 'bg-rose-100 text-rose-700', escalated: 'bg-red-100 text-red-700',
};
const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600', medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-rose-100 text-rose-700',
};
const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All' }, { key: 'garbage', label: 'Garbage' },
  { key: 'water', label: 'Water' }, { key: 'streetlight', label: 'Streetlight' },
  { key: 'electricity', label: 'Electricity' }, { key: 'road', label: 'Road' },
  { key: 'sewage', label: 'Sewage' }, { key: 'park', label: 'Parks' },
  { key: 'noise', label: 'Noise' }, { key: 'encroachment', label: 'Encroachment' },
  { key: 'public_safety', label: 'Public Safety' }, { key: 'other', label: 'Other' },
];

const Badge = ({ text, cls }) => (
  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
    {text?.replace(/_/g, ' ').toUpperCase()}
  </span>
);
const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white';

const Modal = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-violet-100"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <Icon className="text-3xl opacity-20 text-slate-500" />
    </div>
  </div>
);

// New complaint alert banner shown when new complaints arrive in real-time
function NewComplaintBanner({ count, complaints, onRefresh, onDismiss }) {
  if (!count) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-violet-700 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-lg border border-violet-500"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <FaBell className="text-sm" />
        </div>
        <div>
          <p className="font-bold text-sm">
            {count} new complaint{count > 1 ? 's' : ''} received
          </p>
          {complaints[0] && (
            <p className="text-violet-200 text-xs">
              Latest: {complaints[0].title} — {complaints[0].category}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 bg-white text-violet-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-violet-50 transition"
        >
          <FaSyncAlt className="text-xs" /> Load Now
        </button>
        <button onClick={onDismiss} className="text-violet-300 hover:text-white p-1">
          <FaTimes className="text-xs" />
        </button>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState({});
  const [officers, setOfficers] = useState([]);
  const [pendingOfficers, setPendingOfficers] = useState([]);
  const [activeTab, setActiveTab] = useState('grievances');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAction, setShowAction] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionForm, setActionForm] = useState({ message: '', resolution_notes: '', rejection_reason: '', expected_resolution: '', officer_id: '' });
  const [submitting, setSubmitting] = useState(false);
  // Real-time new complaint tracking
  const [newComplaints, setNewComplaints] = useState([]);
  const lastLoadedAt = useRef(new Date().toISOString());

  const fetchAll = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterDept) params.department = filterDept;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (search) params.search = search;
      const calls = [
        axios.get('/api/grievances/', { params }),
        axios.get('/api/grievances/dashboard_stats/'),
      ];
      if (isAdmin) {
        calls.push(axios.get('/api/grievances/officers_list/'));
        calls.push(axios.get('/api/auth/pending_officers/'));
      }
      const results = await Promise.all(calls);
      setGrievances(results[0].data.results || results[0].data || []);
      setStats(results[1].data);
      if (isAdmin) { setOfficers(results[2].data); setPendingOfficers(results[3].data); }
      lastLoadedAt.current = new Date().toISOString();
      setNewComplaints([]);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [filterStatus, filterPriority, filterDept, selectedCategory, search, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll for new complaints every 5 seconds using new_since endpoint
  useEffect(() => {
    const checkNew = async () => {
      try {
        const res = await axios.get('/api/grievances/new_since/', {
          params: { since: lastLoadedAt.current },
        });
        if (res.data.count > 0) {
          setNewComplaints(res.data.complaints);
          // Play a subtle notification sound via toast
          toast(`🔔 ${res.data.count} new complaint${res.data.count > 1 ? 's' : ''} received`, {
            duration: 4000,
            style: { background: '#4c1d95', color: '#fff', fontWeight: '600' },
          });
        }
      } catch (_) {}
    };
    const interval = setInterval(checkNew, 5000);
    return () => clearInterval(interval);
  }, []); // intentionally no deps — uses ref for lastLoadedAt

  const openAction = (g, type) => {
    setSelected(g);
    setActionType(type);
    setActionForm({ message: '', resolution_notes: '', rejection_reason: '', expected_resolution: '', officer_id: '' });
    setShowAction(true);
  };

  const submitAction = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (actionType === 'assign') {
        await axios.post(`/api/grievances/${selected.grievance_id}/assign_officer/`, { officer_id: actionForm.officer_id });
        toast.success('Officer assigned');
      } else {
        const statusMap = {
          review: 'under_review', approve: 'approved', complete: 'completed',
          resolve: 'resolved', progress: 'in_progress', reject: 'rejected',
          escalate: 'escalated', close: 'closed',
        };
        await axios.post(`/api/grievances/${selected.grievance_id}/update_status/`, {
          status: statusMap[actionType] || actionType,
          message: actionForm.message,
          resolution_notes: actionForm.resolution_notes,
          rejection_reason: actionForm.rejection_reason,
          expected_resolution: actionForm.expected_resolution || undefined,
        });
        toast.success('Status updated');
      }
      setShowAction(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Action failed'); }
    finally { setSubmitting(false); }
  };

  const reviewOfficer = async (appId, decision, reason = '') => {
    try {
      await axios.post('/api/auth/review_officer/', { application_id: appId, decision, reason });
      toast.success(`Officer ${decision}`);
      fetchAll();
    } catch { toast.error('Action failed'); }
  };

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: 'Total', value: stats.total || 0, icon: FaShieldAlt, color: 'border-violet-400', sub: `${stats.today || 0} today` },
    { label: 'Filed / Pending', value: stats.filed || 0, icon: FaClock, color: 'border-sky-400' },
    { label: 'In Progress', value: stats.in_progress || 0, icon: FaExclamationTriangle, color: 'border-amber-400' },
    { label: 'Resolved', value: stats.resolved || 0, icon: FaCheckCircle, color: 'border-emerald-400' },
    { label: 'Completed', value: stats.completed || 0, icon: FaCheckCircle, color: 'border-teal-400' },
    { label: 'Rejected', value: stats.rejected || 0, icon: FaTimesCircle, color: 'border-rose-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">{isAdmin ? 'Admin Dashboard' : 'Officer Dashboard'}</h1>
          <p className="text-violet-200 mt-1">
            {user?.department ? `Department: ${user.department.replace(/_/g, ' ')}` : 'All Departments'} — Manage and resolve citizen grievances
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Real-time new complaint banner */}
        <AnimatePresence>
          {newComplaints.length > 0 && (
            <NewComplaintBanner
              count={newComplaints.length}
              complaints={newComplaints}
              onRefresh={fetchAll}
              onDismiss={() => setNewComplaints([])}
            />
          )}
        </AnimatePresence>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* Category breakdown */}
        {stats.by_category?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FaChartBar className="text-violet-500" /> By Category
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.by_category.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2 border border-violet-100">
                  <span className="text-sm font-medium text-violet-700 capitalize">{c.category.replace(/_/g, ' ')}</span>
                  <span className="text-xs bg-violet-200 text-violet-800 rounded-full px-2 py-0.5">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setActiveTab('grievances')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition ${activeTab === 'grievances' ? 'bg-white border border-b-white border-slate-200 text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>
            Grievances
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('officers')}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 ${activeTab === 'officers' ? 'bg-white border border-b-white border-slate-200 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <FaIdCard /> Officer Verification
              {pendingOfficers.length > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingOfficers.length}</span>
              )}
            </button>
          )}
        </div>

        {/* Officer verification tab */}
        {activeTab === 'officers' && isAdmin && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-800">Pending Officer Verifications ({pendingOfficers.length})</h2>
            </div>
            {pendingOfficers.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <FaUserCheck className="text-4xl mx-auto mb-3 opacity-30" />
                <p>No pending applications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingOfficers.map(emp => <OfficerCard key={emp.id} emp={emp} onReview={reviewOfficer} />)}
              </div>
            )}
          </div>
        )}

        {/* Grievances tab */}
        {activeTab === 'grievances' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by ID, title, citizen..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">All Statuses</option>
                  {['pending','filed','under_review','assigned','investigating','approved','in_progress','completed','resolved','rejected','escalated','closed'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">All Priorities</option>
                  {['low','medium','high','critical'].map(p => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">All Departments</option>
                  {['electricity','water','municipal','police','transport','health','other'].map(d => (
                    <option key={d} value={d}>{d.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
                {(filterStatus || filterPriority || filterDept || search || selectedCategory !== 'all') && (
                  <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterDept(''); setSearch(''); setSelectedCategory('all'); }}
                    className="text-sm text-rose-500 hover:text-rose-700 flex items-center gap-1">
                    <FaTimes /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category filter pills */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
              <div className="flex flex-wrap gap-2 items-center">
                {CATEGORY_OPTIONS.map(option => (
                  <button key={option.key} onClick={() => setSelectedCategory(option.key)}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${selectedCategory === option.key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grievances table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
              <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Grievances ({grievances.length})</h2>
                <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition">
                  <FaSyncAlt className="text-xs" /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      {['ID','Citizen','Title','Category','Location','Image','Priority','Status','Submitted','Officer','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grievances.map(g => (
                      <tr key={g.id} className={`hover:bg-slate-50 transition ${g.priority === 'critical' ? 'bg-rose-50' : ''}`}>
                        <td className="px-4 py-3 font-mono font-semibold text-violet-700 text-xs whitespace-nowrap">{g.grievance_id}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{g.citizen_name}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate text-xs">{g.title}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize text-xs">{g.category?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                          {g.address ? `${g.address}${g.pincode ? ` • ${g.pincode}` : ''}` : (g.pincode || '—')}
                        </td>
                        <td className="px-4 py-3">
                          {g.first_image
                            ? <img src={g.first_image} alt="preview" className="h-10 w-14 rounded-lg object-cover border border-slate-200" />
                            : <span className="text-slate-400 text-xs">No image</span>
                          }
                        </td>
                        <td className="px-4 py-3"><Badge text={g.priority} cls={PRIORITY_COLORS[g.priority] || 'bg-slate-100 text-slate-600'} /></td>
                        <td className="px-4 py-3"><Badge text={g.status} cls={STATUS_COLORS[g.status] || 'bg-slate-100 text-slate-600'} /></td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {format(new Date(g.submitted_at), 'dd MMM yy')}
                          <br />
                          <span className="text-slate-400">{formatDistanceToNow(new Date(g.submitted_at), { addSuffix: true })}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{g.officer_name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link to={`/track/${g.grievance_id}`}
                              className="p-1.5 bg-violet-50 text-violet-600 rounded hover:bg-violet-100 transition" title="View">
                              <FaEye className="text-xs" />
                            </Link>
                            {['filed','pending'].includes(g.status) && (
                              <button onClick={() => openAction(g, 'review')}
                                className="p-1.5 bg-sky-50 text-sky-600 rounded hover:bg-sky-100 transition" title="Start Review">
                                <FaUserCheck className="text-xs" />
                              </button>
                            )}
                            {['assigned','investigating','in_progress','under_review'].includes(g.status) && (
                              <>
                                <button onClick={() => openAction(g, 'approve')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition" title="Approve"><FaCheckCircle className="text-xs" /></button>
                                <button onClick={() => openAction(g, 'reject')} className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition" title="Reject"><FaTimesCircle className="text-xs" /></button>
                                <button onClick={() => openAction(g, 'escalate')} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition" title="Escalate"><FaExclamationTriangle className="text-xs" /></button>
                              </>
                            )}
                            {g.status === 'approved' && (
                              <>
                                <button onClick={() => openAction(g, 'complete')} className="p-1.5 bg-cyan-50 text-cyan-600 rounded hover:bg-cyan-100 transition" title="Complete"><FaCheckCircle className="text-xs" /></button>
                                <button onClick={() => openAction(g, 'reject')} className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition" title="Reject"><FaTimesCircle className="text-xs" /></button>
                              </>
                            )}
                            {isAdmin && (
                              <button onClick={() => openAction(g, 'assign')}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition" title="Assign Officer">
                                <FaUserTie className="text-xs" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {grievances.length === 0 && (
                      <tr><td colSpan="11" className="px-6 py-10 text-center text-slate-400">No grievances found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Modal */}
      <Modal open={showAction} onClose={() => setShowAction(false)}
        title={actionType === 'assign' ? 'Assign Officer' : `${actionType?.charAt(0).toUpperCase()}${actionType?.slice(1)} Grievance`}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-violet-50 rounded-lg p-3 text-sm border border-violet-100">
              <span className="text-violet-700 font-mono font-semibold">{selected.grievance_id}</span>
              <span className="text-slate-500 ml-2">— {selected.title}</span>
            </div>
            {actionType === 'assign' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Officer</label>
                <select value={actionForm.officer_id} onChange={e => setActionForm(p => ({ ...p, officer_id: e.target.value }))} className={inputCls}>
                  <option value="">Choose an officer...</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.username} ({o.department || o.role})</option>)}
                </select>
              </div>
            ) : (
              <>
                {actionType === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
                    <textarea rows={3} value={actionForm.rejection_reason}
                      onChange={e => setActionForm(p => ({ ...p, rejection_reason: e.target.value }))}
                      className={inputCls} placeholder="Explain why this grievance is being rejected..." />
                  </div>
                )}
                {actionType === 'resolve' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Resolution Notes</label>
                      <textarea rows={3} value={actionForm.resolution_notes}
                        onChange={e => setActionForm(p => ({ ...p, resolution_notes: e.target.value }))}
                        className={inputCls} placeholder="Describe how the issue was resolved..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Resolution Date</label>
                      <input type="datetime-local" value={actionForm.expected_resolution}
                        onChange={e => setActionForm(p => ({ ...p, expected_resolution: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message / Notes</label>
                  <textarea rows={2} value={actionForm.message}
                    onChange={e => setActionForm(p => ({ ...p, message: e.target.value }))}
                    className={inputCls} placeholder="Add a note for the citizen..." />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAction(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={submitAction} disabled={submitting}
                className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Confirm'
                }
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OfficerCard({ emp, onReview }) {
  const [rejReason, setRejReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  return (
    <div className="p-5 hover:bg-slate-50 transition">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{emp.username}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
              {emp.department?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{emp.email} · {emp.official_email}</p>
          <p className="text-xs text-slate-400">Employee ID: <span className="font-mono text-slate-600">{emp.employee_id}</span></p>
          <p className="text-xs text-slate-400">Submitted: {format(new Date(emp.submitted_at), 'dd MMM yyyy, hh:mm a')}</p>
          {emp.id_card && (
            <a href={`http://localhost:8000${emp.id_card}`} target="_blank" rel="noreferrer"
              className="text-xs text-violet-600 hover:underline flex items-center gap-1">
              <FaIdCard /> View ID Card
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-[160px]">
          {!showReject ? (
            <>
              <button onClick={() => onReview(emp.id, 'approved')}
                className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition">
                <FaThumbsUp /> Approve
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-lg text-sm hover:bg-rose-100 transition">
                <FaThumbsDown /> Reject
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <textarea rows={2} value={rejReason} onChange={e => setRejReason(e.target.value)}
                placeholder="Rejection reason..."
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400" />
              <div className="flex gap-2">
                <button onClick={() => setShowReject(false)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">Cancel</button>
                <button onClick={() => { onReview(emp.id, 'rejected', rejReason); setShowReject(false); }}
                  className="flex-1 text-xs bg-rose-500 text-white rounded-lg py-1.5 hover:bg-rose-600">Confirm</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
