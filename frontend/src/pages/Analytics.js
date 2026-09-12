import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { PageSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') { setLoading(false); return; }
    axios.get('/api/grievances/dashboard_stats/')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== 'admin') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><h2 className="text-2xl font-bold text-red-600">Access Denied</h2><p className="text-gray-500 mt-2">Admin access required</p></div>
    </div>
  );

  if (loading) return <PageSpinner />;
  if (!stats) return null;

  const catData = {
    labels: stats.by_category?.map(c => c.category.replace(/_/g, ' ')) || [],
    datasets: [{ label: 'Complaints', data: stats.by_category?.map(c => c.count) || [], backgroundColor: COLORS }],
  };

  const statusData = {
    labels: stats.by_status?.map(s => s.status.replace(/_/g, ' ')) || [],
    datasets: [{ data: stats.by_status?.map(s => s.count) || [], backgroundColor: COLORS }],
  };

  const deptData = {
    labels: stats.by_department?.map(d => d.department.replace(/_/g, ' ')) || [],
    datasets: [{ label: 'Complaints', data: stats.by_department?.map(d => d.count) || [], backgroundColor: COLORS }],
  };

  const priorityData = {
    labels: stats.by_priority?.map(p => p.priority) || [],
    datasets: [{ data: stats.by_priority?.map(p => p.count) || [], backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'] }],
  };

  const opts = { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Civic grievance performance metrics</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Complaints', value: stats.total || 0, color: 'text-orange-600' },
            { label: 'Resolved', value: stats.resolved || 0, color: 'text-green-600' },
            { label: 'Resolution Rate', value: stats.total ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '0%', color: 'text-blue-600' },
            { label: 'Avg Resolution', value: stats.avg_resolution_days ? `${stats.avg_resolution_days}d` : 'N/A', color: 'text-purple-600' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-500 text-sm mb-2">{k.label}</p>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Complaints by Category</h2>
            <Bar data={catData} options={opts} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Status Distribution</h2>
            <Doughnut data={statusData} options={{ ...opts, plugins: { legend: { position: 'right' } } }} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Complaints by Department</h2>
            <Bar data={deptData} options={opts} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Priority Breakdown</h2>
            <Doughnut data={priorityData} options={{ ...opts, plugins: { legend: { position: 'right' } } }} />
          </div>
        </div>

        {/* Recent table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-800">Recent Complaints</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['ID', 'Title', 'Category', 'Priority', 'Status', 'Citizen'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recent?.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-orange-700">{g.grievance_id}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{g.title}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize text-xs">{g.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">{g.priority}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{g.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-gray-500">{g.citizen_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
