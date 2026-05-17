import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { motion } from 'framer-motion';

export default function DiscordBots() {
  const [bots, setBots] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [form, setForm] = useState({ token: '', username: '', api_key_id: '', blocked_words: '' });
  const [loading, setLoading] = useState(false);

  const fetchBots = async () => {
    try {
      const [botsRes, keysRes] = await Promise.all([
        api.get('/api/user/discord-bots'),
        api.get('/api/user/api-keys')
      ]);
      setBots(botsRes.data);
      setApiKeys(keysRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchBots(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/user/discord-bots', form);
      await fetchBots();
      setForm({ token: '', username: '', api_key_id: '', blocked_words: '' });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleBot = async (id, action) => {
    try {
      await api.post(`/api/user/discord-bots/${id}/${action}`);
      await fetchBots();
    } catch (err) { console.error(err); }
  };

  const deleteBot = async (id) => {
    if (confirm('Delete this Discord bot?')) {
      try {
        await api.delete(`/api/user/discord-bots/${id}`);
        await fetchBots();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <Layout title="Discord Bots">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🎮 Discord Bots</h1>
          <p className="text-gray-600 mt-1">Manage your Discord moderation bots</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add Bot Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 -mx-6 -mt-6 px-6 py-4 rounded-t-xl mb-6">
              <h2 className="text-xl font-bold text-white">🤖 Add New Discord Bot</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <select name="api_key_id" value={form.api_key_id} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required>
                  <option value="">Select API Key</option>
                  {apiKeys.map(key => <option key={key.id} value={key.id}>{key.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                <input type="text" name="token" value={form.token} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="MTIzNDU2..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Username</label>
                <input type="text" name="username" value={form.username} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="MyBot#1234" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Words</label>
                <textarea name="blocked_words" value={form.blocked_words} onChange={handleChange} rows="3" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="badword1, badword2, ..." />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition shadow-md">
                {loading ? '⏳ Adding...' : '🚀 Add Bot'}
              </button>
            </form>
          </motion.div>

          {/* Bot List */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">📋 Your Discord Bots</h2>
            {bots.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🎮</div>
                <p className="text-gray-500">No Discord bots added yet.</p>
                <p className="text-sm text-gray-400">Add your first Discord bot to start monitoring.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bots.map(bot => (
                  <div key={bot.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{bot.username}</h3>
                        <p className="text-sm text-gray-400 font-mono">{bot.token.slice(0, 15)}...</p>
                        <p className="text-sm mt-1">
                          Status: 
                          <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            bot.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {bot.status === 'running' ? '🟢 Running' : '⏸ Stopped'}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {bot.status === 'running' ? (
                          <button onClick={() => toggleBot(bot.id, 'stop')} className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium">⏸ Stop</button>
                        ) : (
                          <button onClick={() => toggleBot(bot.id, 'start')} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">▶ Start</button>
                        )}
                        <button onClick={() => deleteBot(bot.id)} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}