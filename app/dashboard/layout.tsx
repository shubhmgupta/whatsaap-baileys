'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  MessageSquare, 
  Inbox,
  Key, 
  Users,
  Book, 
  LogOut,
  ChevronRight,
  Shield,
  Coins
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Codefy';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication
    const userString = sessionStorage.getItem('user');
    if (!userString) {
      window.location.href = '/signin';
      return;
    }
    
    try {
      const user = JSON.parse(userString);
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');
      setIsAuthenticated(true);

      // Auto-restore WhatsApp session in background across any dashboard page
      if (user?.id) {
        fetch('/api/auth/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }
    } catch (error) {
      sessionStorage.removeItem('user');
      window.location.href = '/signin';
      return;
    }
    
    setLoading(false);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Live Inbox', href: '/dashboard/inbox', icon: Inbox },
    { name: 'Send Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { name: 'Documentation', href: '/dashboard/docs', icon: Book },
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }] : []),
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Show loading while checking authentication
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white antialiased">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900/90 backdrop-blur-xl border-r border-gray-800/80 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800/80">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold text-white text-base">
                W
              </span>
              <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                {appName}
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Preview & Credit Badge */}
          {currentUser && (
            <div className="p-4 mx-3 mt-4 rounded-xl bg-gray-800/40 border border-gray-700/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">
                {currentUser.fullname?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentUser.fullname}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-300 font-medium">
                    {currentUser.credits ?? 0} credits
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                  {active && (
                    <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-800/80">
            <button
              onClick={() => {
                sessionStorage.removeItem('user');
                window.location.href = '/signin';
              }}
              className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-sm font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-gray-900/90 backdrop-blur-md border-b border-gray-800/80">
          <div className="flex items-center justify-between px-4 py-3.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              {appName}
            </Link>
            <div className="w-6" />
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
