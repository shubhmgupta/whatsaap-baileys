'use client';

import { useState, useEffect, useRef } from 'react';
import { Book, Code, Copy, Check, Key } from 'lucide-react';

type Language = 'php' | 'python' | 'javascript';

interface CodeExample {
  php: string;
  python: string;
  javascript: string;
}

export default function DocumentationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, Language>>({});
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setBaseUrl(appUrl);
    
    // Load and initialize Prism.js
    const loadPrism = async () => {
      const Prism = (await import('prismjs')).default;
      // @ts-ignore
      await import('prismjs/themes/prism-tomorrow.css');
      // @ts-ignore
      await import('prismjs/components/prism-php');
      // @ts-ignore
      await import('prismjs/components/prism-python');
      // @ts-ignore
      await import('prismjs/components/prism-javascript');
      // @ts-ignore
      await import('prismjs/components/prism-json');
      
      setTimeout(() => Prism.highlightAll(), 100);
    };
    
    loadPrism();
  }, []);



  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getActiveTab = (endpointId: string): Language => {
    return activeTab[endpointId] || 'javascript';
  };

  const setEndpointTab = (endpointId: string, lang: Language) => {
    setActiveTab(prev => ({ ...prev, [endpointId]: lang }));
  };

  const apiEndpoints = [
    {
      id: 'send-message',
      title: 'Send Message',
      method: 'POST',
      endpoint: '/api/message/send',
      description: 'Send a WhatsApp message with text, file, or both',
      auth: 'Required (Bearer token)',
      parameters: [
        { name: 'phoneNumber', type: 'string', required: true, description: 'Recipient phone number with country code (e.g., 919876543210)' },
        { name: 'message', type: 'string', required: false, description: 'Text message to send' },
        { name: 'file', type: 'File', required: false, description: 'File to send (image, video, document, audio)' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$postFields = [
    'phoneNumber' => '919876543210',
    'message' => 'Hello from PHP!',
    'file' => new CURLFile('/path/to/image.jpg')
];

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/message/send',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_TOKEN'
    ],
]);

$response = curl_exec($curl);
$data = json_decode($response, true);

curl_close($curl);
print_r($data);
?>`,
        python: `import requests

url = '${baseUrl}/api/message/send'
headers = {
    'Authorization': 'Bearer YOUR_API_TOKEN'
}

# With text and file
files = {
    'file': open('/path/to/image.jpg', 'rb')
}
data = {
    'phoneNumber': '919876543210',
    'message': 'Hello from Python!'
}

response = requests.post(url, headers=headers, data=data, files=files)
print(response.json())

# Text only
data = {
    'phoneNumber': '919876543210',
    'message': 'Hello from Python!'
}
response = requests.post(url, headers=headers, data=data)
print(response.json())`,
        javascript: `// Using Fetch API
const formData = new FormData();
formData.append('phoneNumber', '919876543210');
formData.append('message', 'Hello from JavaScript!');
// Optional: Add file
formData.append('file', fileInput.files[0]);

const response = await fetch('${baseUrl}/api/message/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log(data);

// Using Axios
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('phoneNumber', '919876543210');
formData.append('message', 'Hello from Node.js!');
formData.append('file', fs.createReadStream('/path/to/image.jpg'));

const response = await axios.post('${baseUrl}/api/message/send', formData, {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    ...formData.getHeaders()
  }
});
console.log(response.data);`
      },
      response: `{
  "success": true,
  "message": "Message sent successfully",
  "messageId": "3EB0XXXXX",
  "creditsRemaining": 95,
  "contactId": 1
}`
    },
    {
      id: 'get-contacts',
      title: 'Get Contacts',
      method: 'GET',
      endpoint: '/api/contacts',
      description: 'Retrieve all saved contacts with pagination',
      auth: 'Required (userId query param)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
        { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 10)' },
        { name: 'search', type: 'string', required: false, description: 'Search by name or phone' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$userId = 1;
$page = 1;
$limit = 10;
$search = 'John';

$url = '${baseUrl}/api/contacts?userId=' . $userId . 
       '&page=' . $page . '&limit=' . $limit . '&search=' . urlencode($search);

curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_TOKEN'
    ],
]);

$response = curl_exec($curl);
$data = json_decode($response, true);

curl_close($curl);
print_r($data);
?>`,
        python: `import requests

url = '${baseUrl}/api/contacts'
headers = {
    'Authorization': 'Bearer YOUR_API_TOKEN'
}
params = {
    'userId': 1,
    'page': 1,
    'limit': 10,
    'search': 'John'
}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print(data)

# Access contacts
for contact in data['contacts']:
    print(f"Name: {contact['name']}, Phone: {contact['phoneNumber']}")`,
        javascript: `// Using Fetch API
const params = new URLSearchParams({
  userId: '1',
  page: '1',
  limit: '10',
  search: 'John'
});

const response = await fetch(\`${baseUrl}/api/contacts?\${params}\`, {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});

const data = await response.json();
console.log(data);

// Using Axios
const axios = require('axios');

const response = await axios.get('${baseUrl}/api/contacts', {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  params: {
    userId: 1,
    page: 1,
    limit: 10,
    search: 'John'
  }
});
console.log(response.data);`
      },
      response: `{
  "contacts": [
    {
      "id": 1,
      "userId": 1,
      "phoneNumber": "919876543210",
      "name": "John Doe",
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalContacts": 42,
    "hasMore": true
  }
}`
    },
    {
      id: 'connection-status',
      title: 'Check Connection Status',
      method: 'GET',
      endpoint: '/api/auth/status',
      description: 'Check if WhatsApp is currently connected',
      auth: 'Required (userId query param)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$userId = 1;

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/auth/status?userId=' . $userId,
    CURLOPT_RETURNTRANSFER => true,
]);

