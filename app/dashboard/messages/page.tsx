'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  LogOut, 
  Send, 
  Phone, 
  Video,
  Image as ImageIcon, 
  File as FileIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Wifi, 
  WifiOff, 
  Users, 
  Search, 
  X,
  Paperclip,
  Trash2,
  Sparkles,
  ShieldCheck,
  Inbox,
  AlertCircle,
  Smartphone,
  CheckCheck,
  RefreshCw,
  Coins,
  MessageSquare,
  Clock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import ChatMessageMedia from '@/components/ChatMessageMedia';

export default function MessagesDashboard() {
  const [user, setUser] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  
  const [messageData, setMessageData] = useState({
    phoneNumber: '',
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const [bulkSendMode, setBulkSendMode] = useState<'both' | 'text' | 'file'>('both');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [incomingMessages, setIncomingMessages] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatTimelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Auto-restore WhatsApp session if user didn't manually disconnect
      (async () => {
        try {
          const wasManuallyDisconnected = sessionStorage.getItem('manuallyDisconnected') === 'true';
          if (wasManuallyDisconnected) {
            return;
          }
          
          const res = await fetch('/api/auth/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parsedUser.id })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'restored') {
              setConnected(!!data.connected);
              setSuccess('Restored WhatsApp session from database');
              loadContacts(parsedUser.id);
            }
          }
        } catch (err) {
          console.error('Auto-restore error:', err);
        }
      })();

      // Initial checks
      checkConnectionStatus(parsedUser.id);
      loadContacts(parsedUser.id);
      
      // Heartbeat interval
      const statusInterval = setInterval(() => {
        checkConnectionStatus(parsedUser.id);
      }, 5000);
      
      return () => clearInterval(statusInterval);
    }
  }, []);

  useEffect(() => {
    if (chatMessages.length > 0) {
      if (chatTimelineRef.current) {
        chatTimelineRef.current.scrollTo({
          top: chatTimelineRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [chatMessages]);

  const loadContacts = async (userId: number) => {
    try {
      const res = await fetch(`/api/contacts?userId=${userId}&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadIncomingMessages = async () => {
    try {
      const res = await fetch(`/api/messages/incoming?userId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setIncomingMessages(data.messages || []);
        setShowInbox(true);
      }
    } catch (error) {
      console.error('Failed to load incoming messages:', error);
    }
  };

  const loadChatMessages = async (contactId: number, phoneNumber: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/messages?userId=${user?.id}&phoneNumber=${phoneNumber}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

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

  const refreshUserData = async (userId: number) => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user;
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const handleConnectWhatsApp = async () => {
    setLoading(true);
    setError('');
    setQrCode('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 1 }),
      });

      const data = await res.json();

      if (res.ok) {
        switch (data.status) {
          case 'auto_connected':
            setConnected(true);
            setSuccess('Connected successfully using saved session!');
            setManuallyDisconnected(false);
            sessionStorage.removeItem('manuallyDisconnected');
            if (user?.id) loadContacts(user.id);
            break;

          case 'restoring':
          case 'connecting':
            setSuccess('Restoring session from database, please wait...');
            let pollCount = 0;
            const maxPolls = 15;
            const restoreInterval = setInterval(async () => {
              try {
                pollCount++;
                const qrRes = await fetch('/api/auth/qr', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user?.id || 1 }),
                });
                
                if (qrRes.ok) {
                  const qrData = await qrRes.json();
                  
                  if (qrData.status === 'auto_connected' || qrData.connected) {
                    setConnected(true);
                    setQrCode('');
                    setSuccess('WhatsApp connected successfully!');
                    clearInterval(restoreInterval);
                    if (user?.id) loadContacts(user.id);
                  } else if (qrData.status === 'qr_generated' && qrData.qr) {
                    setQrCode(qrData.qr);
                    setSuccess('Scan QR code with WhatsApp to connect');
                    clearInterval(restoreInterval);
                    startQrPolling();
                  } else if (!qrData.connecting && qrData.status !== 'restoring' || pollCount >= maxPolls) {
                    clearInterval(restoreInterval);
                    setError('Session restoration timed out. Please generate a fresh QR code.');
                    setConnected(false);
                    setQrCode('');
                  }
                }
              } catch (err) {
                console.error('Status check error:', err);
                if (pollCount >= maxPolls) {
                  clearInterval(restoreInterval);
                  setError('Connection timeout. Please try again.');
                }
              }
            }, 2000);
            break;

          case 'qr_generated':
            setQrCode(data.qr);
            setConnected(false);
            setSuccess('Scan QR code with WhatsApp to connect');
            setManuallyDisconnected(false);
            sessionStorage.removeItem('manuallyDisconnected');
            startQrPolling();
            break;

          default:
            setError('Unexpected response from server');
        }
      } else {
        if (data.status === 'already_connected') {
          setConnected(true);
          setSuccess('Already connected to WhatsApp!');
        } else {
          setError(data.error || 'Failed to connect');
        }
      }
    } catch (err) {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startQrPolling = () => {
    const qrInterval = setInterval(async () => {
      try {
        const qrRes = await fetch('/api/auth/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id || 1 }),
        });
        
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          if (qrData.status === 'auto_connected' || qrData.connected) {
            setConnected(true);
            setQrCode('');
            setSuccess('WhatsApp connected successfully!');
            clearInterval(qrInterval);
            if (user?.id) loadContacts(user.id);
          } else if (qrData.status === 'qr_generated' && qrData.qr) {
            setQrCode(qrData.qr);
          }
        }
      } catch (err) {
        console.error('QR polling error:', err);
      }
    }, 3000);
  };

  const handleLogoutWhatsApp = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 1 }),
      });

      if (res.ok) {
        setConnected(false);
        setQrCode('');
        setSuccess('WhatsApp disconnected successfully');
        setManuallyDisconnected(true);
        sessionStorage.setItem('manuallyDisconnected', 'true');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = async () => {
    if (!confirm('This will purge stored WhatsApp credentials and force a fresh QR generation. Continue?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/clear-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 1 }),
      });

      if (res.ok) {
        setConnected(false);
        setQrCode('');
        setSuccess('Credentials purged. Generate a new QR code to reconnect.');
        if (user?.id) await refreshUserData(user.id);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to clear credentials');
      }
    } catch (err) {
      console.error('Clear credentials error:', err);
      setError('Failed to clear credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSelectContactFromPicker = (contact: any) => {
    setMessageData({ ...messageData, phoneNumber: contact.phoneNumber });
    setSelectedContact(contact);
    setIsContactPickerOpen(false);
    if (contact.id) {
      loadChatMessages(contact.id, contact.phoneNumber);
    }
  };

  const toggleContactSelection = (contact: any) => {
    const isSelected = selectedContacts.find(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const selectAllContacts = () => {
    setSelectedContacts([...filteredContacts]);
  };

  const unselectAllContacts = () => {
    setSelectedContacts([]);
  };

  const handleBulkSend = async () => {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    if (bulkSendMode === 'text' && !messageData.message) {
      setError('Please enter a message text');
      return;
    }
    if (bulkSendMode === 'file' && !bulkFile) {
      setError('Please choose a file to send');
      return;
    }
    if (bulkSendMode === 'both' && !messageData.message && !bulkFile) {
      setError('Please enter a message or attach a file');
      return;
    }

    setError('');
    setSuccess('');
    setSendLoading(true);
    setBulkProgress({ current: 0, total: selectedContacts.length });

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedContacts.length; i++) {
        const contact = selectedContacts[i];
        setBulkProgress({ current: i + 1, total: selectedContacts.length });
        
        try {
          const formData = new FormData();
          formData.append('userId', user?.id?.toString() || '1');
          formData.append('phoneNumber', contact.phoneNumber);
          
          if ((bulkSendMode === 'text' || bulkSendMode === 'both') && messageData.message) {
            formData.append('message', messageData.message);
          }
          if ((bulkSendMode === 'file' || bulkSendMode === 'both') && bulkFile) {
            formData.append('file', bulkFile);
          }

          const res = await fetch('/api/message/send', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
          
          // 1 second safe rate-limit delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          failCount++;
        }
      }

      setSuccess(`Broadcast completed: ${successCount} sent, ${failCount} failed.`);
      
      if (user?.id) {
        await refreshUserData(user.id);
        await loadContacts(user.id);
      }
      
      setMessageData({ phoneNumber: '', message: '' });
      setSelectedFile(null);
      setBulkFile(null);
      setSelectedContacts([]);
      setIsBulkSendOpen(false);
    } catch (err) {
      setError('Failed to send broadcast messages.');
    } finally {
      setSendLoading(false);
      setBulkProgress(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setError('Please connect your WhatsApp device first.');
      return;
    }
    if (!messageData.phoneNumber.trim()) {
      setError('Please specify a recipient phone number.');
      return;
    }
    if (!messageData.message.trim() && !selectedFile) {
      setError('Please provide a message or file.');
      return;
    }

    setError('');
    setSuccess('');
    setSendLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', user?.id?.toString() || '1');
      formData.append('phoneNumber', messageData.phoneNumber.trim());
      if (messageData.message) {
        formData.append('message', messageData.message.trim());
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/message/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Message dispatched successfully!');
        
        if (user?.id) {
          await refreshUserData(user.id);
          await loadContacts(user.id);
        }
        
        // Add to active local session feed
        setMessages(prev => [
          {
            to: messageData.phoneNumber,
            text: messageData.message,
            file: selectedFile?.name,
            timestamp: new Date(),
            status: 'sent'
          },
          ...prev
        ]);
        
        if (selectedContact && selectedContact.phoneNumber === messageData.phoneNumber) {
          await loadChatMessages(selectedContact.id, selectedContact.phoneNumber);
        }
        
        setMessageData({ phoneNumber: '', message: '' });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(data.error || 'Failed to dispatch message');
      }
    } catch (err) {
      setError('Network error while sending message.');
    } finally {
      setSendLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Baileys Multi-Device Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            WhatsApp Messenger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pair your phone via QR, send rich attachments, or broadcast campaigns directly to contacts.
          </p>
        </div>

        {/* Header Badges & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection status badge */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            </span>
            <span>{connected ? 'Device Linked' : 'Disconnected'}</span>
          </div>

          {/* Credits Counter */}
          {user && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Credits: <strong className="text-white">{user.credits?.toLocaleString() ?? 0}</strong></span>
            </div>
          )}

          {/* Link to Live Inbox */}
          <Link
            href="/dashboard/inbox"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Live Inbox</span>
          </Link>

          {/* Incoming Messages Trigger */}
          <button
            onClick={loadIncomingMessages}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Inbound Log</span>
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-300 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left = WhatsApp Device Auth, Right = Composer & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= LEFT COLUMN: Device Manager (5 cols) ================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Top decorative glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Device Gateway</h2>
                  <p className="text-xs text-slate-400">Baileys WebSocket Link</p>
                </div>
              </div>

              {connected ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            {qrCode ? (
              <div className="mb-5 p-5 bg-white rounded-2xl shadow-inner border border-slate-200 text-center animate-in zoom-in-95 duration-200">
                <div className="relative inline-block p-2 bg-white rounded-xl">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto rounded-lg object-contain" />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-slate-900 font-bold text-sm">
                    Scan with WhatsApp
                  </p>
                  <p className="text-slate-500 text-xs">
                    WhatsApp &rarr; Linked Devices &rarr; Link a Device
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="mb-5 p-8 bg-slate-800/40 border border-slate-800 rounded-2xl text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-300">Synchronizing WhatsApp session...</p>
                <p className="text-xs text-slate-500">Checking credentials and socket connectivity</p>
              </div>
            ) : !connected ? (
              <div className="mb-5 p-6 bg-slate-800/30 border border-slate-800/60 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">No active session</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Generate a pairing QR code to link your phone number and unlock messaging capabilities.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-5 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-emerald-400">Ready to Send</h3>
                <p className="text-xs text-slate-400">
                  Session credentials verified in database. Your WhatsApp socket is alive and authenticated.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {!connected ? (
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initiating Link...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>{qrCode ? 'Regenerate QR Code' : 'Connect WhatsApp'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleLogoutWhatsApp}
                  disabled={loading}
                  className="w-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect Session</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleClearCredentials}
                disabled={loading}
                className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white font-medium py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Purge Stored Auth & Cache</span>
              </button>
            </div>

            {/* Step instructions */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Quick Pairing Guide
              </h4>
              <ol className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                  <span>Open <strong>WhatsApp</strong> on your mobile phone</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                  <span>Tap <strong>Linked Devices</strong> in Settings or Options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Link a Device</strong> and point camera here</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Composer & History (7 cols) ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Send Message Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" />
                  <span>Send Direct WhatsApp Message</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send high-priority direct texts, media attachments, and documents
                </p>
              </div>

              {/* Bulk Campaign Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsBulkSendOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer self-start sm:self-auto"
              >
                <Users className="w-4 h-4" />
                <span>Bulk Campaign ({contacts.length} Contacts)</span>
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-5">
              {/* Recipient Phone Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Recipient Phone Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsContactPickerOpen(true)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Choose from Contacts ({contacts.length})</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={messageData.phoneNumber}
                    onChange={(e) => setMessageData({ ...messageData, phoneNumber: e.target.value })}
                    className="w-full pl-10 pr-24 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                    placeholder="e.g. 919876543210 (with country code, no +)"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded">
                      E.164 format
                    </span>
                  </div>
                </div>
                {selectedContact && selectedContact.phoneNumber === messageData.phoneNumber && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected: <strong>{selectedContact.name || selectedContact.phoneNumber}</strong></span>
                  </p>
                )}
              </div>

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Message Body
                  </label>
                  <span className="text-xs text-slate-500 font-mono">
                    {messageData.message.length} chars
                  </span>
                </div>
                <textarea
                  value={messageData.message}
                  onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  className="w-full p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition resize-none"
                  placeholder="Type your WhatsApp message here... Supports *bold*, _italic_, ~strikethrough~"
                  rows={4}
                />
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Media / Document Attachment (Optional)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between p-3.5 bg-slate-800/80 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                        {selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-slate-800/30 hover:bg-slate-800/50 group"
                  >
                    <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 mx-auto mb-1 transition" />
                    <p className="text-xs text-slate-300 font-medium">
                      Click to attach Image, Video, Audio, PDF, or Document
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cloudinary auto-upload &bull; Up to 25MB
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendLoading || !connected || (!messageData.message && !selectedFile)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Message</span>
                    </>
                  )}
                </button>
                {!connected && (
                  <p className="text-center text-xs text-amber-400/90 mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Please pair your device on the left before sending</span>
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Chat History with Selected Contact or Recent Feed */}
          {selectedContact && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {(selectedContact.name || selectedContact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {selectedContact.name || 'WhatsApp Contact'}
                    </h3>
                    <p className="text-xs text-slate-400">+{selectedContact.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <a
                    href={`tel:+${selectedContact.phoneNumber}`}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${selectedContact.phoneNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition"
                    title="Open in WhatsApp"
                  >
                    <Video className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => loadChatMessages(selectedContact.id, selectedContact.phoneNumber)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Refresh chat"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message timeline */}
              <div ref={chatTimelineRef} className="space-y-3 max-h-80 overflow-y-auto pr-1 scroll-smooth">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No message history recorded with this contact yet.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-sm ${
                          msg.isFromMe
                            ? 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                        }`}
                      >
                        {msg.message && msg.message !== 'Media message' && (
                          <p className="leading-relaxed mb-2">{msg.message}</p>
                        )}
                        {msg.mediaUrl && (
                          <div className="mt-1">
                            <ChatMessageMedia
                              mediaUrl={msg.mediaUrl}
                              mediaType={msg.mediaType}
                              caption={msg.message}
                              isFromMe={msg.isFromMe}
                            />
                          </div>
                        )}
                        <p className="text-[10px] text-right mt-1 opacity-60">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>
            </div>
          )}

          {/* Active Session Outbound Feed */}
          {messages.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recent Dispatches In This Session
              </h3>
              <div className="space-y-2">
                {messages.slice(0, 5).map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">+{m.to}</span>
                      <span className="text-slate-400 truncate max-w-xs">{m.text || m.file || 'Media sent'}</span>
                    </div>
                    <span className="text-slate-500 font-mono">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL 1: Contact Picker ================= */}
      {isContactPickerOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Select Recipient</h3>
              </div>
              <button
                onClick={() => setIsContactPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by contact name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No matching contacts found.
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContactFromPicker(contact)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white group-hover:bg-emerald-500 group-hover:text-black transition">
                        {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-emerald-300 transition">
                          {contact.name || 'Unnamed Contact'}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">+{contact.phoneNumber}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: Bulk Campaign ================= */}
      {isBulkSendOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk WhatsApp Broadcast</h3>
                  <p className="text-xs text-slate-400">Multi-recipient campaign with 1s anti-ban throttle</p>
                </div>
              </div>
              <button
                onClick={() => { setIsBulkSendOpen(false); setSelectedContacts([]); setBulkFile(null); }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contact Selector Toolbar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllContacts}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold transition"
                  >
                    Select All ({filteredContacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={unselectAllContacts}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              {/* Selected Count Pills */}
              {selectedContacts.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-emerald-400 mb-2">
                    <span>{selectedContacts.length} recipients selected</span>
                    <span className="text-slate-400">1 credit / message</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedContacts.map((contact) => (
                      <span
                        key={contact.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30"
                      >
                        {contact.name || contact.phoneNumber}
                        <button
                          onClick={() => toggleContactSelection(contact)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact list for selection */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-60">
              {filteredContacts.length === 0 ? (
                <p className="text-slate-500 text-center py-6 text-sm">No contacts available</p>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.some(c => c.id === contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleContactSelection(contact)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-semibold text-sm text-white">{contact.name || 'Unnamed'}</p>
                          <p className="text-xs text-slate-400 font-mono">+{contact.phoneNumber}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Campaign Options & Sender */}
            <div className="p-5 border-t border-slate-800 bg-slate-900/90 space-y-4">
              {/* Mode switch */}
              <div className="grid grid-cols-3 gap-2">
                {(['both', 'text', 'file'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBulkSendMode(mode)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition uppercase tracking-wider ${
                      bulkSendMode === mode
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'both' ? 'Text + File' : mode === 'text' ? 'Text Only' : 'File Only'}
                  </button>
                ))}
              </div>

              {/* Message Input */}
              {(bulkSendMode === 'both' || bulkSendMode === 'text') && (
                <textarea
                  value={messageData.message}
                  onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Bulk broadcast message..."
                  rows={3}
                />
              )}

              {/* File Attachment */}
              {(bulkSendMode === 'both' || bulkSendMode === 'file') && (
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer text-xs font-medium text-slate-300 transition">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span>{bulkFile ? bulkFile.name : 'Choose broadcast attachment'}</span>
                    <input
                      type="file"
                      onChange={(e) => setBulkFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                  {bulkFile && (
                    <button
                      type="button"
                      onClick={() => setBulkFile(null)}
                      className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {bulkProgress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Sending batch...</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsBulkSendOpen(false); setSelectedContacts([]); setBulkFile(null); }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSend}
                  disabled={sendLoading || selectedContacts.length === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Launch to {selectedContacts.length} Contacts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: Inbound Messages ================= */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Received WhatsApp Messages</h3>
                  <p className="text-xs text-slate-400">Inbound messages received by your active WhatsApp session</p>
                </div>
              </div>
              <button
                onClick={() => setShowInbox(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {incomingMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No incoming messages recorded</p>
                  <p className="text-xs mt-1">When someone texts your connected WhatsApp number, it will show up here</p>
                </div>
              ) : (
                incomingMessages.map((msg) => (
                  <div key={msg.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">+{msg.phoneNumber}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{msg.message}</p>
                    {msg.mediaType && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/60 text-slate-300 text-xs">
                        <FileIcon className="w-3.5 h-3.5" />
                        <span className="capitalize">{msg.mediaType} attachment</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowInbox(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
