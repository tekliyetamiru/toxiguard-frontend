// frontend/pages/user/social-media/dashboard.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SocialMediaDashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);        // FIXED: Separate trend state
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching dashboard data...');

      const results = await Promise.allSettled([
        api.get('/api/user/social-media/dashboard'),
        api.get('/api/user/messages/social-media?limit=20'),
        api.get('/api/user/social-media/toxic-categories'),
        api.get('/api/user/social-media/languages'),
        api.get('/api/user/social-media/peak-hours'),
        api.get('/api/user/credits')
      ]);

      // Log all results for debugging
      results.forEach((result, index) => {
        const names = ['dashboard', 'messages', 'categories', 'languages', 'peak-hours', 'credits'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${names[index]}:`, result.value.data);
        } else {
          console.error(`❌ ${names[index]} failed:`, result.reason?.response?.data || result.reason);
        }
      });

      // Extract data with proper fallbacks
      const statsRes = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const msgsRes = results[1].status === 'fulfilled' ? results[1].value.data : [];
      const categoriesRes = results[2].status === 'fulfilled' ? results[2].value.data : null;
      const languagesRes = results[3].status === 'fulfilled' ? results[3].value.data : null;
      const peakRes = results[4].status === 'fulfilled' ? results[4].value.data : null;
      const creditsRes = results[5].status === 'fulfilled' ? results[5].value.data : null;

      // FIXED: Properly extract stats and trend from the response
      // Backend returns: { success: true, stats: {...}, trend: {...} }
      if (statsRes) {
        console.log('📊 Stats response structure:', Object.keys(statsRes));
        // stats is inside statsRes.stats, trend is inside statsRes.trend
        setStats(statsRes.stats || statsRes);
        setTrend(statsRes.trend || null);
      }
      
      setMessages(Array.isArray(msgsRes) ? msgsRes : []);
      setCategories(categoriesRes?.categories || []);
      setLanguages(languagesRes?.languages || []);
      setPeakHours(peakRes?.peak_hours || []);
      setCredits(creditsRes?.credits || 0);

    } catch (err) {
      console.error('❌ Error fetching dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==================== Render States ====================

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout title="Social Media Dashboard">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout title="Social Media Dashboard">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold">❌ Error Loading Dashboard</p>
            <p className="text-red-600 mt-2">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🔄 Retry
            </button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // ==================== Extract Values (with fallbacks) ====================
  
  const totalMessages = stats?.all_time?.total_messages ?? 0;
  const totalToxic = stats?.all_time?.toxic_messages ?? 0;
  const toxicRate = stats?.all_time?.toxic_rate ?? 0;
  const todayMessages = stats?.today?.total_messages ?? 0;
  const todayToxic = stats?.today?.toxic_messages ?? 0;
  const todayRate = stats?.today?.toxic_rate ?? 0;

  // FIXED: Use separate 'trend' state for trend data
  const last7Days = trend?.last_7_days || [];

  // ==================== Chart Data ====================

  const trendChartData = {
    labels: last7Days.map(d =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Total Messages',
        data: last7Days.map(d => d.total),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Toxic Messages',
        data: last7Days.map(d => d.toxic),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ],
  };

  const categoryPieData = categories.length > 0 ? {
    labels: categories.map(c => c.name || 'Unknown'),
    datasets: [{
      data: categories.map(c => c.count),
      backgroundColor: [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4'
      ],
    }]
  } : null;

  const peakHoursBarData = peakHours.length > 0 ? {
    labels: peakHours.map(h => h.hour),
    datasets: [{
      label: 'Messages per Hour',
      data: peakHours.map(h => h.messages),
      backgroundColor: 'rgba(139, 92, 246, 0.7)',
      borderColor: '#8B5CF6',
      borderWidth: 1,
    }]
  } : null;

  // ==================== Render Component ====================

  return (
    <ProtectedRoute>
      <Layout title="Social Media Dashboard">
        <div className="space-y-6">
          {/* Header with Credits */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex justify-between items-start md:items-center flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold">📱 Social Media Dashboard</h1>
                <p className="text-purple-100 mt-1">Monitor and analyze your moderated content</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchData}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg transition"
                  title="Refresh data"
                >
                  🔄 Refresh
                </button>
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg px-6 py-3 text-right"
                >
                  <p className="text-sm text-purple-100">Available Credits</p>
                  <p className="text-4xl font-bold">{credits}</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* All-Time Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm uppercase tracking-wide">Total Messages</p>
                  <p className="text-4xl font-bold mt-2">{totalMessages}</p>
                </div>
                <span className="text-4xl">📊</span>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm uppercase tracking-wide">Toxic Messages</p>
                  <p className="text-4xl font-bold text-red-600 mt-2">{totalToxic}</p>
                </div>
                <span className="text-4xl">⚠️</span>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm uppercase tracking-wide">Toxicity Rate</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">{toxicRate.toFixed(1)}%</p>
                </div>
                <span className="text-4xl">📈</span>
              </div>
            </motion.div>
          </div>

          {/* Row 1: Trend Chart & Recent Messages */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">📈 7-Day Message Trend</h2>
              {last7Days.length > 0 ? (
                <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }} height={300} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>No trend data available yet</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">🕒 Recent Messages (Last 20)</h2>
              {messages.length > 0 ? (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="sticky top-0 bg-gray-50 border-b">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 py-2 px-2">Time</th>
                        <th className="text-left text-xs font-medium text-gray-500 py-2 px-2">Message</th>
                        <th className="text-left text-xs font-medium text-gray-500 py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {messages.map(msg => (
                        <tr key={msg.id} className={msg.is_toxic ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="text-xs py-2 px-2 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</td>
                          <td className="text-xs py-2 px-2 truncate max-w-xs" title={msg.text}>{msg.text.slice(0, 40)}...</td>
                          <td className="text-xs py-2 px-2">
                            {msg.is_toxic ? (
                              <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">⚠️ Toxic</span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">✅ Clean</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500"><p>No messages yet</p></div>
              )}
              <button onClick={() => window.location.href = '/api/user/export-logs/social-media'} className="mt-4 w-full bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition">
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* Row 2: Categories & Peak Hours */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">🎯 Toxic Categories Distribution</h2>
              {categoryPieData ? (
                <Pie data={categoryPieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }} height={300} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500"><p>No toxic categories detected yet</p></div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">⏰ Peak Activity Hours</h2>
              {peakHoursBarData ? (
                <Bar data={peakHoursBarData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }} height={300} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500"><p>No activity data yet</p></div>
              )}
            </div>
          </div>

          {/* Languages Breakdown */}
          {languages.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">🌍 Languages Detected</h2>
              <div className="grid gap-3">
                {languages.map((lang, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 uppercase">{lang.language}</h3>
                      <p className="text-sm text-gray-500">{lang.total} total • {lang.toxic} toxic</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{lang.rate}%</p>
                      <p className="text-xs text-gray-500">toxicity</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Stats */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md p-6 text-white">
            <h2 className="text-2xl font-bold mb-6">📅 Today's Activity</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: todayMessages, label: 'Messages' },
                { value: todayToxic, label: 'Toxic' },
                { value: `${todayRate.toFixed(1)}%`, label: 'Rate' },
              ].map((item, i) => (
                <motion.div key={i} whileHover={{ scale: 1.05 }} className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg p-4 text-center">
                  <p className="text-4xl font-bold">{item.value}</p>
                  <p className="text-sm mt-2 text-blue-50">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}