$response = curl_exec($curl);
$data = json_decode($response, true);

curl_close($curl);

if ($data['connected']) {
    echo "WhatsApp is connected!";
} else {
    echo "WhatsApp is not connected";
}
?>`,
        python: `import requests

url = '${baseUrl}/api/auth/status'
params = {'userId': 1}

response = requests.get(url, params=params)
data = response.json()

if data['connected']:
    print("WhatsApp is connected!")
else:
    print("WhatsApp is not connected")`,
        javascript: `// Using Fetch API
const response = await fetch('${baseUrl}/api/auth/status?userId=1');
const data = await response.json();

if (data.connected) {
  console.log('WhatsApp is connected!');
} else {
  console.log('WhatsApp is not connected');
}

// Using Axios
const axios = require('axios');

const response = await axios.get('${baseUrl}/api/auth/status', {
  params: { userId: 1 }
});

console.log(response.data.connected ? 'Connected' : 'Not Connected');`
      },
      response: `{
  "connected": true
}`
    },
    {
      id: 'get-qr',
      title: 'Get QR Code',
      method: 'GET',
      endpoint: '/api/auth/qr',
      description: 'Get QR code for WhatsApp connection',
      auth: 'Required (userId query param)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/auth/qr?userId=1',
    CURLOPT_RETURNTRANSFER => true,
]);

$response = curl_exec($curl);
$data = json_decode($response, true);

curl_close($curl);

if (isset($data['qr'])) {
    echo '<img src="' . $data['qr'] . '" />';
} else {
    echo $data['message'];
}
?>`,
        python: `import requests

url = '${baseUrl}/api/auth/qr'
params = {'userId': 1}

response = requests.get(url, params=params)
data = response.json()

if 'qr' in data:
    print(f"QR Code: {data['qr']}")
else:
    print(data['message'])`,
        javascript: `// Using Fetch API
const response = await fetch('${baseUrl}/api/auth/qr?userId=1');
const data = await response.json();

if (data.qr) {
  // Display QR code image
  const img = document.createElement('img');
  img.src = data.qr;
  document.body.appendChild(img);
} else {
  console.log(data.message);
}`
      },
      response: `{
  "qr": "data:image/png;base64,iVBORw0KG..."
}`
    },
    {
      id: 'disconnect-whatsapp',
      title: 'Disconnect WhatsApp',
      method: 'POST',
      endpoint: '/api/whatsapp/disconnect',
      description: 'Disconnect WhatsApp session',
      auth: 'Required (Bearer token)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$data = json_encode(['userId' => 1]);

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/whatsapp/disconnect',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $data,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_TOKEN',
        'Content-Type: application/json'
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
?>`,
        python: `import requests

url = '${baseUrl}/api/whatsapp/disconnect'
headers = {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
}
data = {'userId': 1}

response = requests.post(url, headers=headers, json=data)
print(response.json())`,
        javascript: `const response = await fetch('${baseUrl}/api/whatsapp/disconnect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userId: 1 })
});

