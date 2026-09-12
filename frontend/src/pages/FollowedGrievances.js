import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaBookmark, FaShieldAlt, FaBolt, FaTint, FaRoad, FaTrash, FaLightbulb } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { PageSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CAT_ICONS = { electricity: FaBolt, water: FaTint, road: FaRoad, garbage: FaTrash, streetlight: FaLightbulb };
const STATUS_COLORS = {
  filed: 'bg-blue-100 text-blue-700', assigned: 'bg-purple-100 text-purple-700',
  investigating: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700', escalated: 'bg-red-100 text-red-800',
};

export default function FollowedGrievances() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/grievances/my_followed/')
      .then(r => setGrievances(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const unfollow = async (grievanceId) => {
    try {
      await axios.post(`/api/grievances/${grievanceId}/toggle_follow/`);
      setGrievances(prev => prev.filter(g => g.grievance_id !== grievanceId));
      toast.success('Unfollowed');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FaBookmark className="text-2xl text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Saved Complaints</h1>
            <p className="text-gray-500 text-sm">Complaints you're following for updates</p>
          </div>
        </div>

        {grievances.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FaBookmark className="text-5xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No saved complaints</h2>
            <p className="text-gray-400 text-sm mb-6">Follow complaints to get notified of updates</p>
            <Link to="/dashboard" className="bg-orange-600 text-white px-6 py-2.5 rounded-lg hover:bg-orange-700 transition text-sm">Browse Complaints</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {grievances.map(g => {
              const Icon = CAT_ICONS[g.category] || FaShieldAlt;
              return (
                <div key={g.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="text-xl text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/track/${g.grievance_id}`} className="font-semibold text-gray-800 hover:text-orange-600 transition truncate block">{g.title}</Link>
                    <p className="text-xs text-gray-400 mt-0.5">{g.grievance_id} · {formatDistanceToNow(new Date(g.submitted_at), { addSuffix: true })}</p>
                    {g.address && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {g.address}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[g.status]}`}>{g.status.replace(/_/g, ' ')}</span>
                    <button onClick={() => unfollow(g.grievance_id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded border border-gray-200 hover:border-red-300">
                      Unfollow
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
