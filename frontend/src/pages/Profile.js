import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaShieldAlt, FaCalendarAlt } from 'react-icons/fa';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const roleColors = { citizen: 'bg-orange-100 text-orange-700', officer: 'bg-blue-100 text-blue-700', admin: 'bg-purple-100 text-purple-700' };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-orange-100 mt-1">Manage your account information</p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-5 mb-8 pb-6 border-b">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                <FaUser className="text-3xl text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{user.first_name} {user.last_name}</h2>
                <p className="text-gray-500 text-sm">@{user.username}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize ${roleColors[user.role]}`}>{user.role}</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: FaUser, label: 'Username', value: user.username },
                { icon: FaEnvelope, label: 'Email', value: user.email },
                { icon: FaPhone, label: 'Phone', value: user.phone_number || 'Not provided' },
                { icon: FaBuilding, label: 'Department', value: user.department ? user.department.replace(/_/g, ' ') : 'N/A' },
                { icon: FaShieldAlt, label: 'Role', value: user.role },
                { icon: FaCalendarAlt, label: 'Member Since', value: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="text-orange-500 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-28">{label}:</span>
                  <span className="text-gray-800 text-sm font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>

            {user.role === 'officer' && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${user.is_verified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {user.is_verified ? '✓ Account verified — full access granted' : '⏳ Account pending admin verification'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