const data = await response.json();
console.log(data);`
      },
      response: `{
  "message": "WhatsApp disconnected successfully"
}`
    },
    {
      id: 'import-contacts',
      title: 'Import Contacts from CSV',
      method: 'POST',
      endpoint: '/api/contacts/import',
      description: 'Bulk import contacts from CSV file',
      auth: 'Required (Bearer token)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
        { name: 'file', type: 'File', required: true, description: 'CSV file with name and phoneNumber columns' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$postFields = [
    'userId' => 1,
    'file' => new CURLFile('/path/to/contacts.csv')
];

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/contacts/import',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_TOKEN'
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
?>`,
        python: `import requests

url = '${baseUrl}/api/contacts/import'
headers = {'Authorization': 'Bearer YOUR_API_TOKEN'}

files = {'file': open('/path/to/contacts.csv', 'rb')}
data = {'userId': 1}

response = requests.post(url, headers=headers, data=data, files=files)
print(response.json())`,
        javascript: `const formData = new FormData();
formData.append('userId', '1');
formData.append('file', fileInput.files[0]);

const response = await fetch('${baseUrl}/api/contacts/import', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log(data);`
      },
      response: `{
  "success": true,
  "imported": 25,
  "failed": 0
}`
    },
    {
      id: 'get-incoming-messages',
      title: 'Get Incoming Messages',
      method: 'GET',
      endpoint: '/api/messages/incoming',
      description: 'Fetch incoming messages with optional filters',
      auth: 'Required (userId query param)',
      parameters: [
        { name: 'userId', type: 'number', required: true, description: 'Your user ID' },
        { name: 'phoneNumber', type: 'string', required: false, description: 'Filter by phone number' },
        { name: 'limit', type: 'number', required: false, description: 'Number of messages (default: 50)' },
      ],
      examples: {
        php: `<?php
$curl = curl_init();

$params = http_build_query([
    'userId' => 1,
    'phoneNumber' => '919876543210',
    'limit' => 20
]);

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}/api/messages/incoming?' . $params,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_TOKEN'
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
?>`,
        python: `import requests

url = '${baseUrl}/api/messages/incoming'
headers = {'Authorization': 'Bearer YOUR_API_TOKEN'}
params = {
    'userId': 1,
    'phoneNumber': '919876543210',
    'limit': 20
}

response = requests.get(url, headers=headers, params=params)
print(response.json())`,
        javascript: `const params = new URLSearchParams({
  userId: '1',
  phoneNumber: '919876543210',
  limit: '20'
});

const response = await fetch(\`${baseUrl}/api/messages/incoming?\${params}\`, {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});

const data = await response.json();
console.log(data);`
      },
      response: `{
  "messages": [
    {
      "id": 1,
      "message": "Hello!",
      "isFromMe": false,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "mediaType": null,
      "mediaUrl": null
    }
  ]
}`
    },
  ];

  const CodeTabs = ({ endpointId, examples }: { endpointId: string; examples: CodeExample }) => {
    const currentTab = getActiveTab(endpointId);
    const codeRef = useRef<HTMLElement>(null);
    
    useEffect(() => {
      if (codeRef.current) {
        const loadAndHighlight = async () => {
          try {
            const Prism = (await import('prismjs')).default;
            
            // Ensure language components are loaded
            if (currentTab === 'php') {
              // @ts-ignore
              await import('prismjs/components/prism-markup-templating');
              // @ts-ignore
              await import('prismjs/components/prism-php');
            } else if (currentTab === 'python') {
              // @ts-ignore
              await import('prismjs/components/prism-python');
            } else if (currentTab === 'javascript') {
              // @ts-ignore
              await import('prismjs/components/prism-javascript');
            }
            
            if (codeRef.current) {
              // Reset the code element
              const codeElement = codeRef.current;
              codeElement.className = `language-${currentTab}`;
              codeElement.removeAttribute('data-highlighted');
              
              // Re-highlight
              Prism.highlightElement(codeElement);
            }
          } catch (error) {
            console.error('Error highlighting code:', error);
          }
        };
        
        loadAndHighlight();
      }
    }, [currentTab]);
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setEndpointTab(endpointId, 'javascript')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'javascript'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => setEndpointTab(endpointId, 'python')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'python'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setEndpointTab(endpointId, 'php')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'php'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              PHP
            </button>
          </div>
          <button
            onClick={() => copyToClipboard(examples[currentTab], `${endpointId}-${currentTab}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {copiedCode === `${endpointId}-${currentTab}` ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs border border-gray-700">
          <code ref={codeRef} className={`language-${currentTab}`}>{examples[currentTab]}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Book className="w-8 h-8 text-blue-400" />
          API Documentation
        </h1>
        <p className="text-gray-400">
          Complete guide to integrate WhatsApp messaging into your applications
        </p>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-6 h-6 text-blue-400" />
          Getting Started
        </h2>
        <div className="space-y-3 text-gray-300">
          <p>1. Create an API token from the <a href="/dashboard/api-keys" className="text-blue-400 hover:underline">API Keys page</a></p>
          <p>2. Include your token in the <code className="bg-gray-800 px-2 py-1 rounded text-green-400">Authorization</code> header</p>
          <p>3. Make requests to the endpoints below</p>
        </div>
        <div className="mt-4 bg-gray-900/50 p-4 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">Authorization Header Format:</p>
          <code className="text-green-400">Authorization: Bearer YOUR_API_TOKEN</code>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-3">Base URL</h3>
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <code className="text-blue-400">{baseUrl || 'Loading...'}</code>
        </div>
      </div>

      {/* API Endpoints */}
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Code className="w-6 h-6 text-green-400" />
        API Endpoints
      </h2>

      <div className="space-y-6">
        {apiEndpoints.map((endpoint) => (
          <div key={endpoint.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900/50 p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  endpoint.method === 'GET' ? 'bg-blue-600' : 'bg-green-600'
                } text-white`}>
                  {endpoint.method}
                </span>
                <code className="text-blue-400 text-sm flex-1">{endpoint.endpoint}</code>
              </div>
              <p className="text-gray-300 text-sm">{endpoint.description}</p>
              <p className="text-gray-500 text-xs mt-1">Auth: {endpoint.auth}</p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Parameters */}
              <div>
                <h4 className="text-white font-bold mb-2 text-sm">Parameters:</h4>
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-2 text-gray-400">Name</th>
                        <th className="text-left p-2 text-gray-400">Type</th>
                        <th className="text-left p-2 text-gray-400">Required</th>
                        <th className="text-left p-2 text-gray-400">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.parameters.map((param, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50">
                          <td className="p-2 text-blue-400">{param.name}</td>
                          <td className="p-2 text-purple-400">{param.type}</td>
                          <td className="p-2">
                            <span className={param.required ? 'text-red-400' : 'text-gray-500'}>
                              {param.required ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="p-2 text-gray-300">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Examples with Tabs */}
              <div>
                <h4 className="text-white font-bold mb-2 text-sm">Code Example:</h4>
                <CodeTabs endpointId={endpoint.id} examples={endpoint.examples} />
              </div>

              {/* Response Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-bold text-sm">Response Example:</h4>
                  <button
                    onClick={() => copyToClipboard(endpoint.response, `res-${endpoint.id}`)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === `res-${endpoint.id}` ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs border border-gray-700">
                  <code className="language-json">{endpoint.response}</code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Important Notes */}
      <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-3">⚠️ Important Notes</h2>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li>• <strong>Credits:</strong> Each message sent deducts 1 credit from your account</li>
          <li>• <strong>Phone Numbers:</strong> Use full format with country code (e.g., 919876543210 for India)</li>
          <li>• <strong>File Uploads:</strong> Supported types: images, videos, documents, audio (max 16MB)</li>
          <li>• <strong>Connection:</strong> Your WhatsApp must be connected via QR code before sending messages</li>
          <li>• <strong>Rate Limiting:</strong> Recommended delay of 1-2 seconds between consecutive messages</li>
          <li>• <strong>Contacts:</strong> New contacts are automatically created when sending to a new number</li>
        </ul>
      </div>

      {/* Quick Links */}
      <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href="/dashboard/messages"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors text-center"
          >
            📨 Messages
          </a>
          <a
            href="/dashboard/contacts"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors text-center"
          >
            📇 Contacts
          </a>
          <a
            href="/dashboard/api-keys"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors text-center"
          >
            🔑 API Keys
          </a>
          <a
            href="/dashboard/connect"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors text-center"
          >
            📱 Connect
          </a>
        </div>
      </div>
    </div>
  );
}
