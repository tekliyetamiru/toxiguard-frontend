import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [sortBy, setSortBy] = useState('id');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let result = [...users];
    if (search) result = result.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    if (sortBy === 'id') result.sort((a, b) => a.id - b.id);
    else if (sortBy === 'username') result.sort((a, b) => a.username.localeCompare(b.username));
    else if (sortBy === 'date') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredUsers(result);
  }, [users, search, roleFilter, sortBy]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleRole = async (userId) => {
    setActionLoading(userId);
    try {
      await api.put(`/api/admin/users/${userId}/role`);
      setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (userId) => {
    if (!confirm('⚠️ Delete this user permanently? All bots and messages will be removed.')) return;
    setActionLoading(userId);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const resetApiKeys = async (userId) => {
    if (!confirm('Reset all API keys for this user? Existing bots will stop working.')) return;
    try { await api.post(`/api/admin/users/${userId}/reset-keys`); alert('✅ API keys reset'); }
    catch (err) { alert('Failed to reset keys'); }
  };

  const setCredits = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/api/admin/users/${selectedUser.id}/credits`, { credits: creditAmount });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, credits: creditAmount } : u));
      setShowCreditsModal(false);
      alert('✅ Credits updated');
    } catch (err) { alert('Failed'); }
  };

  const viewUserMessages = async (user) => {
    setSelectedUser(user);
    try {
      const res = await api.get(`/api/admin/users/${user.id}/messages?limit=50`);
      setUserMessages(res.data);
      setShowModal(true);
    } catch (err) { alert('Failed to load messages'); }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    regular: users.filter(u => u.role === 'user').length,
  };

  if (loading) return (
    <ProtectedRoute adminOnly><Layout title="Users"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></Layout></ProtectedRoute>
  );

  return (
    <ProtectedRoute adminOnly>
      <Layout title="Manage Users">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">👥 User Management</h1>
                <p className="text-purple-100 mt-1">Manage all registered users and their permissions</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-purple-100">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-purple-100">Admins</p>
                  <p className="text-xl font-bold">{stats.admins}</p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-purple-100">Users</p>
                  <p className="text-xl font-bold">{stats.regular}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500">
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500">
                <option value="id">Sort by ID</option>
                <option value="username">Sort by Name</option>
                <option value="date">Sort by Date</option>
              </select>
              <button onClick={fetchUsers} className="px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition">🔄 Refresh</button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-gray-400">No users found</td></tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">#{user.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm">
                              {user.username[0].toUpperCase()}
                            </div>
                            <span className="font-semibold">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => toggleRole(user.id)} disabled={actionLoading === user.id} className="px-2.5 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium" title="Toggle admin/user role">
                              🔄 Role
                            </button>
                            <button onClick={() => { setSelectedUser(user); setShowCreditsModal(true); }} className="px-2.5 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition font-medium" title="Set credits">
                              💰 Credits
                            </button>
                            <button onClick={() => resetApiKeys(user.id)} className="px-2.5 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition font-medium" title="Reset API keys">
                              🔑 Keys
                            </button>
                            <button onClick={() => viewUserMessages(user)} className="px-2.5 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium" title="View messages">
                              📋 Msgs
                            </button>
                            <button onClick={() => deleteUser(user.id)} disabled={actionLoading === user.id} className="px-2.5 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium" title="Delete user">
                              🗑 Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Messages Modal */}
        <AnimatePresence>
          {showModal && selectedUser && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">📋 Messages by {selectedUser.username}</h3>
                  <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="overflow-auto max-h-[70vh] p-6">
                  {userMessages.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No messages from this user.</p>
                  ) : (
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Message</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Lang</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {userMessages.map(msg => (
                          <tr key={msg.id} className={msg.is_toxic ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(msg.timestamp).toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm truncate max-w-sm">{msg.text}</td>
                            <td className="px-3 py-2 text-xs uppercase">{msg.language || '-'}</td>
                            <td className="px-3 py-2 text-xs">{msg.is_toxic ? <span className="text-red-600">⚠️ Toxic</span> : <span className="text-green-600">✅ Clean</span>}</td>
                            <td className="px-3 py-2 text-xs">{msg.toxicity_level != null ? `${(msg.toxicity_level * 100).toFixed(1)}%` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Credits Modal */}
        <AnimatePresence>
          {showCreditsModal && selectedUser && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold mb-2">💰 Set Credits</h3>
                <p className="text-gray-500 text-sm mb-4">User: <strong>{selectedUser.username}</strong></p>
                <input type="number" value={creditAmount} onChange={e => setCreditAmount(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 mb-4" min="0" />
                <div className="flex gap-3">
                  <button onClick={setCredits} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition">Save</button>
                  <button onClick={() => setShowCreditsModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  );
}