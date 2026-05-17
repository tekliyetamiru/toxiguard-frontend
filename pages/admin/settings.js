import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const [thresholds, setThresholds] = useState([0.75, 0.75, 0.75, 0.75, 0.75, 0.75]);
  const [announcement, setAnnouncement] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('thresholds');
  
  const categories = [
    { key: 'toxic', label: 'Toxic', color: 'red', desc: 'General toxic or harmful content' },
    { key: 'severe_toxic', label: 'Severe Toxic', color: 'rose', desc: 'Extremely harmful or hateful content' },
    { key: 'obscene', label: 'Obscene', color: 'orange', desc: 'Obscene or vulgar language' },
    { key: 'threat', label: 'Threat', color: 'amber', desc: 'Threatening or intimidating messages' },
    { key: 'insult', label: 'Insult', color: 'yellow', desc: 'Personal insults or attacks' },
    { key: 'identity_hate', label: 'Identity Hate', color: 'pink', desc: 'Hate speech targeting identity groups' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [threshRes, annRes] = await Promise.all([
          api.get('/api/admin/global-thresholds'),
          api.get('/api/announcements')
        ]);
        setThresholds(threshRes.data.thresholds);
        setAnnouncements(annRes.data.announcements || []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const saveThresholds = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/global-thresholds', { thresholds });
      alert('✅ Thresholds saved successfully!');
    } catch (err) { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const postAnnouncement = async () => {
    if (!announcement.trim()) return;
    setPosting(true);
    try {
      const newAnn = { message: announcement, date: new Date().toISOString() };
      const newList = [newAnn, ...announcements];
      await api.post('/api/admin/announcements', { announcements: newList });
      setAnnouncements(newList);
      setAnnouncement('');
      alert('✅ Announcement posted!');
    } catch (err) { alert('Failed to post'); }
    finally { setPosting(false); }
  };

  const deleteAnnouncement = async (index) => {
    const newList = announcements.filter((_, i) => i !== index);
    try {
      await api.post('/api/admin/announcements', { announcements: newList });
      setAnnouncements(newList);
    } catch (err) { alert('Failed to delete'); }
  };

  const resetThresholds = () => {
    setThresholds([0.75, 0.75, 0.75, 0.75, 0.75, 0.75]);
  };

  return (
    <ProtectedRoute adminOnly>
      <Layout title="Settings">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl shadow-xl p-6 text-white">
            <h1 className="text-2xl font-bold">⚙️ Admin Settings</h1>
            <p className="text-purple-100 mt-1">Configure global toxicity thresholds and manage announcements</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
            {[
              { id: 'thresholds', label: '🎯 Toxicity Thresholds' },
              { id: 'announcements', label: '📢 Announcements' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${
                  activeTab === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Thresholds Tab */}
          {activeTab === 'thresholds' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Toxicity Detection Thresholds</h2>
                  <p className="text-gray-500 text-sm mt-1">Messages with scores above these thresholds will be flagged as toxic</p>
                </div>
                <button onClick={resetThresholds} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                  Reset to Default
                </button>
              </div>

              <div className="space-y-4">
                {categories.map((cat, idx) => (
                  <motion.div key={cat.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className={`w-3 h-3 rounded-full bg-${cat.color}-500 flex-shrink-0`} />
                    <div className="flex-1">
                      <label className="font-semibold text-gray-800 capitalize">{cat.label}</label>
                      <p className="text-xs text-gray-500">{cat.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={thresholds[idx]}
                        onChange={e => {
                          const newT = [...thresholds];
                          newT[idx] = parseFloat(e.target.value);
                          setThresholds(newT);
                        }}
                        className="w-24 accent-purple-600"
                      />
                      <span className="w-14 text-center font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg text-sm">
                        {thresholds[idx].toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={saveThresholds} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-md">
                  {saving ? '💾 Saving...' : '💾 Save Thresholds'}
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 text-sm">ℹ️ How Thresholds Work</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Each category has an independent threshold (0.00 - 1.00). When the model's confidence for a category exceeds its threshold, 
                  the message is flagged. Lower thresholds = more sensitive detection (more false positives). 
                  Higher thresholds = less sensitive (more false negatives). Default is 0.75 for all categories.
                </p>
              </div>
            </motion.div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-bold mb-2">Post Announcement</h2>
              <p className="text-gray-500 text-sm mb-4">Announcements appear on all user dashboards</p>
              
              <div className="space-y-3 mb-6">
                <textarea
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Write an announcement for all users..."
                />
                <button onClick={postAnnouncement} disabled={posting || !announcement.trim()} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-md">
                  {posting ? '📤 Posting...' : '📤 Post Announcement'}
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">📋 Recent Announcements ({announcements.length})</h3>
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No announcements yet</div>
                ) : (
                  <div className="space-y-2">
                    {announcements.map((ann, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                        <div className="flex-1">
                          <p className="text-gray-800">{ann.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(ann.date).toLocaleString()}</p>
                        </div>
                        <button onClick={() => deleteAnnouncement(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}