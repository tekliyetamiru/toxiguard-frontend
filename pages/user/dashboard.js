// frontend/pages/user/dashboard.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';
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
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

export default function UserDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Platform-specific data
  const [telegramStats, setTelegramStats] = useState({ messages: 0, toxic: 0, rate: 0 });
  const [discordStats, setDiscordStats] = useState({ messages: 0, toxic: 0, rate: 0 });
  const [socialStats, setSocialStats] = useState({ messages: 0, toxic: 0, rate: 0 });

  // Combined trend data (last 7 days, all platforms)
  const [combinedTrend, setCombinedTrend] = useState({ labels: [], counts: [] });

  // Bot stats
  const [botStats, setBotStats] = useState([]);

  // Recent messages
  const [recentMessages, setRecentMessages] = useState([]);

  // Platform trend breakdowns
  const [platformTrends, setPlatformTrends] = useState({
    telegram: { labels: [], counts: [] },
    discord: { labels: [], counts: [] },
    social: { labels: [], counts: [] },
  });

  const packages = [
    { amount: 100, credits: 1000, label: '100 ETB → 1,000 Credits', popular: false },
    { amount: 1000, credits: 11000, label: '1,000 ETB → 11,000 Credits', popular: true },
    { amount: 10000, credits: 120000, label: '10,000 ETB → 120,000 Credits', popular: false },
  ];

  const fetchData = async () => {
    try {
      const [
        creditsRes, annRes, msgsRes, botRes, trendRes,
        telegramTrendRes, discordTrendRes, socialTrendRes,
        telegramMsgsRes, discordMsgsRes, socialMsgsRes,
        telegramStatsRes, discordStatsRes, socialDashboardRes
      ] = await Promise.all([
        api.get('/api/user/credits'),
        api.get('/api/announcements'),
        api.get('/api/user/messages?limit=20'),
        api.get('/api/user/bot-stats'),
        api.get('/api/user/message-trend'),
        api.get('/api/user/message-trend/telegram'),
        api.get('/api/user/message-trend/discord'),
        api.get('/api/user/message-trend/social-media'),
        api.get('/api/user/messages/telegram?limit=1'),
        api.get('/api/user/messages/discord?limit=1'),
        api.get('/api/user/messages/social-media?limit=1'),
        api.get('/api/user/bot-stats/telegram').catch(() => ({ data: [] })),
        api.get('/api/user/bot-stats/discord').catch(() => ({ data: [] })),
        api.get('/api/user/social-media/dashboard').catch(() => ({ data: { stats: { all_time: { total_messages: 0, toxic_messages: 0, toxic_rate: 0 } } } })),
      ]);

      setCredits(creditsRes.data.credits);
      setAnnouncements(annRes.data.announcements || []);
      setRecentMessages(msgsRes.data || []);
      setBotStats(botRes.data || []);
      setCombinedTrend(trendRes.data);

      setPlatformTrends({
        telegram: telegramTrendRes.data,
        discord: discordTrendRes.data,
        social: socialTrendRes.data,
      });

      // Calculate platform stats
      const tgBots = telegramStatsRes.data || [];
      const dcBots = discordStatsRes.data || [];
      const socialData = socialDashboardRes.data?.stats || socialDashboardRes.data || {};

      const tgTotal = tgBots.reduce((s, b) => s + (b.message_count || 0), 0);
      const tgToxic = tgBots.reduce((s, b) => s + (b.toxic_count || 0), 0);
      const dcTotal = dcBots.reduce((s, b) => s + (b.message_count || 0), 0);
      const dcToxic = dcBots.reduce((s, b) => s + (b.toxic_count || 0), 0);
      const smTotal = socialData.all_time?.total_messages || socialData.total_messages || 0;
      const smToxic = socialData.all_time?.toxic_messages || socialData.toxic_messages || 0;

      setTelegramStats({
        messages: tgTotal,
        toxic: tgToxic,
        rate: tgTotal ? ((tgToxic / tgTotal) * 100).toFixed(1) : 0,
      });
      setDiscordStats({
        messages: dcTotal,
        toxic: dcToxic,
        rate: dcTotal ? ((dcToxic / dcTotal) * 100).toFixed(1) : 0,
      });
      setSocialStats({
        messages: smTotal,
        toxic: smToxic,
        rate: smTotal ? ((smToxic / smTotal) * 100).toFixed(1) : 0,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (amount) => {
    if (!phoneNumber) return alert('Please enter your phone number');
    if (!/^(09|07)\d{8}$/.test(phoneNumber)) return alert('Phone number must be 10 digits and start with 09 or 07');
    try {
      const response = await api.post('/api/user/create-payment', { amount, phone_number: phoneNumber });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert(error.response?.data?.error || 'Payment service unavailable.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Totals across all platforms
  const totalMessages = telegramStats.messages + discordStats.messages + socialStats.messages;
  const totalToxic = telegramStats.toxic + discordStats.toxic + socialStats.toxic;
  const totalRate = totalMessages ? ((totalToxic / totalMessages) * 100).toFixed(1) : 0;

  // Combined trend chart
  const combinedChartData = {
    labels: combinedTrend.labels || [],
    datasets: [{
      label: 'All Messages',
      data: combinedTrend.counts || [],
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#8B5CF6',
      pointBorderColor: '#fff',
      pointHoverRadius: 6,
    }],
  };

  // Platform distribution pie chart
  const platformPieData = {
    labels: ['Telegram', 'Discord', 'Social Media'],
    datasets: [{
      data: [telegramStats.messages, discordStats.messages, socialStats.messages],
      backgroundColor: ['#3B82F6', '#5865F2', '#EC4899'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // Toxicity by platform bar chart
  const platformBarData = {
    labels: ['Telegram', 'Discord', 'Social Media'],
    datasets: [
      {
        label: 'Total Messages',
        data: [telegramStats.messages, discordStats.messages, socialStats.messages],
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderRadius: 8,
      },
      {
        label: 'Toxic Messages',
        data: [telegramStats.toxic, discordStats.toxic, socialStats.toxic],
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderRadius: 8,
      },
    ],
  };

  if (loading) return (
    <ProtectedRoute>
      <Layout title="Dashboard">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <Layout title="Dashboard">
        <div className="space-y-6">
          {/* ============ HEADER ============ */}
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}! 👋</h1>
                <p className="text-purple-100 mt-1">Overview of all your moderation activity across platforms.</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/20 backdrop-blur-md rounded-xl px-5 py-3 text-center">
                  <p className="text-sm text-purple-100">Available Credits</p>
                  <p className="text-3xl font-bold">{credits.toLocaleString()}</p>
                </motion.div>
                <button onClick={() => setShowPaymentModal(true)} className="bg-white text-purple-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow-lg">
                  💰 Buy More
                </button>
              </div>
            </div>
          </div>

          {/* ============ PAYMENT MODAL ============ */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h2 className="text-2xl font-bold mb-2">Purchase Credits</h2>
                <p className="text-gray-500 text-sm mb-4">Select a package to continue</p>
                <div className="space-y-3 mb-4">
                  {packages.map((pkg) => (
                    <label key={pkg.amount} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${selectedAmount === pkg.amount ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'} ${pkg.popular ? 'relative' : ''}`}>
                      {pkg.popular && <span className="absolute -top-3 right-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold">Most Popular</span>}
                      <input type="radio" name="package" value={pkg.amount} checked={selectedAmount === pkg.amount} onChange={() => setSelectedAmount(pkg.amount)} className="mr-3 accent-purple-600" />
                      <span className="font-semibold">{pkg.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">Phone Number</label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="09XXXXXXXX" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => selectedAmount && handlePurchase(selectedAmount)} disabled={!selectedAmount} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition">💳 Pay Now</button>
                  <button onClick={() => { setShowPaymentModal(false); setSelectedAmount(null); setPhoneNumber(''); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ============ ANNOUNCEMENTS ============ */}
          {announcements.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl shadow-sm">
              <p className="font-semibold text-amber-800">📢 Announcement</p>
              {announcements.map((ann, idx) => <p key={idx} className="text-amber-700">{ann.message}</p>)}
            </div>
          )}

          {/* ============ OVERALL STATS CARDS ============ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Messages', value: totalMessages.toLocaleString(), icon: '📊', color: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-600' },
              { label: 'Toxic Messages', value: totalToxic.toLocaleString(), icon: '⚠️', color: 'border-red-500', bg: 'bg-red-100', text: 'text-red-600' },
              { label: 'Toxicity Rate', value: `${totalRate}%`, icon: '📈', color: 'border-green-500', bg: 'bg-green-100', text: 'text-green-600' },
              { label: 'Active Bots', value: botStats.filter(b => b.message_count > 0).length, icon: '🤖', color: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' },
            ].map((stat, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${stat.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.text} text-2xl`}>{stat.icon}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ============ PLATFORM BREAKDOWN CARDS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Telegram', icon: '💬', stats: telegramStats, color: 'from-blue-500 to-blue-600', light: 'bg-blue-50' },
              { name: 'Discord', icon: '🎮', stats: discordStats, color: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50' },
              { name: 'Social Media', icon: '📱', stats: socialStats, color: 'from-pink-500 to-pink-600', light: 'bg-pink-50' },
            ].map((platform, i) => (
              <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100`}>
                <div className={`bg-gradient-to-r ${platform.color} px-5 py-3 text-white`}>
                  <h3 className="font-bold text-lg">{platform.icon} {platform.name}</h3>
                </div>
                <div className="p-5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{platform.stats.messages.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Messages</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{platform.stats.toxic.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Toxic</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{platform.stats.rate}%</p>
                    <p className="text-xs text-gray-500">Rate</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ============ CHARTS ROW 1 ============ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Combined Trend */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">📈 7-Day Message Trend (All Platforms)</h2>
                <button onClick={fetchData} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition">🔄</button>
              </div>
              <Line data={combinedChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>

            {/* Platform Distribution Pie */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🥧 Messages by Platform</h2>
              {totalMessages > 0 ? (
                <Pie data={platformPieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No messages yet</div>
              )}
            </div>
          </div>

          {/* ============ CHARTS ROW 2 ============ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Toxicity by Platform Bar */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">📊 Toxicity by Platform</h2>
              <Bar data={platformBarData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
            </div>

            {/* Recent Messages */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">🕒 Recent Messages</h2>
              <div className="overflow-auto max-h-80">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Time</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Message</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentMessages.slice(0, 8).map(msg => (
                      <tr key={msg.id} className={msg.is_toxic ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="text-sm py-2 px-2 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</td>
                        <td className="text-sm truncate max-w-xs px-2">{msg.text.slice(0, 40)}</td>
                        <td className="text-sm px-2">
                          {msg.is_toxic ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">⚠️ Toxic</span> : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ Clean</span>}
                        </td>
                      </tr>
                    ))}
                    {recentMessages.length === 0 && (
                      <tr><td colSpan="3" className="text-center py-8 text-gray-400">No messages yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button onClick={() => window.location.href = '/api/user/export-logs'} className="mt-4 w-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-4 py-2.5 rounded-xl font-medium hover:from-purple-200 hover:to-indigo-200 transition">
                📥 Export All Logs (CSV)
              </button>
            </div>
          </div>

          {/* ============ BOT PERFORMANCE ============ */}
          {botStats.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">🤖 Bot Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {botStats.map((bot, idx) => (
                  <motion.div key={bot.bot_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{bot.username}</h3>
                        <p className="text-xs text-gray-500">ID: {bot.bot_id}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bot.toxic_rate > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{bot.toxic_rate.toFixed(1)}%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="bg-gray-50 p-2 rounded-lg"><p className="font-bold">{bot.message_count}</p><p className="text-xs text-gray-500">Total</p></div>
                      <div className="bg-gray-50 p-2 rounded-lg"><p className="font-bold text-red-600">{bot.toxic_count}</p><p className="text-xs text-gray-500">Toxic</p></div>
                    </div>
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