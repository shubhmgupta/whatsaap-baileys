'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, DollarSign, Users, LayoutDashboard, LogOut, ChevronRight, Menu, X } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      router.push('/signin');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Check if user is admin
    if (parsedUser.role !== 'admin') {
      alert('Access denied. Admin privileges required.');
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    sessionStorage.clear();
    router.push('/signin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const navigation = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Manage Plans',
      href: '/admin/pricing',
      icon: DollarSign,
    },
    {
      name: 'Manage Users',
      href: '/admin/users',
      icon: Users,
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-red-500" />
                <div>
                  <h2 className="text-white font-bold text-lg">Admin Panel</h2>
                  <p className="text-gray-400 text-xs truncate max-w-[160px]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-gradient-to-r from-red-500/20 to-orange-600/20 text-white border border-red-500/50'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-700/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-500" />
              <span className="text-white font-bold">Admin Panel</span>
            </div>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
