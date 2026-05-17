import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/api/admin/analytics');
        setAnalytics(res.data);
      } catch (err) {
        setError('Failed to load analytics');
        console.error(err);
      } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <ProtectedRoute adminOnly>
      <Layout title="Analytics"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></Layout>
    </ProtectedRoute>
  );

  if (error || !analytics) return (
    <ProtectedRoute adminOnly>
      <Layout title="Analytics"><div className="text-center py-20 text-red-500">{error || 'Error loading data'}</div></Layout>
    </ProtectedRoute>
  );

  const dailyLabels = analytics.daily_trend.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const totalData = analytics.daily_trend.map(d => d.total);
  const toxicData = analytics.daily_trend.map(d => d.toxic);

  const lineData = {
    labels: dailyLabels,
    datasets: [
      { label: 'Total Messages', data: totalData, borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, fill: true },
      { label: 'Toxic Messages', data: toxicData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true },
    ],
  };

  const topUsersLabels = analytics.top_toxic_users.map(u => u.username);
  const topUsersToxic = analytics.top_toxic_users.map(u => u.toxic_messages);
  const topUsersTotal = analytics.top_toxic_users.map(u => u.total_messages);

  const barData = topUsersLabels.length > 0 ? {
    labels: topUsersLabels,
    datasets: [
      { label: 'Total Messages', data: topUsersTotal, backgroundColor: 'rgba(139,92,246,0.6)', borderRadius: 8 },
      { label: 'Toxic Messages', data: topUsersToxic, backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 8 },
    ],
  } : null;

  const toxicRate = analytics.total_messages ? ((analytics.toxic_messages / analytics.total_messages) * 100).toFixed(1) : 0;

  return (
    <ProtectedRoute adminOnly>
      <Layout title="Analytics">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl shadow-xl p-6 text-white">
            <h1 className="text-2xl font-bold">📊 Moderation Analytics</h1>
            <p className="text-purple-100 mt-1">Comprehensive system-wide statistics (Last 30 Days)</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Messages', value: analytics.total_messages.toLocaleString(), color: 'border-blue-500', text: 'text-blue-600' },
              { label: 'Toxic Messages', value: analytics.toxic_messages.toLocaleString(), color: 'border-red-500', text: 'text-red-600' },
              { label: 'Non-Toxic', value: analytics.non_toxic.toLocaleString(), color: 'border-green-500', text: 'text-green-600' },
              { label: 'Toxicity Rate', value: `${toxicRate}%`, color: 'border-purple-500', text: 'text-purple-600' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${s.color}`}>
                <p className="text-gray-500 text-xs uppercase font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-bold mb-4">📈 Daily Message Trend (Last 30 Days)</h2>
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>

          {/* Top Toxic Users */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🚨 Top Toxic Users</h2>
              {barData ? (
                <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No toxic messages yet</div>
              )}
            </div>

            {/* User Rankings */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🏆 User Rankings</h2>
              {analytics.top_toxic_users.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {analytics.top_toxic_users.map((u, i) => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                        <div>
                          <p className="font-semibold">{u.username}</p>
                          <p className="text-xs text-gray-500">{u.total_messages} total messages</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">{u.toxic_messages} toxic</p>
                        <p className="text-xs text-gray-500">{u.toxic_rate.toFixed(1)}% rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
            <h3 className="font-semibold text-lg">💡 Insights</h3>
            <p className="text-gray-700 mt-2">
              {toxicRate > 15
                ? `⚠️ High toxicity rate of ${toxicRate}%. Review the top toxic users and consider stricter moderation policies.`
                : toxicRate > 5
                ? `Moderate toxicity rate of ${toxicRate}%. Monitor top users closely.`
                : `✅ Low toxicity rate of ${toxicRate}%. The system is working well!`}
            </p>
            {analytics.top_toxic_users.length > 0 && (
              <p className="text-gray-600 mt-1">
                Most toxic user: <strong>{analytics.top_toxic_users[0].username}</strong> with {analytics.top_toxic_users[0].toxic_messages} toxic messages.
              </p>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}