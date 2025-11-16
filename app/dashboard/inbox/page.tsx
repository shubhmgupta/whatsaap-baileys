'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Phone, Loader2, Search, User, Image as ImageIcon, File, FileText, Music, Video, Download } from 'lucide-react';
import Link from 'next/link';

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
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadContacts(parsedUser.id);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setShowChat(true);
      loadMessages(selectedContact.id, selectedContact.phoneNumber);
      // Auto-refresh messages every 3 seconds
      const interval = setInterval(() => {
        loadMessages(selectedContact.id, selectedContact.phoneNumber);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadContacts = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: number, phoneNumber: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/messages?userId=${user?.id}&phoneNumber=${phoneNumber}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact || !user) return;

    setSendLoading(true);
    try {
      if (selectedFile) {
        // Send file
        const formData = new FormData();
        formData.append('userId', user.id.toString());
        formData.append('phoneNumber', selectedContact.phoneNumber);
        formData.append('message', newMessage || '');
        formData.append('file', selectedFile);

        const res = await fetch('/api/message/send', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setNewMessage('');
          setSelectedFile(null);
          await loadMessages(selectedContact.id, selectedContact.phoneNumber);
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to send message');
        }
      } else {
        // Send text only
        const res = await fetch('/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            phoneNumber: selectedContact.phoneNumber,
            message: newMessage,
          }),
        });

        if (res.ok) {
          setNewMessage('');
          await loadMessages(selectedContact.id, selectedContact.phoneNumber);
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSendLoading(false);
    }
  };

  const getMediaIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const renderMedia = (msg: Message) => {
    if (!msg.mediaUrl) return null;

    switch (msg.mediaType) {
      case 'image':
        return (
          <div className="mt-2">
            <div className="relative group">
              <img
                src={msg.mediaUrl}
                alt="Shared image"
                className="max-w-[200px] max-h-[150px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(msg.mediaUrl!, '_blank')}
              />
              <a
                href={msg.mediaUrl}
                download
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3 h-3 text-white" />
              </a>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => window.open(msg.mediaUrl!, '_blank')}
                className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-black/20 rounded hover:bg-black/30 transition text-xs"
              >
                <ImageIcon className="w-3 h-3" />
                View Full
              </button>
              <a
                href={msg.mediaUrl}
                download
                className="flex-1 flex items-center justify-center gap-1 p-1.5 bg-black/20 rounded hover:bg-black/30 transition text-xs"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="mt-2">
            <video
              src={msg.mediaUrl}
              controls
              className="max-w-full max-h-[300px] sm:max-h-[400px] rounded-lg"
            />
            <a
              href={msg.mediaUrl}
              download
              className="flex items-center justify-center gap-2 p-2 bg-black/20 rounded hover:bg-black/30 transition text-xs mt-2"
            >
              <Download className="w-3 h-3" />
              Download Video
            </a>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2">
            <audio src={msg.mediaUrl} controls className="w-full" />
            <a
              href={msg.mediaUrl}
              download
              className="flex items-center justify-center gap-2 p-2 bg-black/20 rounded hover:bg-black/30 transition text-xs mt-2"
            >
              <Download className="w-3 h-3" />
              Download Audio
            </a>
          </div>
        );
      default:
        return (
          <a
            href={msg.mediaUrl}
            download
            className="mt-2 flex items-center gap-2 p-2 bg-black/20 rounded hover:bg-black/30 transition"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download {msg.mediaType}</span>
          </a>
        );
    }
  };

  const filteredContacts = contacts.filter(contact => 
    (contact.name || contact.phoneNumber).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactDisplayName = (contact: Contact) => {
    return contact.name || contact.phoneNumber;
  };

  const handleBackToContacts = () => {
    setShowChat(false);
    setSelectedContact(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/messages"
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Inbox</h1>
            </div>
            <div className="text-sm text-gray-400">
              {user.email}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          {/* Contacts List */}
          <div className={`lg:col-span-1 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 flex flex-col overflow-hidden ${
            showChat ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="p-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-3">Contacts</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                  <User className="w-12 h-12 mb-2 opacity-50" />
                  <p>No contacts found</p>
                  <p className="text-sm mt-1">Contacts will appear here when you receive messages</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full p-4 text-left hover:bg-gray-700/30 transition ${
                        selectedContact?.id === contact.id ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {getContactDisplayName(contact).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">
                            {getContactDisplayName(contact)}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phoneNumber}
                          </div>
                        </div>
                      </div>
                      {contact.lastMessageAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(contact.lastMessageAt).toLocaleString()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 flex flex-col overflow-hidden ${
            showChat ? 'flex' : 'hidden lg:flex'
          }`}>
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700/50 bg-gray-800/80">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToContacts}
                      className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition -ml-2"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {getContactDisplayName(selectedContact).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {getContactDisplayName(selectedContact)}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedContact.phoneNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.isFromMe
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {msg.message && (
                            <p className="text-sm break-words">{msg.message}</p>
                          )}
                          
                          {msg.mediaType && msg.mediaUrl && (
                            <div className="mt-2">
                              {renderMedia(msg)}
                            </div>
                          )}
                          
                          {msg.mediaType && !msg.mediaUrl && (
                            <div className="flex items-center gap-2 text-xs opacity-75 mt-1">
                              {getMediaIcon(msg.mediaType)}
                              <span className="capitalize">{msg.mediaType}</span>
                            </div>
                          )}
                          
                          <p className="text-xs opacity-75 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700/50">
                  {selectedFile && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <File className="w-4 h-4" />
                        <span>{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition cursor-pointer flex items-center gap-2">
                      <File className="w-5 h-5" />
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                        disabled={sendLoading}
                      />
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={sendLoading}
                    />
                    <button
                      type="submit"
                      disabled={sendLoading || (!newMessage.trim() && !selectedFile)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">Select a contact to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
