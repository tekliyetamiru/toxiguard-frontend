import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/admin/stats');
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <ProtectedRoute adminOnly>
      <Layout title="Admin Dashboard">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    </ProtectedRoute>
  );

  if (!stats) return (
    <ProtectedRoute adminOnly>
      <Layout title="Admin Dashboard"><div className="text-center py-20 text-red-500">Failed to load data</div></Layout>
    </ProtectedRoute>
  );

  const chartData = {
    labels: stats.daily_counts.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Messages', data: stats.daily_counts.map(d => d.count),
      borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4, fill: true, pointBackgroundColor: '#8B5CF6',
      pointBorderColor: '#fff', pointHoverRadius: 6,
    }],
  };

  const toxicRate = stats.total_messages ? ((stats.toxic_messages / stats.total_messages) * 100).toFixed(1) : 0;

  return (
    <ProtectedRoute adminOnly>
      <Layout title="Admin Dashboard">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">⚡ Admin Dashboard</h1>
                <p className="text-purple-100 mt-1">System overview and moderation statistics</p>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} className="bg-white/20 backdrop-blur-md rounded-xl px-5 py-3">
                <p className="text-sm text-purple-100">Welcome back</p>
                <p className="text-xl font-bold">{user?.username}</p>
              </motion.div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Users', value: stats.total_users, icon: '👥', color: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-600' },
              { label: 'Total Bots', value: stats.total_bots, icon: '🤖', color: 'border-green-500', bg: 'bg-green-100', text: 'text-green-600' },
              { label: 'Total Messages', value: stats.total_messages.toLocaleString(), icon: '📊', color: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' },
              { label: 'Toxic Messages', value: stats.toxic_messages.toLocaleString(), icon: '⚠️', color: 'border-red-500', bg: 'bg-red-100', text: 'text-red-600' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${s.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs uppercase font-medium">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} text-2xl`}>{s.icon}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Toxicity Rate', value: `${toxicRate}%`, color: 'text-red-600' },
              { label: 'Avg/User', value: stats.total_users ? Math.round(stats.total_messages / stats.total_users) : 0, color: 'text-blue-600' },
              { label: 'Avg/Bot', value: stats.total_bots ? Math.round(stats.total_messages / stats.total_bots) : 0, color: 'text-green-600' },
              { label: 'Active Today', value: stats.daily_counts[6]?.count || 0, color: 'text-purple-600' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">📈 Messages per Day (Last 7 Days)</h2>
              <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🕒 Recent Messages</h2>
              <div className="overflow-auto max-h-80">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Time</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">User ID</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Message</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recent_messages.map(msg => (
                      <tr key={msg.id} className={msg.is_toxic ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="text-sm py-2 px-2 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</td>
                        <td className="text-sm py-2 px-2">{msg.user_id}</td>
                        <td className="text-sm py-2 px-2 truncate max-w-xs">{msg.text}</td>
                        <td className="text-sm py-2 px-2">
                          {msg.is_toxic ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">⚠️ Toxic</span> : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ Clean</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}