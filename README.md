# WhatsApp Automation SaaS Platform

A powerful SaaS platform that enables users to connect their WhatsApp accounts and automate messaging through a beautiful dashboard and comprehensive API.

## 🚀 Features

- **WhatsApp Integration**: Connect WhatsApp via QR code using Baileys library
- **Send Messages**: Send text messages, files, or both via dashboard or API
- **Contact Management**: Full CRUD operations for contacts with pagination and search
- **Bulk Messaging**: Send messages to multiple contacts with automatic delays
- **Excel Import**: Import contacts in bulk from Excel files
- **Credit System**: Pay-per-message system with credit tracking
- **API Keys**: Generate and manage API tokens for external integrations
- **Real-time Updates**: Live connection status and message history
- **Responsive Dashboard**: Mobile-friendly interface with intuitive navigation

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- WhatsApp account for testing

## ⚙️ Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd whatsapp-baileys
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `APP_URL`: Your domain (e.g., solutions.codefy.tech)
- `NEXT_PUBLIC_APP_URL`: Public URL with protocol (e.g., https://solutions.codefy.tech)
- `JWT_SECRET`: Secret key for JWT tokens
- `SMTP_*`: Email configuration for notifications (optional)

4. **Set up the database**

```bash
npm run db:push
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📚 Documentation

We provide comprehensive documentation to get you started quickly:

### 🚀 Getting Started
- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 5 minutes with curl examples
- **[Complete Workflow Guide](./WORKFLOW_GUIDE.md)** - Step-by-step guide for all scenarios (connect → send → disconnect)

### 📖 Technical Documentation  
- **[Web UI Documentation](http://localhost:3000/dashboard/docs)** - Interactive API docs with curl examples for every endpoint
- **[Sessions & Storage Architecture](./SESSIONS_STORAGE.md)** - How session management works, cleanup, and capacity planning
- **[Auto-Restore Flow](./AUTO_RESTORE_FLOW.md)** - Visual guide for database-first restoration
- **[Frontend Integration Guide](./FRONTEND_FLOW.md)** - User experience scenarios and UI states

### 🧪 Testing
- **[Auto-Restore Testing Guide](./TEST_AUTO_RESTORE.md)** - Checklist for testing session restoration

### 🔑 Quick API Reference
```bash
# Auto-restore (no QR needed if previously connected)
curl -X POST http://localhost:3000/api/auth/restore -d '{"userId": 1}'

# Generate QR code
curl -X POST http://localhost:3000/api/auth/qr -d '{"userId": 1}'

# Check status
curl -X GET "http://localhost:3000/api/auth/status?userId=1"

# Send message
curl -X POST http://localhost:3000/api/message/send \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "phoneNumber": "1234567890", "message": "Hello!"}'

# Send media
curl -X POST http://localhost:3000/api/message/send \
  -F "userId=1" \
  -F "phoneNumber=1234567890" \
  -F "message=Check this out!" \
  -F "file=@image.jpg"

# Disconnect
curl -X POST http://localhost:3000/api/auth/logout -d '{"userId": 1}'
```

For complete API documentation with all endpoints, visit `/dashboard/docs` in your browser or read [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)

## 🏗️ Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Database**: PostgreSQL with Drizzle ORM
- **WhatsApp**: @whiskeysockets/baileys
- **Authentication**: JWT with email verification
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **File Processing**: xlsx for Excel imports

## 📖 Usage

### Dashboard Features

1. **Connect WhatsApp**
   - Go to `/dashboard/connect`
   - Scan the QR code with WhatsApp on your phone
   - Wait for successful connection

2. **Send Messages**
   - Navigate to `/dashboard/messages`
   - Enter phone number (with country code)
   - Type message and/or attach file
   - Click send (1 credit per message)

3. **Manage Contacts**
   - Visit `/dashboard/contacts`
   - Add contacts manually or import from Excel
   - Search, edit, or delete contacts
   - View pagination for large lists

4. **Bulk Messaging**
   - Go to Messages page
   - Click contact picker icon
   - Select multiple contacts
   - Choose send mode (text, file, or both)
   - Send to all selected (1 second delay between each)

5. **API Integration**
   - Generate API token at `/dashboard/api-keys`
   - Use token in Authorization header
   - Send requests to API endpoints
   - Check documentation for all endpoints

### API Example

```javascript
const response = await fetch('https://your-domain.com/api/message/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: formData // phoneNumber, message, file (optional)
});
```

## 🔒 Security

- API tokens are securely hashed in the database
- JWT-based authentication with HTTP-only cookies
- Environment variables for sensitive configuration
- CSRF protection on all API routes
- Input validation and sanitization

## 🛠️ Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push    # Push schema to database
npm run db:studio  # Open Drizzle Studio
```

## 📁 Project Structure

```
whatsapp-baileys/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   │   ├── messages/      # Messaging interface
│   │   ├── contacts/      # Contact management
│   │   ├── connect/       # WhatsApp connection
│   │   ├── docs/          # API documentation
│   │   └── api-keys/      # API key management
│   └── api/               # API routes
├── lib/                   # Utility libraries
│   ├── baileys.ts        # WhatsApp connection logic
│   ├── db.ts             # Database configuration
│   └── mailer.ts         # Email functionality
├── db/                    # Database schema
│   └── schema.ts         # Drizzle schema definitions
├── public/               # Static assets
├── DOCUMENTATION.md      # Complete API reference
└── .env                  # Environment variables
```

## 🐛 Troubleshooting

### WhatsApp Connection Issues

- Ensure your phone has internet connection
- Try regenerating the QR code if it expires
- Check if WhatsApp Web is logged in elsewhere
- Session files are stored in `auth_info_baileys/`

### Database Errors

- Verify DATABASE_URL is correct
- Run `npm run db:push` to sync schema
- Check PostgreSQL is running
- Ensure database exists

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For questions and support:
- Check the [documentation](./DOCUMENTATION.md)
- Open an issue on GitHub
- Contact: hello@codefy.tech
