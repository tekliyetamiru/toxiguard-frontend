import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function TelegramDashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [botStats, setBotStats] = useState([]);
  const [trendData, setTrendData] = useState({ labels: [], counts: [] });
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.get('/api/user/messages/telegram?limit=20'),
        api.get('/api/user/bot-stats/telegram'),
        api.get('/api/user/message-trend/telegram'),
        api.get('/api/user/credits')
      ]);

      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Request ${i} failed:`, r.reason);
      });

      setMessages(results[0].status === 'fulfilled' ? results[0].value.data : []);
      setBotStats(results[1].status === 'fulfilled' ? results[1].value.data : []);
      setTrendData(results[2].status === 'fulfilled' ? results[2].value.data : { labels: [], counts: [] });
      setCredits(results[3].status === 'fulfilled' ? results[3].value.data.credits : 0);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalMessages = botStats.reduce((s, b) => s + b.message_count, 0);
  const totalToxic = botStats.reduce((s, b) => s + b.toxic_count, 0);
  const toxicRate = totalMessages ? ((totalToxic / totalMessages) * 100).toFixed(1) : 0;

  // Trend chart
  const trendChartData = {
    labels: trendData.labels || [],
    datasets: [{
      label: 'Messages', data: trendData.counts || [],
      borderColor: '#0088cc', backgroundColor: 'rgba(0, 136, 204, 0.1)',
      tension: 0.4, fill: true, pointBackgroundColor: '#0088cc',
    }],
  };

  // Bot distribution pie
  const botPieData = botStats.length > 0 ? {
    labels: botStats.map(b => b.username),
    datasets: [{
      data: botStats.map(b => b.message_count),
      backgroundColor: ['#0088cc', '#34A853', '#FBBC05', '#EA4335', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4'],
      borderWidth: 2, borderColor: '#fff',
    }]
  } : null;

  // Toxicity by bot bar
  const botBarData = botStats.length > 0 ? {
    labels: botStats.map(b => b.username),
    datasets: [
      { label: 'Total', data: botStats.map(b => b.message_count), backgroundColor: 'rgba(0, 136, 204, 0.7)', borderRadius: 8 },
      { label: 'Toxic', data: botStats.map(b => b.toxic_count), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 8 },
    ],
  } : null;

  if (loading) return (
    <ProtectedRoute><Layout title="Telegram Dashboard">
      <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
    </Layout></ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <Layout title="Telegram Dashboard">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">💬 Telegram Dashboard</h1>
                <p className="text-blue-100 mt-1">Monitor your Telegram bots and groups</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={fetchData} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition">🔄</button>
                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/20 backdrop-blur-md rounded-xl px-5 py-3">
                  <p className="text-sm text-blue-100">Credits</p>
                  <p className="text-3xl font-bold">{credits.toLocaleString()}</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700">{error} <button onClick={fetchData} className="underline ml-2">Retry</button></div>}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Messages', value: totalMessages.toLocaleString(), icon: '📊', color: 'border-blue-500', bg: 'bg-blue-100' },
              { label: 'Toxic Messages', value: totalToxic.toLocaleString(), icon: '⚠️', color: 'border-red-500', bg: 'bg-red-100', textColor: 'text-red-600' },
              { label: 'Toxicity Rate', value: `${toxicRate}%`, icon: '📈', color: 'border-green-500', bg: 'bg-green-100', textColor: 'text-green-600' },
              { label: 'Active Bots', value: botStats.filter(b => b.message_count > 0).length, icon: '🤖', color: 'border-purple-500', bg: 'bg-purple-100', textColor: 'text-purple-600' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${s.color}`}>
                <div className="flex items-center justify-between">
                  <div><p className="text-gray-500 text-xs uppercase font-medium">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.textColor || ''}`}>{s.value}</p></div>
                  <div className={`p-3 rounded-xl ${s.bg} text-2xl`}>{s.icon}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">📈 7-Day Message Trend</h2>
              <Line data={trendChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🥧 Messages by Bot</h2>
              {botPieData ? <Pie data={botPieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /> :
                <div className="h-64 flex items-center justify-center text-gray-400">No bot data yet</div>}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">📊 Toxicity by Bot</h2>
              {botBarData ? <Bar data={botBarData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} /> :
                <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}
            </div>
            {/* Recent Messages */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🕒 Recent Messages</h2>
              <div className="overflow-auto max-h-80">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr><th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Time</th><th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Message</th><th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {messages.slice(0, 8).map(m => (
                      <tr key={m.id} className={m.is_toxic ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="text-sm py-2 px-2 whitespace-nowrap">{new Date(m.timestamp).toLocaleTimeString()}</td>
                        <td className="text-sm truncate max-w-xs px-2">{m.text.slice(0, 40)}</td>
                        <td className="text-sm px-2">{m.is_toxic ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">⚠️</span> : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✅</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => window.location.href = '/api/user/export-logs/telegram'} className="mt-4 w-full bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl font-medium hover:bg-blue-200 transition">📥 Export CSV</button>
            </div>
          </div>

          {/* Bot Cards */}
          {botStats.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">🤖 Bot Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {botStats.map((bot, i) => (
                  <motion.div key={bot.bot_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <div className="flex justify-between"><h3 className="font-bold">{bot.username}</h3><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bot.toxic_rate > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{bot.toxic_rate.toFixed(1)}%</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="bg-gray-50 p-2 rounded-lg"><p className="font-bold">{bot.message_count}</p><p className="text-xs text-gray-500">Total</p></div><div className="bg-gray-50 p-2 rounded-lg"><p className="font-bold text-red-600">{bot.toxic_count}</p><p className="text-xs text-gray-500">Toxic</p></div></div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}