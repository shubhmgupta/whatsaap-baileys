'use client';

import { useState, useEffect } from 'react';
import { Key, Copy, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ApiKeysPage() {
  const [user, setUser] = useState<any>(null);
  const [apiTokens, setApiTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<number>>(new Set());
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadApiTokens(parsedUser.id);
    }
  }, []);

  const loadApiTokens = async (userId: number) => {
    try {
      const res = await fetch(`/api/token?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setApiTokens(data.tokens || []);
      }
    } catch (error) {
      console.error('Failed to load API tokens:', error);
    }
  };

  const createApiToken = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('API key created successfully!');
        await loadApiTokens(user.id);
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiToken = async (tokenId: number) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const res = await fetch(`/api/token/${tokenId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('API key deleted successfully!');
        await loadApiTokens(user.id);
      } else {
        setError('Failed to delete API key');
      }
    } catch (err) {
      setError('Failed to delete API key. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('API key copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const toggleTokenVisibility = (tokenId: number) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(tokenId)) {
      newVisible.delete(tokenId);
    } else {
      newVisible.add(tokenId);
    }
    setVisibleTokens(newVisible);
  };

  const maskToken = (token: string) => {
    return token.substring(0, 8) + '...' + token.substring(token.length - 8);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
            <p className="text-gray-400">Manage your API keys for integration</p>
          </div>
          <button
            onClick={createApiToken}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Create New Key
          </button>
        </div>

        {/* User info */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-white font-semibold">{user?.fullname}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Credits Available</p>
              <p className="text-2xl font-bold text-green-400">{user?.credits || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Your API Keys</h2>
          <p className="text-gray-400 text-sm mt-1">Use these keys to authenticate API requests</p>
        </div>

        {apiTokens.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No API keys yet</p>
            <p className="text-gray-500 text-sm">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {apiTokens.map((token) => (
              <div key={token.id} className="p-6 hover:bg-gray-700/20 transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <code className="text-white font-mono text-sm bg-gray-900/50 px-3 py-1 rounded border border-gray-700/50 truncate">
                        {visibleTokens.has(token.id) ? token.token : maskToken(token.token)}
                      </code>
                    </div>
                    <p className="text-gray-500 text-xs">
                      Created: {new Date(token.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTokenVisibility(token.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition"
                      title={visibleTokens.has(token.id) ? 'Hide' : 'Show'}
                    >
                      {visibleTokens.has(token.id) ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(token.token)}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 rounded-lg transition"
                      title="Copy"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteApiToken(token.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Example */}
      <div className="mt-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Usage Example</h3>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
          <pre className="text-green-400 text-sm overflow-x-auto">
{`curl -X POST https://your-domain.com/api/message/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "919876543210",
    "message": "Hello from API!"
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
