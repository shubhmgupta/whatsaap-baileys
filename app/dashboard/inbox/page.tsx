'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowDown,
  Send, 
  Phone, 
  Loader2, 
  Search, 
  User, 
  Image as ImageIcon, 
  File as FileIcon, 
  FileText, 
  Music, 
  Video, 
  Download,
  Paperclip,
  X,
  RefreshCw,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCheck
} from 'lucide-react';
import Link from 'next/link';
import ChatMessageMedia from '@/components/ChatMessageMedia';

interface Contact {
  id: number;
  phoneNumber: string;
  name: string | null;
  lastMessageAt: string;
}

interface Message {
  id: number;
  message: string;
  isFromMe: boolean;
  timestamp: string;
  mediaType: string | null;
  mediaUrl: string | null;
}

function formatChatDate(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledUpRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const justSentRef = useRef(false);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadContacts(parsedUser.id);

      // Periodically refresh contact list every 12 seconds to discover new inbound chats
      const contactInterval = setInterval(() => {
        loadContacts(parsedUser.id, false);
      }, 12000);
      return () => clearInterval(contactInterval);
    }
  }, []);

  useEffect(() => {
    if (selectedContact && user) {
      setShowChat(true);
      // Reset scroll tracking flags when switching contact
      isInitialLoadRef.current = true;
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);

      loadMessages(selectedContact.id, selectedContact.phoneNumber);
      
      // Auto-refresh messages every 3 seconds for active conversation
      const interval = setInterval(() => {
        loadMessages(selectedContact.id, selectedContact.phoneNumber);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedContact, user]);

  useEffect(() => {
    // Initial contact open or when message was just sent: scroll immediately to bottom
    if (isInitialLoadRef.current || justSentRef.current) {
      scrollToBottom('auto');
      isInitialLoadRef.current = false;
      justSentRef.current = false;
      return;
    }

    // On background polling/inbound message:
    // ONLY scroll down if the user is already at the bottom.
    // If the user scrolled up to read earlier messages, do NOT yank them down!
    if (!userScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Check how many pixels the user is from the bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user is more than 90px away from bottom, they are viewing earlier messages
    const isScrolledUp = distanceFromBottom > 90;
    userScrolledUpRef.current = isScrolledUp;
    setShowScrollBottom(isScrolledUp);
  };

  const loadContacts = async (userId: number, showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/contacts?userId=${userId}&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadMessages = async (contactId: number, phoneNumber: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}/messages?userId=${user.id}&phoneNumber=${phoneNumber}`);
      if (res.ok) {
        const data = await res.json();
        const incoming: Message[] = data.messages || [];
        setMessages((prev) => {
          // Compare length and last message ID to avoid unnecessary state changes/re-renders
          if (
            prev.length === incoming.length &&
            (prev.length === 0 || prev[prev.length - 1].id === incoming[incoming.length - 1].id)
          ) {
            return prev;
          }
          return incoming;
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact || !user) return;

    setSendLoading(true);
    try {
      if (selectedFile) {
        // Send file + optional text
        const formData = new FormData();
        formData.append('userId', user.id.toString());
        formData.append('phoneNumber', selectedContact.phoneNumber);
        if (newMessage.trim()) {
          formData.append('message', newMessage.trim());
        }
        formData.append('file', selectedFile);

        const res = await fetch('/api/message/send', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setNewMessage('');
          clearSelectedFile();
          justSentRef.current = true;
          userScrolledUpRef.current = false;
          setShowScrollBottom(false);
          await loadMessages(selectedContact.id, selectedContact.phoneNumber);
          scrollToBottom('smooth');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to dispatch message');
        }
      } else {
        // Send text only
        const res = await fetch('/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            phoneNumber: selectedContact.phoneNumber,
            message: newMessage.trim(),
          }),
        });

        if (res.ok) {
          setNewMessage('');
          justSentRef.current = true;
          userScrolledUpRef.current = false;
          setShowScrollBottom(false);
          await loadMessages(selectedContact.id, selectedContact.phoneNumber);
          scrollToBottom('smooth');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to dispatch message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSendLoading(false);
    }
  };

  const renderMedia = (msg: Message) => {
    if (!msg.mediaUrl) return null;
    return (
      <div className="mt-2">
        <ChatMessageMedia
          mediaUrl={msg.mediaUrl}
          mediaType={msg.mediaType}
          caption={msg.message}
          isFromMe={msg.isFromMe}
        />
      </div>
    );
  };

  const filteredContacts = contacts.filter(contact => 
    (contact.name || contact.phoneNumber).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactDisplayName = (contact: Contact) => {
    return contact.name || `+${contact.phoneNumber}`;
  };

  const handleBackToContacts = () => {
    setShowChat(false);
    setSelectedContact(null);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-time Chat Stream</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Live Chat Inbox
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-way conversations and incoming WhatsApp messages synced in real time
          </p>
        </div>

        <button
          onClick={() => user && loadContacts(user.id, true)}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition"
          title="Refresh contacts"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-210px)] min-h-[520px]">
        {/* Left Contacts Sidebar (4 columns) */}
        <div className={`lg:col-span-4 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl ${
          showChat ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search Contacts */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Conversations</h2>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {contacts.length} chats
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Contact Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center p-6 space-y-2">
                <User className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium text-slate-400">No conversations yet</p>
                <p className="text-[11px] text-slate-500">
                  When recipients message your WhatsApp number, they will automatically appear here.
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 text-left transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                      {getContactDisplayName(contact).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                          {getContactDisplayName(contact)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        +{contact.phoneNumber}
                      </p>
                      {contact.lastMessageAt && (
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{formatChatDate(contact.lastMessageAt)}</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Pane (8 columns) */}
        <div className={`lg:col-span-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl ${
          showChat ? 'flex' : 'hidden lg:flex'
        }`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToContacts}
                    className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {getContactDisplayName(selectedContact).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {getContactDisplayName(selectedContact)}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">+{selectedContact.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <a
                    href={`tel:+${selectedContact.phoneNumber}`}
                    className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition"
                    title="Audio Call (Phone Dialer)"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${selectedContact.phoneNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition"
                    title="WhatsApp Call / Direct App Link"
                  >
                    <Video className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => loadMessages(selectedContact.id, selectedContact.phoneNumber)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                    title="Refresh conversation"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Timeline */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 relative scroll-smooth"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-2">
                    <MessageSquare className="w-10 h-10 opacity-30" />
                    <p className="text-xs">No messages recorded in this chat.</p>
                    <p className="text-[11px]">Type below to send a WhatsApp message.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-sm shadow-md ${
                          msg.isFromMe
                            ? 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                        }`}
                      >
                        {msg.message && msg.message !== 'Media message' && (
                          <p className="leading-relaxed break-words">{msg.message}</p>
                        )}
                        
                        {msg.mediaUrl && renderMedia(msg)}

                        <div className="flex items-center justify-end gap-1 text-[10px] opacity-60 mt-1.5 font-mono">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.isFromMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />

                {/* Floating "Scroll to Bottom / Latest Messages" button */}
                {showScrollBottom && (
                  <div className="sticky bottom-2 flex justify-end pointer-events-none pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        userScrolledUpRef.current = false;
                        setShowScrollBottom(false);
                        scrollToBottom('smooth');
                      }}
                      className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 text-xs font-semibold shadow-2xl backdrop-blur transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 hover:scale-105"
                      title="Jump to latest messages"
                    >
                      <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                      <span>Latest messages</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Composer Form */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/90">
                {selectedFile && (
                  <div className="mb-3 p-3 bg-slate-800/90 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <FileIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    disabled={sendLoading}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
                    title="Attach Media / Document"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a WhatsApp message..."
                    className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                    disabled={sendLoading}
                  />

                  <button
                    type="submit"
                    disabled={sendLoading || (!newMessage.trim() && !selectedFile)}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {sendLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Select a Conversation</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Choose a contact from the left panel to read and reply to WhatsApp messages in real time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
