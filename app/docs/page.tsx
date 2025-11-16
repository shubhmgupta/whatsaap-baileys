'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, Code, Copy, Check, Key, ArrowRight, Lock, QrCode, Send, FileText, Image, Video, FileAudio, Smartphone } from 'lucide-react';

export default function PublicDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Codefy';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl');

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const CodeTab = ({ lang, label }: { lang: typeof selectedLang; label: string }) => (
    <button
      onClick={() => setSelectedLang(lang)}
      className={`px-4 py-2 rounded-t-lg font-medium transition ${
        selectedLang === lang
          ? 'bg-gray-900 text-green-400 border-b-2 border-green-400'
          : 'bg-gray-800/50 text-gray-400 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const codeExamples = {
    qrConnect: {
      curl: `curl -X POST ${baseUrl}/api/v1/auth/qr \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
      javascript: `// Connect to WhatsApp using QR Code
const response = await fetch('${baseUrl}/api/v1/auth/qr', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});

const data = await response.json();
console.log('QR Code:', data.qr);

// Display QR code image or text to user for scanning`,
      python: `import requests

# Connect to WhatsApp using QR Code
url = "${baseUrl}/api/v1/auth/qr"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN"
}

response = requests.post(url, headers=headers)
data = response.json()

print("QR Code:", data["qr"])
# Display QR code for user to scan with WhatsApp mobile app`,
      php: `<?php
// Connect to WhatsApp using QR Code
$url = "${baseUrl}/api/v1/auth/qr";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN"
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);

echo "QR Code: " . $data["qr"];
// Display QR code for user to scan
?>`,
    },
    checkStatus: {
      curl: `curl -X GET ${baseUrl}/api/v1/auth/status \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
      javascript: `// Check WhatsApp connection status
const response = await fetch('${baseUrl}/api/v1/auth/status', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});

const data = await response.json();
console.log('Status:', data.status);
console.log('Connected:', data.connected);`,
      python: `import requests

# Check WhatsApp connection status
url = "${baseUrl}/api/v1/auth/status"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN"
}

response = requests.get(url, headers=headers)
data = response.json()

print(f"Status: {data['status']}")
print(f"Connected: {data['connected']}")`,
      php: `<?php
// Check WhatsApp connection status
$url = "${baseUrl}/api/v1/auth/status";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN"
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);

echo "Status: " . $data["status"];
echo "Connected: " . ($data["connected"] ? "Yes" : "No");
?>`,
    },
    sendText: {
      curl: `curl -X POST ${baseUrl}/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "919876543210",
    "message": "Hello from WhatsApp API!"
  }'`,
      javascript: `// Send text message
const response = await fetch('${baseUrl}/api/v1/message/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: "919876543210",
    message: "Hello from WhatsApp API!"
  })
});

const data = await response.json();
console.log('Message sent:', data);`,
      python: `import requests

# Send text message
url = "${baseUrl}/api/v1/message/send"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN",
    "Content-Type": "application/json"
}
payload = {
    "phoneNumber": "919876543210",
    "message": "Hello from WhatsApp API!"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

print("Message sent:", data)`,
      php: `<?php
// Send text message
$url = "${baseUrl}/api/v1/message/send";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN",
    "Content-Type: application/json"
];
$payload = json_encode([
    "phoneNumber" => "919876543210",
    "message" => "Hello from WhatsApp API!"
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
echo "Message sent: " . $response;
?>`,
    },
    sendImage: {
      curl: `curl -X POST ${baseUrl}/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "phoneNumber=919876543210" \\
  -F "message=Check out this image!" \\
  -F "file=@/path/to/image.jpg"`,
      javascript: `// Send image with caption
const formData = new FormData();
formData.append('phoneNumber', '919876543210');
formData.append('message', 'Check out this image!');
formData.append('file', imageFile); // File object from input

const response = await fetch('${baseUrl}/api/v1/message/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log('Image sent:', data);`,
      python: `import requests

# Send image with caption
url = "${baseUrl}/api/v1/message/send"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN"
}
files = {
    "file": open("/path/to/image.jpg", "rb")
}
data = {
    "phoneNumber": "919876543210",
    "message": "Check out this image!"
}

response = requests.post(url, headers=headers, files=files, data=data)
print("Image sent:", response.json())`,
      php: `<?php
// Send image with caption
$url = "${baseUrl}/api/v1/message/send";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN"
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    "phoneNumber" => "919876543210",
    "message" => "Check out this image!",
    "file" => new CURLFile("/path/to/image.jpg")
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
echo "Image sent: " . $response;
?>`,
    },
    sendDocument: {
      curl: `curl -X POST ${baseUrl}/api/v1/message/send \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "phoneNumber=919876543210" \\
  -F "message=Here is the document you requested" \\
  -F "file=@/path/to/document.pdf"`,
      javascript: `// Send PDF document
const formData = new FormData();
formData.append('phoneNumber', '919876543210');
formData.append('message', 'Here is the document you requested');
formData.append('file', pdfFile); // File object

const response = await fetch('${baseUrl}/api/v1/message/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log('Document sent:', data);`,
      python: `import requests

# Send PDF document
url = "${baseUrl}/api/v1/message/send"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN"
}
files = {
    "file": open("/path/to/document.pdf", "rb")
}
data = {
    "phoneNumber": "919876543210",
    "message": "Here is the document you requested"
}

response = requests.post(url, headers=headers, files=files, data=data)
print("Document sent:", response.json())`,
      php: `<?php
// Send PDF document
$url = "${baseUrl}/api/v1/message/send";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN"
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    "phoneNumber" => "919876543210",
    "message" => "Here is the document you requested",
    "file" => new CURLFile("/path/to/document.pdf")
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
echo "Document sent: " . $response;
?>`,
    },
    getContacts: {
      curl: `curl -X GET ${baseUrl}/api/v1/contacts \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
      javascript: `// Get all contacts
const response = await fetch('${baseUrl}/api/v1/contacts', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});

