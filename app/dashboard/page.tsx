'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Key, 
  RefreshCw, 
  Book, 
  Users, 
  Zap, 
  ArrowRight, 
  Wifi, 
  WifiOff, 
  Inbox, 
  Coins, 
  ShieldCheck, 
  Sparkles,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      checkConnectionStatus(parsedUser.id);
    }
  }, []);

  const checkConnectionStatus = async (userId: number) => {
    setChecking(true);
    try {
      const statusRes = await fetch(`/api/auth/status?userId=${userId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setConnected(statusData.connected);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    } finally {
      setChecking(false);
    }
  };

  const quickActions = [
    {
      title: 'Live Inbox',
      description: 'Chat in real time with your WhatsApp contacts',
      icon: Inbox,
      href: '/dashboard/inbox',
      badge: 'Live',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Send Messages',
      description: 'Send direct or bulk broadcast messages with media',
      icon: MessageSquare,
      href: '/dashboard/messages',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Manage Contacts',
      description: 'Directory, search, and bulk Excel import',
      icon: Users,
      href: '/dashboard/contacts',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      title: 'API Tokens',
      description: 'Generate Bearer keys for CRM & custom webhooks',
      icon: Key,
      href: '/dashboard/api-keys',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Interactive Docs',
      description: 'Full REST API guide with cURL and code snippets',
      icon: Book,
      href: '/dashboard/docs',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Pricing & Credits',
      description: 'Recharge your message balance with packages',
      icon: Coins,
      href: '/pricing',
      gradient: 'from-emerald-500 to-cyan-600',
    },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800/90 to-gray-900 border border-gray-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              WhatsApp Automation Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">{user?.fullname || 'User'}</span>!
            </h1>
            <p className="text-gray-400 mt-2 text-base max-w-xl">
              Monitor your session connection, broadcast campaigns, and manage REST API keys all from your workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => user?.id && checkConnectionStatus(user.id)}
              disabled={checking}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh Status</span>
            </button>
            <Link
              href="/dashboard/messages"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Compose Message</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Connection */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 shadow-xl flex flex-col justify-between group hover:border-gray-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">WhatsApp Engine</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                connected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {connected ? 'Active' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-400'
              }`}>
                {connected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {connected ? 'Session Connected' : 'Not Connected'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {connected ? 'Ready for automated messaging' : 'Pair phone to start messaging'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            {connected ? (
              <Link
                href="/dashboard/inbox"
                className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Open Live Inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Pair via QR Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Message Credits */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 shadow-xl flex flex-col justify-between group hover:border-gray-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Credit Balance</span>
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <Coins className="w-4 h-4" />
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {user?.credits?.toLocaleString() ?? 0}
              </span>
              <span className="text-xs font-medium text-gray-400">credits</span>
            </div>
            <p className="text-xs text-gray-400">1 credit per WhatsApp message sent</p>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Recharge or Upgrade Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* API Integration */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 shadow-xl flex flex-col justify-between group hover:border-gray-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">REST API v1</span>
              <span className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                <Key className="w-4 h-4" />
              </span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">API Token Ready</p>
                <p className="text-xs text-gray-400 mt-0.5">Bearer authentication active</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <Link
              href="/dashboard/api-keys"
              className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>Manage API Tokens</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">Workspace Modules</h2>
          <span className="text-xs text-gray-500 font-medium">6 modules available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group relative overflow-hidden rounded-2xl bg-gray-900/60 hover:bg-gray-900/90 backdrop-blur-md border border-gray-800 hover:border-gray-700 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${action.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {action.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {action.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
