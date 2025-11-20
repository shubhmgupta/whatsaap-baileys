'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Minus, RefreshCw } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string | null;
  credits: number;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditOperation, setCreditOperation] = useState<'add' | 'set'>('add');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        // console.log('Users loaded:', data);
        setUsers(data);
      } else {
        const error = await response.json();
        console.error('Failed to load users:', error);
        alert(`Failed to load users: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Network error while loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/credits`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(creditAmount),
          operation: creditOperation,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await loadUsers();
        setShowModal(false);
        setSelectedUser(null);
        setCreditAmount('');
        alert(`✅ Successfully updated credits! New balance: ${result.user.credits} credits`);
      } else {
        const error = await response.json();
        alert(`❌ Failed to update credits: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating credits:', error);
      alert('Error updating credits');
    }
  };

  const openCreditModal = (user: User) => {
    setSelectedUser(user);
    setCreditAmount('');
    setCreditOperation('add');
    setShowModal(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Users</h1>
          <p className="text-gray-400 mt-1">View and manage user credits</p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <p className="text-gray-400 text-sm">Total Credits Issued</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.reduce((sum, user) => sum + user.credits, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <p className="text-gray-400 text-sm">Admin Users</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden overflow-scroll">
        <table className="w-full overflow-hidden">
          <thead className="bg-gray-900/50 border-b border-gray-700 overflow-scroll">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-white">
                      {user.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-300">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-blue-400 font-semibold">
                      {user.credits.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openCreditModal(user)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Manage Credits
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Credit Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">
              Manage Credits for {selectedUser.name || selectedUser.email}
            </h2>
            
            <div className="mb-4 p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">Current Credits</p>
              <p className="text-2xl font-bold text-blue-400">
                {selectedUser.credits.toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleCreditUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Operation
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="operation"
                      value="add"
                      checked={creditOperation === 'add'}
                      onChange={(e) => setCreditOperation(e.target.value as 'add' | 'set')}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-300">Add Credits</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="operation"
                      value="set"
                      checked={creditOperation === 'set'}
                      onChange={(e) => setCreditOperation(e.target.value as 'add' | 'set')}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-300">Set Credits</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {creditOperation === 'add' ? 'Credits to Add' : 'New Credit Amount'}
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="100"
                  required
                />
                {creditOperation === 'add' && creditAmount && !isNaN(parseInt(creditAmount)) && (
                  <p className="text-sm text-green-400 mt-2">
                    New balance: {(selectedUser.credits + parseInt(creditAmount)).toLocaleString()} credits
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    setCreditAmount('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
