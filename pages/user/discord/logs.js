import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';
import { motion } from 'framer-motion';

export default function DiscordLogs() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toxicOnly, setToxicOnly] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/user/messages/discord?limit=100&toxic_only=${toxicOnly}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [toxicOnly]);

  const exportLogs = () => {
    window.location.href = '/api/user/export-logs/discord';
  };

  const toxicCount = messages.filter(m => m.is_toxic).length;
  const cleanCount = messages.filter(m => !m.is_toxic).length;
  const toxicRate = messages.length > 0 ? ((toxicCount / messages.length) * 100).toFixed(1) : 0;

  return (
    <ProtectedRoute>
      <Layout title="Discord Message Logs">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">🎮 Discord Message Logs</h1>
              <p className="text-gray-600 mt-1">View and analyze all messages processed from your Discord bots</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setToxicOnly(!toxicOnly)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  toxicOnly 
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {toxicOnly ? '🔴 Showing Toxic Only' : '📋 Show All Messages'}
              </button>
              <button
                onClick={exportLogs}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition shadow-md"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          {messages.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <h3 className="font-semibold text-lg mb-3">📊 Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg p-4 shadow-sm text-center">
                  <p className="text-sm text-gray-500">Total Messages</p>
                  <p className="text-2xl font-bold text-indigo-600">{messages.length}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-lg p-4 shadow-sm text-center">
                  <p className="text-sm text-gray-500">Toxic Messages</p>
                  <p className="text-2xl font-bold text-red-600">{toxicCount}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-lg p-4 shadow-sm text-center">
                  <p className="text-sm text-gray-500">Clean Messages</p>
                  <p className="text-2xl font-bold text-green-600">{cleanCount}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-lg p-4 shadow-sm text-center">
                  <p className="text-sm text-gray-500">Toxicity Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{toxicRate}%</p>
                </motion.div>
              </div>
            </div>
          )}

          {/* Messages Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-500 text-lg">No messages logged yet for Discord.</p>
                <p className="text-sm text-gray-400 mt-2">
                  {toxicOnly 
                    ? '🎉 No toxic messages detected! Your servers are safe.' 
                    : 'Add a Discord bot and start monitoring your servers.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Language</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Toxicity Level</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Categories</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {messages.map((msg) => (
                      <tr key={msg.id} className={`transition ${msg.is_toxic ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                          {new Date(msg.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm break-all max-w-md font-medium">
                          {msg.text}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold uppercase">
                            {msg.language || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{msg.owner || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  (msg.toxicity_level || 0) > 0.7 
                                    ? 'bg-red-500' 
                                    : (msg.toxicity_level || 0) > 0.4 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min((msg.toxicity_level || 0) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold">
                              {((msg.toxicity_level || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {msg.is_toxic ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              ⚠️ Toxic
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              ✅ Clean
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {msg.toxic_categories && msg.toxic_categories.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {msg.toxic_categories.map((cat, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-200"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}