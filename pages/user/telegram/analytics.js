import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function TelegramAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMessages: 0, toxicMessages: 0, nonToxic: 0, toxicRate: 0, dailyTrend: [], botStats: [] });

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const [trendRes, botRes, msgsRes] = await Promise.all([
        api.get('/api/user/message-trend/telegram'),
        api.get('/api/user/bot-stats/telegram'),
        api.get('/api/user/messages/telegram?limit=500')
      ]);
      const messages = msgsRes.data;
      setStats({
        totalMessages: messages.length,
        toxicMessages: messages.filter(m => m.is_toxic).length,
        nonToxic: messages.filter(m => !m.is_toxic).length,
        toxicRate: messages.length ? ((messages.filter(m => m.is_toxic).length / messages.length) * 100).toFixed(1) : 0,
        dailyTrend: trendRes.data,
        botStats: botRes.data
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const trendChart = {
    labels: stats.dailyTrend.labels || [],
    datasets: [{ label: 'Messages', data: stats.dailyTrend.counts || [], borderColor: '#0088cc', backgroundColor: 'rgba(0,136,204,0.1)', tension: 0.4, fill: true }]
  };

  const pieChart = {
    labels: ['Toxic', 'Clean'],
    datasets: [{ data: [stats.toxicMessages, stats.nonToxic], backgroundColor: ['#EF4444', '#10B981'], borderWidth: 0 }]
  };

  const botBar = stats.botStats.length > 0 ? {
    labels: stats.botStats.map(b => b.username),
    datasets: [
      { label: 'Total', data: stats.botStats.map(b => b.message_count), backgroundColor: 'rgba(0,136,204,0.7)', borderRadius: 6 },
      { label: 'Toxic', data: stats.botStats.map(b => b.toxic_count), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 },
    ]
  } : null;

  if (loading) return <ProtectedRoute><Layout title="Telegram Analytics"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div></Layout></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <Layout title="Telegram Analytics">
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold">💬 Telegram Analytics</h1><p className="text-gray-600 mt-1">Detailed statistics for your Telegram moderation</p></div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Messages', value: stats.totalMessages, color: 'border-blue-500' },
              { label: 'Toxic', value: stats.toxicMessages, color: 'border-red-500', text: 'text-red-600' },
              { label: 'Toxicity Rate', value: `${stats.toxicRate}%`, color: 'border-green-500', text: 'text-green-600' },
              { label: 'Bots', value: stats.botStats.length, color: 'border-purple-500', text: 'text-purple-600' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${s.color}`}>
                <p className="text-gray-500 text-xs uppercase">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.text || ''}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-bold mb-4">📈 7-Day Trend</h2><Line data={trendChart} options={{ responsive: true }} /></div>
            <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-bold mb-4">🥧 Toxicity Distribution</h2><Pie data={pieChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
              <div className="flex justify-center gap-4 mt-4"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span>Toxic: {stats.toxicMessages}</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span>Clean: {stats.nonToxic}</span></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-bold mb-4">📊 Bot Performance</h2>{botBar ? <Bar data={botBar} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} /> : <p className="text-gray-400 text-center py-8">No data</p>}</div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">🤖 Bot Details</h2>
              {stats.botStats.length === 0 ? <p className="text-gray-400 text-center py-8">No bots</p> : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {stats.botStats.map((b, i) => (
                    <div key={b.bot_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div><span className="text-gray-400 font-bold mr-2">#{i+1}</span><span className="font-medium">{b.username}</span></div>
                      <div className="text-right"><p className="text-sm font-semibold">{b.message_count} msgs</p><p className="text-xs text-red-500">{b.toxic_count} toxic ({b.toxic_rate.toFixed(1)}%)</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
            <h3 className="font-semibold text-lg">💡 Insights</h3>
            <p className="text-gray-700 mt-2">
              {stats.toxicRate > 10 ? `Your Telegram toxicity rate is ${stats.toxicRate}%. Consider stricter filters.` : `Great! Low toxicity rate of ${stats.toxicRate}%. Keep it up!`}
            </p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}