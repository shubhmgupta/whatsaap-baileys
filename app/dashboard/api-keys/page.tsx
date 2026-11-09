'use client';

import { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Coins, 
  Terminal,
  Code2,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function ApiKeysPage() {
  const [user, setUser] = useState<any>(null);
  const [apiTokens, setApiTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
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
        setSuccess('API key generated successfully!');
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
    if (!confirm('Are you sure you want to revoke this API key? Any integration using it will immediately lose access.')) return;

    try {
      const res = await fetch(`/api/token/${tokenId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('API key revoked successfully.');
        await loadApiTokens(user.id);
      } else {
        setError('Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key. Please try again.');
    }
  };

  const copyToClipboard = (text: string, tokenId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(tokenId);
    setSuccess('API key copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
      setSuccess('');
    }, 2500);
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
    if (token.length <= 16) return '••••••••••••••••';
    return token.substring(0, 10) + '••••••••••••••••' + token.substring(token.length - 6);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            API Keys
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage Bearer tokens to authenticate custom backend integrations, CRMs, and webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/docs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>API Reference</span>
          </Link>
          <button
            onClick={createApiToken}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Generate Key</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* User Info & Credits Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Authenticated Account</p>
              <p className="text-sm font-bold text-white">
                {user?.name || user?.fullname || user?.email || 'Active User'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-6">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-slate-400">Credit Balance</p>
                <p className="text-lg font-extrabold text-emerald-400">
                  {user?.credits?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-0.5 text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="p-0.5 text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Keys Table/Cards */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Active API Keys</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Include in the <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded text-[11px]">Authorization: Bearer &lt;key&gt;</code> request header
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
            {apiTokens.length} key{apiTokens.length === 1 ? '' : 's'}
          </span>
        </div>

        {apiTokens.length === 0 ? (
          <div className="p-16 text-center">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium text-sm">No API keys generated</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Click &ldquo;Generate Key&rdquo; above to obtain a secret token for sending messages via API.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {apiTokens.map((token) => (
              <div key={token.id} className="p-5 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <code className="text-xs sm:text-sm font-mono text-emerald-300 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 select-all break-all inline-block max-w-full">
                      {visibleTokens.has(token.id) ? token.token : maskToken(token.token)}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono pl-4">
                    Created {new Date(token.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-auto">
                  <button
                    onClick={() => toggleTokenVisibility(token.id)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition text-xs flex items-center gap-1"
                    title={visibleTokens.has(token.id) ? 'Hide' : 'Reveal'}
                  >
                    {visibleTokens.has(token.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => copyToClipboard(token.token, token.id)}
                    className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition text-xs flex items-center gap-1"
                    title="Copy token"
                  >
                    {copiedId === token.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => deleteApiToken(token.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition text-xs"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Integration Example */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">cURL Quickstart</h3>
          </div>
          <Link
            href="/dashboard/docs"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
          >
            <span>Full documentation</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs overflow-x-auto text-emerald-300">
{`curl -X POST https://your-domain.com/api/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "919876543210",
    "message": "Hello from custom API webhook!"
  }'`}
        </div>
      </div>
    </div>
  );
}
