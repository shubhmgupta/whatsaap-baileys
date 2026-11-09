'use client';

import { useState, useEffect } from 'react';
import { LogOut, Send, Phone, Image, File, Loader2, CheckCircle, XCircle, QrCode, Wifi, WifiOff, Users, Search, X } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Codefy';
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

  useEffect(() => {
    // Get user from session storage (temporary - replace with proper session management)
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Attempt auto-restore from database on page load (no QR generation if no backup)
      // Skip if user manually disconnected
      (async () => {
        try {
          const wasManuallyDisconnected = sessionStorage.getItem('manuallyDisconnected') === 'true';
          if (wasManuallyDisconnected) {
            console.log('⏭️ Skipping auto-restore (user manually disconnected)');
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
              setSuccess('✅ Restored WhatsApp session from database');
              // refresh contacts
              loadContacts(parsedUser.id);
            }
          }
        } catch (err) {
          console.error('Auto-restore error:', err);
        }
      })();

      // Check connection status on mount
      checkConnectionStatus(parsedUser.id);
      
      // Load contacts
      loadContacts(parsedUser.id);
      
      // Continuously check connection status every 5 seconds
      const statusInterval = setInterval(() => {
        checkConnectionStatus(parsedUser.id);
      }, 5000);
      
      // Cleanup interval on unmount
      return () => clearInterval(statusInterval);
    }
  }, []);

  const loadContacts = async (userId: number) => {
    try {
      const res = await fetch(`/api/contacts?userId=${userId}`);
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

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    window.location.href = '/signin';
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
        // Handle different response statuses
        switch (data.status) {
          case 'auto_connected':
            // Session restored from database, already connected
            setConnected(true);
            setSuccess('✅ Connected successfully using saved session!');
            // Clear manual disconnect flag since user is connecting again
            setManuallyDisconnected(false);
            sessionStorage.removeItem('manuallyDisconnected');
            if (user?.id) {
              loadContacts(user.id);
            }
            break;

          case 'restoring':
          case 'connecting':
            // Session is being restored from database
            setSuccess('🔄 Restoring session from database, please wait...');
            // Poll for connection status with timeout
            let pollCount = 0;
            const maxPolls = 15; // 30 seconds max (15 polls * 2 seconds)
            const restoreInterval = setInterval(async () => {
              try {
                pollCount++;
                // Check QR endpoint for updates (may have new QR if restoration failed)
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
                    setSuccess('✅ WhatsApp connected successfully!');
                    clearInterval(restoreInterval);
                    if (user?.id) {
                      loadContacts(user.id);
                    }
                  } else if (qrData.status === 'qr_generated' && qrData.qr) {
                    // New QR generated (restoration failed, showing new QR)
                    setQrCode(qrData.qr);
                    setSuccess('📱 Scan QR code with WhatsApp to connect');
                    clearInterval(restoreInterval);
                    // Start QR polling instead
                    startQrPolling();
                  } else if (!qrData.connecting && qrData.status !== 'restoring' || pollCount >= maxPolls) {
                    // No longer connecting or timeout - restoration failed
                    clearInterval(restoreInterval);
                    setError('⚠️ Session restoration failed. Please generate a new QR code.');
                    setConnected(false);
                    setQrCode('');
                  }
                }
              } catch (err) {
                console.error('Status check error:', err);
                if (pollCount >= maxPolls) {
                  clearInterval(restoreInterval);
                  setError('⚠️ Connection timeout. Please try again.');
                }
              }
            }, 2000);
            (window as any).statusCheckInterval = restoreInterval;
            break;

          case 'qr_generated':
            // Fresh connection, QR code generated
            setQrCode(data.qr);
            setConnected(false);
            setSuccess('📱 Scan QR code with WhatsApp to connect');
            // Clear manual disconnect flag since user is attempting to connect
            setManuallyDisconnected(false);
            sessionStorage.removeItem('manuallyDisconnected');
            
            // Poll for connection status and QR updates
            const startQrPolling = () => {
              const qrInterval = setInterval(async () => {
                try {
                  // Fetch QR endpoint to get updated QR code
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
                      setSuccess('✅ WhatsApp connected successfully!');
                      clearInterval(qrInterval);
                      if (user?.id) {
                        loadContacts(user.id);
                      }
                    } else if (qrData.status === 'qr_generated' && qrData.qr) {
                      // Update QR code if it changed (WhatsApp generates new QR periodically)
                      if (qrData.qr !== qrCode) {
                        console.log('📱 QR code updated');
                        setQrCode(qrData.qr);
                      }
                    }
                  }
                } catch (err) {
                  console.error('QR polling error:', err);
                }
              }, 3000); // Poll every 3 seconds
              (window as any).statusCheckInterval = qrInterval;
            };
            
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
        // Set flag to prevent auto-restore on page reload
        setManuallyDisconnected(true);
        sessionStorage.setItem('manuallyDisconnected', 'true');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to logout');
      }
    } catch (err) {
      setError('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = async () => {
    if (!confirm('This will delete stored WhatsApp credentials for your account and force a fresh QR generation. Continue?')) return;
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
        setSuccess('✅ Credentials cleared. Generate a new QR to reconnect.');
        // Refresh user data
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

  const handleSelectContactFromPicker = (contact: any) => {
    setMessageData({ ...messageData, phoneNumber: contact.phoneNumber });
    setIsContactPickerOpen(false);
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

    // Validate based on send mode
    if (bulkSendMode === 'text' && !messageData.message) {
      setError('Please enter a message');
      return;
    }
    if (bulkSendMode === 'file' && !bulkFile) {
      setError('Please select a file');
      return;
    }
    if (bulkSendMode === 'both' && !messageData.message && !bulkFile) {
      setError('Please enter a message or select a file');
      return;
    }

    setError('');
    setSuccess('');
    setSendLoading(true);

    let successCount = 0;
    let failCount = 0;

    try {
      for (const contact of selectedContacts) {
        try {
          const formData = new FormData();
          formData.append('userId', user?.id?.toString() || '1');
          formData.append('phoneNumber', contact.phoneNumber);
          
          // Add message based on mode
          if ((bulkSendMode === 'text' || bulkSendMode === 'both') && messageData.message) {
            formData.append('message', messageData.message);
          }
          
          // Add file based on mode
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
          
          // 1 second delay between messages
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          failCount++;
        }
      }

      setSuccess(`Messages sent! Success: ${successCount}, Failed: ${failCount}`);
      
      // Refresh user data to update credits
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
      setError('Failed to send messages. Please try again.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', user?.id?.toString() || '1');
      formData.append('phoneNumber', messageData.phoneNumber);
      if (messageData.message) {
        formData.append('message', messageData.message);
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
        setSuccess('Message sent successfully!');
        
        // Refresh user data to update credits
        if (user?.id) {
          await refreshUserData(user.id);
          await loadContacts(user.id);
        }
        
        // Add to messages list
        setMessages([...messages, {
          to: messageData.phoneNumber,
          text: messageData.message,
          file: selectedFile?.name,
          timestamp: new Date(),
          status: 'sent'
        }]);
        
        // If a contact was created/updated, refresh chat
        if (selectedContact && selectedContact.phoneNumber === messageData.phoneNumber) {
          await loadChatMessages(selectedContact.id, selectedContact.phoneNumber);
        }
        
        setMessageData({ phoneNumber: '', message: '' });
        setSelectedFile(null);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSendLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            WhatsApp Messenger & QR Pairing
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect your device via QR and broadcast individual or multi-contact messages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* WhatsApp Connection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">WhatsApp Connection</h2>
                <div className="flex items-center gap-3">
                  {connected ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <Wifi className="w-5 h-5" />
                      <span className="text-sm">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-sm">Disconnected</span>
                    </div>
                  )}
                  {connected && (
                    <>
                      <Link
                        href="/dashboard/inbox"
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Inbox
                      </Link>
                      <button
                        onClick={loadIncomingMessages}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
                      >
                        All Messages
                      </button>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-lg mb-4 text-sm">
                  {success}
                </div>
              )}

              {qrCode && (
                <div className="mb-4 p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code" className="w-full" />
                  <p className="text-center text-gray-600 text-sm mt-2">
                    <strong>Scan this QR code with WhatsApp</strong>
                  </p>
                  <p className="text-center text-gray-500 text-xs mt-1">
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                </div>
              )}

              {loading && !qrCode && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <p className="text-blue-400 text-sm">
                      Checking for saved session...
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {!connected ? (
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Connect WhatsApp
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleLogoutWhatsApp}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        Disconnect WhatsApp
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-3">
                <button
                  onClick={handleClearCredentials}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Clear cache
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
              </div>
            </div>
          </div>

          {/* Send Message */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Send Message</h2>
                <button
                  onClick={() => setIsBulkSendOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Bulk Send
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number (with country code)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={messageData.phoneNumber}
                      onChange={(e) => setMessageData({ ...messageData, phoneNumber: e.target.value })}
                      className="w-full pl-10 pr-10 p-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition text-white"
                      placeholder="919876543210"
                    />
                    <button
                      type="button"
                      onClick={() => setIsContactPickerOpen(true)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <Users className="w-5 h-5 text-green-400 hover:text-green-300 cursor-pointer" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Format: Country code + number (e.g., 919876543210)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message (optional if sending file only)
                  </label>
                  <textarea
                    value={messageData.message}
                    onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition text-white resize-none"
                    placeholder="Type your message..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Attach File (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700/50 border border-gray-600/50 rounded-lg cursor-pointer hover:border-green-500/50 transition">
                      <File className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {selectedFile ? selectedFile.name : 'Choose file'}
                      </span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                      />
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition"
                      >
                        <XCircle className="w-5 h-5 text-red-400" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Images, videos, documents supported</p>
                </div>

                <button
                  type="submit"
                  disabled={sendLoading || !connected || (!messageData.message && !selectedFile)}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>

                {!connected && (
                  <p className="text-yellow-400 text-sm text-center">
                    Please connect your WhatsApp first to send messages
                  </p>
                )}
              </form>
            </div>

            {/* Chat History */}
            {selectedContact && (
              <div className="mt-6 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
                <h3 className="text-lg font-bold text-white mb-4">
                  Chat with {selectedContact.name}
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No messages yet</p>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.isFromMe
                              ? 'bg-green-600/20 border border-green-500/50'
                              : 'bg-gray-700/50 border border-gray-600/50'
                          }`}
                        >
                          {msg.message && (
                            <p className="text-white text-sm">{msg.message}</p>
                          )}
                          {msg.mediaUrl && (
                            <div className="flex items-center gap-2 mt-1 text-blue-400 text-xs">
                              <File className="w-3 h-3" />
                              <span>{msg.mediaUrl}</span>
                            </div>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Picker Modal */}
        {isContactPickerOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Select Contact</h2>
              <button onClick={() => setIsContactPickerOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredContacts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No contacts found</p>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContactFromPicker(contact)}
                    className="p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg cursor-pointer transition"
                  >
                    <p className="text-white font-medium">{contact.name}</p>
                    <p className="text-gray-400 text-sm">+{contact.phoneNumber}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Modal */}
      {isBulkSendOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Bulk Send Message</h2>
              <button onClick={() => { setIsBulkSendOpen(false); setSelectedContacts([]); setBulkFile(null); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={selectAllContacts}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                >
                  Select All
                </button>
                <button
                  onClick={unselectAllContacts}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                >
                  Unselect All
                </button>
              </div>
              
              {selectedContacts.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                  <p className="text-blue-400 text-sm font-medium">
                    {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedContacts.map((contact) => (
                      <span key={contact.id} className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {contact.name}
                        <button onClick={() => toggleContactSelection(contact)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredContacts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No contacts found</p>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.find(c => c.id === contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleContactSelection(contact)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'bg-green-600/20 border border-green-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleContactSelection(contact)}
                          className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{contact.name}</p>
                          <p className="text-gray-400 text-sm">+{contact.phoneNumber}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-green-400" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-700 space-y-3">
              {/* Send Mode Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkSendMode('both')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    bulkSendMode === 'both'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Text + File
                </button>
                <button
                  onClick={() => setBulkSendMode('text')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    bulkSendMode === 'text'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Text Only
                </button>
                <button
                  onClick={() => setBulkSendMode('file')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    bulkSendMode === 'file'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  File Only
                </button>
              </div>

              {/* Message Input */}
              {(bulkSendMode === 'both' || bulkSendMode === 'text') && (
                <textarea
                  value={messageData.message}
                  onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Type your message..."
                  rows={3}
                />
              )}

              {/* File Input */}
              {(bulkSendMode === 'both' || bulkSendMode === 'file') && (
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:border-green-500/50 transition">
                    <File className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      {bulkFile ? bulkFile.name : 'Choose file'}
                    </span>
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
                      className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition"
                    >
                      <XCircle className="w-5 h-5 text-red-400" />
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsBulkSendOpen(false); setSelectedContacts([]); setBulkFile(null); }}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSend}
                  disabled={sendLoading || selectedContacts.length === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to {selectedContacts.length}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Incoming Messages</h2>
              <button
                onClick={() => setShowInbox(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {incomingMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No incoming messages yet</p>
                </div>
              ) : (
                incomingMessages.map((msg) => (
                  <div key={msg.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 font-semibold">{msg.phoneNumber}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{msg.message}</p>
                    {msg.mediaType && (
                      <div className="mt-2 text-sm text-gray-400 flex items-center gap-1">
                        {msg.mediaType === 'image' && <Image className="w-4 h-4" />}
                        {msg.mediaType === 'document' && <File className="w-4 h-4" />}
                        <span className="capitalize">{msg.mediaType}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowInbox(false)}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
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
