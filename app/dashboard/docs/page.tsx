'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, Copy, Check, ChevronDown, ChevronUp, Terminal, Code2, Zap } from 'lucide-react';

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('auth-qr');

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const CodeBlock = ({ code, id, language = 'bash' }: { code: string; id: string; language?: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 rounded-t">
        <span className="text-xs text-gray-400 uppercase">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-gray-400 hover:text-white transition"
        >
          {copiedCode === id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="bg-gray-950 p-4 rounded-b overflow-x-auto">
        <code className="text-sm text-green-400">{code}</code>
      </pre>
    </div>
  );

  const Section = ({ id, title, method, endpoint, description, children }: any) => {
    const isExpanded = expandedSection === id;
    const methodColors: any = {
      'GET': 'bg-blue-500',
      'POST': 'bg-green-500',
      'PUT': 'bg-yellow-500',
      'DELETE': 'bg-red-500'
    };

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/70 transition rounded-xl"
        >
          <div className="flex items-center gap-4">
            <span className={`${methodColors[method]} px-3 py-1 rounded text-xs font-bold text-white`}>
              {method}
            </span>
            <div className="text-left">
              <code className="text-blue-400">{endpoint}</code>
              <p className="text-sm text-gray-400 mt-1">{description}</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {isExpanded && (
          <div className="p-6 border-t border-gray-700/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Code2 className="w-10 h-10 text-purple-400" />
            Third-Party API Integration (v1)
          </h1>
          <p className="text-gray-400">Complete API documentation for external integrations with Bearer token authentication</p>
        </div>

        {/* Quick Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <Zap className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-2">v1 API Base URL</h2>
              <code className="bg-gray-900 px-4 py-2 rounded block text-green-400">
                http://localhost:3000/api/v1
              </code>
              <p className="text-gray-400 mt-3 text-sm">
                All v1 API requests use <strong className="text-purple-400">Bearer token authentication</strong>. 
                No <code className="text-red-400">userId</code> required in requests!
              </p>
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <p className="text-sm text-blue-400 font-semibold">🔑 Get Your API Token</p>
                <p className="text-sm text-gray-400 mt-1">
                  Generate your API token from the Dashboard → API Tokens page
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">📋 Table of Contents</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <a href="#v1-authentication" className="text-blue-400 hover:text-blue-300">1. Authentication & Connection</a>
            <a href="#v1-messages" className="text-blue-400 hover:text-blue-300">2. Send Messages</a>
            <a href="#v1-contacts" className="text-blue-400 hover:text-blue-300">3. Contacts Management</a>
            <a href="#v1-best-practices" className="text-blue-400 hover:text-blue-300">4. Best Practices</a>
          </div>
        </div>

        {/* 1. AUTHENTICATION SECTION */}
        <div id="v1-authentication" className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-purple-400" />
            1. Authentication & Connection
          </h2>
          <p className="text-gray-400 mb-6">
            All v1 endpoints require Bearer token authentication. Follow these steps to connect and manage WhatsApp sessions.
          </p>

          {/* Generate QR Code */}
          <Section
            id="v1-auth-qr"
            title="Generate QR Code"
            method="POST"
            endpoint="/api/v1/auth/qr"
            description="Generate QR code using API token - no userId needed"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔑 Authentication Header</h4>
                <CodeBlock
                  id="v1-auth-header"
                  code={`Authorization: Bearer YOUR_API_TOKEN`}
                  language="http"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-qr-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/auth/qr \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response (QR Generated)</h4>
                <CodeBlock
                  id="v1-qr-response"
                  code={`{
  "qr": "2@xxx...",
  "status": "qr_generated",
  "message": "Scan QR code to connect"
}`}
                  language="json"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response (Auto-Restored)</h4>
                <CodeBlock
                  id="v1-qr-restored"
                  code={`{
  "message": "Connected successfully using saved session",
  "status": "auto_connected",
  "connected": true,
  "user": "+919876543210"
}`}
                  language="json"
                />
                <p className="text-sm text-gray-400 mt-2">
                  ℹ️ If you previously connected and a database backup exists, the session will auto-restore without needing a QR scan.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">❌ Error Response (Invalid Token)</h4>
                <CodeBlock
                  id="v1-qr-error"
                  code={`{
  "error": "Invalid API token"
}`}
                  language="json"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">📱 Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                  <li>Display the QR code to the end user</li>
                  <li>User opens WhatsApp → Settings → Linked Devices → Link a Device</li>
                  <li>Scan the QR code with phone camera</li>
                  <li>Poll <code className="text-blue-400">/api/v1/auth/status</code> every 2-3 seconds to check connection</li>
                </ol>
              </div>
            </div>
          </Section>

          {/* Check Connection Status */}
          <Section
            id="v1-auth-status"
            title="Check Connection Status"
            method="GET"
            endpoint="/api/v1/auth/status"
            description="Check WhatsApp connection status using API token"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-status-curl"
                  code={`curl -X GET http://localhost:3000/api/v1/auth/status \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Response (Connected)</h4>
                <CodeBlock
                  id="v1-status-connected"
                  code={`{
  "connected": true,
  "user": "+919876543210",
  "status": "active",
  "socketExists": true
}`}
                  language="json"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚠️ Response (Not Connected)</h4>
                <CodeBlock
                  id="v1-status-disconnected"
                  code={`{
  "connected": false,
  "user": null,
  "socketExists": false
}`}
                  language="json"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">💡 Usage Tips:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>Poll this endpoint every 2-3 seconds while waiting for QR scan</li>
                  <li>Once <code className="text-blue-400">connected: true</code>, stop polling and proceed to send messages</li>
                  <li>Use this to verify connection before sending messages</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Auto-Restore Session */}
          <Section
            id="v1-auth-restore"
            title="Auto-Restore Session"
            method="POST"
            endpoint="/api/v1/auth/restore"
            description="Automatically restore session from database without QR code"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-restore-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/auth/restore \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response (Restored)</h4>
                <CodeBlock
                  id="v1-restore-success"
                  code={`{
  "status": "restored",
  "connected": true,
  "user": "+919876543210"
}`}
                  language="json"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚠️ Response (No Backup)</h4>
                <CodeBlock
                  id="v1-restore-no-backup"
                  code={`{
  "status": "no_backup",
  "message": "No session backup found in database"
}`}
                  language="json"
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">🔄 When to Use:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>Call this on app startup to auto-restore without QR code</li>
                  <li>If <code className="text-blue-400">status: "restored"</code>, session is active (no QR needed)</li>
                  <li>If <code className="text-blue-400">status: "no_backup"</code>, user needs to scan QR code</li>
                  <li>Recommended: Try restore first, then fall back to QR if no backup exists</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Disconnect WhatsApp */}
          <Section
            id="v1-auth-disconnect"
            title="Disconnect WhatsApp"
            method="POST"
            endpoint="/api/v1/auth/disconnect"
            description="Logout from WhatsApp and invalidate session"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-logout-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/auth/disconnect \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response</h4>
                <CodeBlock
                  id="v1-logout-success"
                  code={`{
  "message": "WhatsApp disconnected successfully. Session invalidated."
}`}
                  language="json"
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">⚠️ Important:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>This completely logs out from WhatsApp (phone will show "Device disconnected")</li>
                  <li>Deletes session files from disk and database backup</li>
                  <li>Next connection will require fresh QR code scan</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Restart Session */}
          <Section
            id="v1-auth-restart"
            title="Restart Session"
            method="POST"
            endpoint="/api/v1/auth/restart"
            description="Clear session and restart clean (force QR rescan)"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-restart-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/auth/restart \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response</h4>
                <CodeBlock
                  id="v1-restart-success"
                  code={`{
  "message": "Session cleared successfully. Please scan QR code again.",
  "success": true
}`}
                  language="json"
                />
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">🔄 When to Use:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>Use this when connection is stuck or corrupted</li>
                  <li>Forces a clean reconnection with new QR code</li>
                  <li>Different from disconnect - clears all session data</li>
                </ul>
              </div>
            </div>
          </Section>
        </div>

        {/* 2. MESSAGES SECTION */}
        <div id="v1-messages" className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Code2 className="w-8 h-8 text-blue-400" />
            2. Send Messages
          </h2>
          <p className="text-gray-400 mb-6">
            Send text messages, images, videos, audio, and documents to WhatsApp contacts using API token authentication.
          </p>

          {/* Send Text Message */}
          <Section
            id="v1-message-send"
            title="Send Message"
            method="POST"
            endpoint="/api/v1/message/send"
            description="Send WhatsApp messages using API token - supports text and media"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">📝 Request Body (Text)</h4>
                <CodeBlock
                  id="v1-send-body"
                  code={`{
  "phoneNumber": "919876543210",
  "message": "Hello from v1 API!"
}`}
                  language="json"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example (Text)</h4>
                <CodeBlock
                  id="v1-send-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "919876543210",
    "message": "Hello from v1 API!"
  }'`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">📎 Send Image (FormData)</h4>
                <CodeBlock
                  id="v1-send-image-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "phoneNumber=919876543210" \\
  -F "message=Check this out!" \\
  -F "file=@image.jpg"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">📎 Send Document</h4>
                <CodeBlock
                  id="v1-send-doc-curl"
                  code={`curl -X POST http://localhost:3000/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "phoneNumber=919876543210" \\
  -F "message=Here's your document" \\
  -F "file=@document.pdf"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response</h4>
                <CodeBlock
                  id="v1-send-response"
                  code={`{
  "message": "Message sent successfully",
  "contactId": 123,
  "remainingCredits": 99
}`}
                  language="json"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">❌ Error Response (Not Connected)</h4>
                <CodeBlock
                  id="v1-send-error"
                  code={`{
  "error": "WhatsApp not connected. Unable to restore session. Please connect via dashboard.",
  "needsQR": true
}`}
                  language="json"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">📞 Phone Number Format:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>Include country code without + symbol: <code className="text-green-400">919876543210</code></li>
                  <li>Or use WhatsApp JID format: <code className="text-green-400">919876543210@s.whatsapp.net</code></li>
                  <li>Example: India number <code className="text-green-400">+91 98765 43210</code> → <code className="text-green-400">919876543210</code></li>
                </ul>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
                <h4 className="font-semibold mb-2">📎 Supported File Types:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li><strong>Images:</strong> JPG, PNG, GIF, WebP</li>
                  <li><strong>Videos:</strong> MP4, MKV, AVI, MOV</li>
                  <li><strong>Audio:</strong> MP3, WAV, OGG, AAC</li>
                  <li><strong>Documents:</strong> PDF, DOC, DOCX, XLS, XLSX, ZIP, etc.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Get Incoming Messages */}
          <Section
            id="v1-message-incoming"
            title="Get Incoming Messages"
            method="GET"
            endpoint="/api/v1/messages/incoming"
            description="Retrieve incoming messages using API token"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-incoming-curl"
                  code={`curl -X GET http://localhost:3000/api/v1/messages/incoming \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response</h4>
                <CodeBlock
                  id="v1-incoming-success"
                  code={`{
  "messages": [
    {
      "key": {
        "remoteJid": "919876543210@s.whatsapp.net",
        "fromMe": false,
        "id": "3EB0C2F5E..."
      },
      "message": {
        "conversation": "Hello! How can I help you?"
      },
      "messageTimestamp": 1700000000,
      "pushName": "John Doe"
    }
  ]
}`}
                  language="json"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* 3. CONTACTS SECTION */}
        <div id="v1-contacts" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">3. Contacts Management</h2>

          {/* List Contacts */}
          <Section
            id="v1-contacts-list"
            title="List All Contacts"
            method="GET"
            endpoint="/api/v1/contacts"
            description="Get all WhatsApp contacts using API token"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">🔧 cURL Example</h4>
                <CodeBlock
                  id="v1-contacts-curl"
                  code={`curl -X GET http://localhost:3000/api/v1/contacts \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Success Response</h4>
                <CodeBlock
                  id="v1-contacts-success"
                  code={`{
  "contacts": [
    {
      "id": 1,
      "phoneNumber": "919876543210",
      "name": "John Doe",
      "lastMessage": "Hello!",
      "lastMessageAt": "2025-11-16T10:30:00.000Z",
      "unreadCount": 2,
      "createdAt": "2025-11-15T08:00:00.000Z"
    }
  ]
}`}
                  language="json"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Common Errors */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">❌ Common Errors</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-red-400 mb-2">401 - Invalid API token</h3>
              <p className="text-sm text-gray-400 mb-2">
                Solution: Verify your API token is correct. Generate a new one from Dashboard → API Tokens if needed.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-2">400 - WhatsApp not connected</h3>
              <p className="text-sm text-gray-400 mb-2">
                Solution: Call <code className="text-blue-400">/api/v1/auth/qr</code> to generate QR code or <code className="text-blue-400">/api/v1/auth/restore</code> to auto-restore
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-2">402 - Insufficient credits</h3>
              <p className="text-sm text-gray-400 mb-2">
                Solution: Purchase more credits through the dashboard
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-2">400 - Recipient not on WhatsApp</h3>
              <p className="text-sm text-gray-400 mb-2">
                Solution: Verify the phone number is correct and registered on WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div id="v1-best-practices" className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">✨ Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✅ Auto-Restore on Startup</h3>
              <p className="text-sm text-gray-400">
                Call <code className="text-blue-400">/api/v1/auth/restore</code> when your app starts to seamlessly reconnect without QR scan
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">📊 Poll Status During QR Scan</h3>
              <p className="text-sm text-gray-400">
                Poll <code className="text-blue-400">/api/v1/auth/status</code> every 2-3 seconds until <code className="text-green-400">connected: true</code>
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">💾 Sessions Auto-Save</h3>
              <p className="text-sm text-gray-400">
                Sessions automatically backup to database. Users can restore anytime without rescan QR code
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">🔄 Handle Disconnects Gracefully</h3>
              <p className="text-sm text-gray-400">
                Check <code className="text-blue-400">needsQR: true</code> in error responses and prompt user to reconnect
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-pink-400 mb-2">🔑 Secure Your Token</h3>
              <p className="text-sm text-gray-400">
                Never expose API tokens in client-side code. Use server-side proxy for frontend apps
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-indigo-400 mb-2">⚡ Check Credits Before Sending</h3>
              <p className="text-sm text-gray-400">
                The send message response includes <code className="text-blue-400">remainingCredits</code>. Monitor to prevent failures
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">🎯 Recommended Integration Flow</h4>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Try <code className="text-blue-400">POST /api/v1/auth/restore</code> first</li>
              <li>If no backup, call <code className="text-blue-400">POST /api/v1/auth/qr</code> to get QR code</li>
              <li>Poll <code className="text-blue-400">GET /api/v1/auth/status</code> every 2-3 seconds</li>
              <li>Once connected, start sending messages with <code className="text-blue-400">POST /api/v1/message/send</code></li>
              <li>Get incoming messages periodically with <code className="text-blue-400">GET /api/v1/messages/incoming</code></li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">📚 Integration Examples</h4>
            <p className="text-sm text-gray-400 mb-3">
              View complete integration examples in multiple languages:
            </p>
            <div className="grid md:grid-cols-3 gap-2">
              <div className="text-sm">
                <strong className="text-white">JavaScript/Node.js</strong>
                <p className="text-gray-400 text-xs mt-1">Axios, Fetch API</p>
              </div>
              <div className="text-sm">
                <strong className="text-white">Python</strong>
                <p className="text-gray-400 text-xs mt-1">Requests library</p>
              </div>
              <div className="text-sm">
                <strong className="text-white">PHP</strong>
                <p className="text-gray-400 text-xs mt-1">cURL, Guzzle</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
