'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Key, RefreshCw, Book, Users, Zap, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      checkConnectionStatus(parsedUser.id);
    }
  }, []);

  const checkConnectionStatus = async (userId: number) => {
    try {
      const statusRes = await fetch(`/api/auth/status?userId=${userId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setConnected(statusData.connected);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  const quickActions = [
    {
      title: 'Send Messages',
      description: 'Send WhatsApp messages to your contacts',
      icon: MessageSquare,
      href: '/dashboard/messages',
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Manage Contacts',
      description: 'Add and manage your contacts',
      icon: Users,
      href: '/dashboard/contacts',
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Manage API Keys',
      description: 'Create and manage your API keys',
      icon: Key,
      href: '/dashboard/api-keys',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Documentation',
      description: 'Learn how to integrate our API',
      icon: Book,
      href: '/dashboard/docs',
      color: 'from-orange-500 to-red-600',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.fullname || 'User'}!
        </h1>
        <p className="text-gray-400">Here's your WhatsApp automation overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Connection Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">WhatsApp Status</h3>
            {connected ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${connected ? 'text-green-400' : 'text-gray-400'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {connected ? 'Ready to send messages' : 'Connect your WhatsApp'}
          </p>
        </div>

        {/* Credits */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Available Credits</h3>
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{user?.credits || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Messages remaining</p>
        </div>

        {/* API Keys */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">API Keys</h3>
            <Key className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">Active</p>
          <p className="text-gray-500 text-sm mt-1">Manage in settings</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all hover:scale-105"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold mb-2 flex items-center justify-between">
                  {action.title}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-gray-400 text-sm">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