const contacts = await response.json();
console.log('Contacts:', contacts);`,
      python: `import requests

# Get all contacts
url = "${baseUrl}/api/v1/contacts"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN"
}

response = requests.get(url, headers=headers)
contacts = response.json()

for contact in contacts:
    print(f"{contact['name']}: {contact['phoneNumber']}")`,
      php: `<?php
// Get all contacts
$url = "${baseUrl}/api/v1/contacts";
$headers = [
    "Authorization: Bearer YOUR_API_TOKEN"
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$contacts = json_decode($response, true);

foreach ($contacts as $contact) {
    echo $contact["name"] . ": " . $contact["phoneNumber"] . "\\n";
}
?>`,
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            {appName}
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/signin" className="text-gray-300 hover:text-white transition">Sign In</Link>
            <Link href="/signup" className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <Book className="w-12 h-12 text-blue-500" />
            <h1 className="text-5xl font-bold text-white">API Documentation</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Complete guide to integrate WhatsApp messaging into your applications
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-8 h-8 text-green-500" />
            Quick Start
          </h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Sign Up & Get API Token</h3>
                <p className="text-gray-400">Create an account and generate your API token from the dashboard</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Connect WhatsApp</h3>
                <p className="text-gray-400">Scan the QR code to link your WhatsApp account</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Start Sending Messages</h3>
                <p className="text-gray-400">Use our REST API to send messages programmatically</p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-8 h-8 text-red-500" />
            Authentication
          </h2>
          <p className="text-gray-300 mb-4">
            All API requests require authentication using Bearer token in the Authorization header.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 relative">
            <pre className="text-green-400 overflow-x-auto">
              <code>{`Authorization: Bearer YOUR_API_TOKEN`}</code>
            </pre>
            <button
              onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_TOKEN', 'auth')}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              {copiedCode === 'auth' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex gap-2 mb-8">
          <CodeTab lang="curl" label="cURL" />
          <CodeTab lang="javascript" label="JavaScript" />
          <CodeTab lang="python" label="Python" />
          <CodeTab lang="php" label="PHP" />
        </div>

        {/* API Endpoints */}
        <div className="space-y-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Code className="w-8 h-8 text-blue-500" />
            Available Endpoints
          </h2>

          {/* QR Code Connection */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="w-6 h-6 text-green-500" />
              <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded">GET</span>
              <code className="text-blue-400 text-lg">/api/v1/auth/qr</code>
            </div>
            <p className="text-gray-300 mb-6">Generate QR code to connect your WhatsApp account. User scans this with their WhatsApp mobile app.</p>
            
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.qrConnect[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.qrConnect[selectedLang], 'qr-connect')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'qr-connect' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-4 bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <p className="text-blue-300 text-sm flex items-start gap-2">
                <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>Integration Tip:</strong> Display the returned QR code (as an image or ASCII art) in your application. The user opens WhatsApp on their phone, goes to Settings → Linked Devices → Link a Device, and scans the QR code.</span>
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded">GET</span>
              <code className="text-blue-400 text-lg">/api/v1/auth/status</code>
            </div>
            <p className="text-gray-300 mb-6">Check your WhatsApp connection status</p>
            
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.checkStatus[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.checkStatus[selectedLang], 'status')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'status' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Send Text Message */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-6 h-6 text-green-500" />
              <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded">POST</span>
              <code className="text-blue-400 text-lg">/api/v1/message/send</code>
            </div>
            <p className="text-gray-300 mb-6">Send a text message to a WhatsApp number</p>
            
            <h4 className="text-white font-semibold mb-3">Parameters:</h4>
            <div className="space-y-2 mb-6">
              <div className="bg-gray-900/50 p-3 rounded">
                <code className="text-yellow-400">phoneNumber</code>
                <span className="text-gray-400"> (string, required) - Recipient phone number with country code (e.g., &quot;919876543210&quot;)</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded">
                <code className="text-yellow-400">message</code>
                <span className="text-gray-400"> (string, required) - Text message to send</span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.sendText[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.sendText[selectedLang], 'send-text')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'send-text' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Send Image */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Image className="w-6 h-6 text-purple-500" />
              <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded">POST</span>
              <code className="text-blue-400 text-lg">/api/v1/message/send</code>
            </div>
            <p className="text-gray-300 mb-6">Send an image with optional caption</p>
            
            <h4 className="text-white font-semibold mb-3">Parameters:</h4>
            <div className="space-y-2 mb-6">
              <div className="bg-gray-900/50 p-3 rounded">
                <code className="text-yellow-400">phoneNumber</code>
                <span className="text-gray-400"> (string, required) - Recipient phone number</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded">
                <code className="text-yellow-400">file</code>
                <span className="text-gray-400"> (File, required) - Image file (JPG, PNG, GIF)</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded">
                <code className="text-yellow-400">message</code>
                <span className="text-gray-400"> (string, optional) - Caption for the image</span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.sendImage[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.sendImage[selectedLang], 'send-image')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'send-image' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Send Document */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-orange-500" />
              <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded">POST</span>
              <code className="text-blue-400 text-lg">/api/v1/message/send</code>
            </div>
            <p className="text-gray-300 mb-6">Send a document (PDF, DOC, XLS, etc.) or video/audio files</p>
            
            <h4 className="text-white font-semibold mb-3">Supported File Types:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-900/50 p-3 rounded flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300 text-sm">PDF, DOC, DOCX</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300 text-sm">JPG, PNG, GIF</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded flex items-center gap-2">
                <Video className="w-5 h-5 text-red-400" />
                <span className="text-gray-300 text-sm">MP4, AVI, MOV</span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm">MP3, WAV, OGG</span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.sendDocument[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.sendDocument[selectedLang], 'send-doc')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'send-doc' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Get Contacts */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded">GET</span>
              <code className="text-blue-400 text-lg">/api/contacts</code>
            </div>
            <p className="text-gray-300 mb-6">Retrieve all contacts from your WhatsApp account</p>
            
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-green-400 overflow-x-auto text-sm">
                <code>{codeExamples.getContacts[selectedLang]}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExamples.getContacts[selectedLang], 'get-contacts')}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                {copiedCode === 'get-contacts' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Integration Flow */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-green-500" />
            Complete Integration Flow
          </h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Sign up and get your API token</h3>
                <p className="text-gray-400">Create an account on our platform and generate your unique API token from the dashboard.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Request QR code via API</h3>
                <p className="text-gray-400">Call <code className="text-blue-400">POST /api/v1/auth/qr</code> to generate a QR code for WhatsApp connection.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Display QR code to user</h3>
                <p className="text-gray-400">Show the QR code in your application (as an image or ASCII text).</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <h3 className="font-semibold text-white mb-1">User scans with WhatsApp mobile app</h3>
                <p className="text-gray-400">User opens WhatsApp → Settings → Linked Devices → Link a Device → Scan QR code.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Verify connection status</h3>
                <p className="text-gray-400">Poll <code className="text-blue-400">GET /api/v1/auth/status</code> to confirm connection is active.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">6</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Start sending messages</h3>
                <p className="text-gray-400">Use <code className="text-blue-400">POST /api/v1/message/send</code> to send text, images, documents, videos, or audio files.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to get started?</h3>
          <p className="text-xl text-white/90 mb-6">Sign up now and start automating your WhatsApp messages</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition shadow-xl">
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>&copy; 2025 {appName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
