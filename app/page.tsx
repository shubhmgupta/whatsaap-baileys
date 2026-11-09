import Link from 'next/link';
import { 
  MessageSquare, 
  Zap, 
  Shield, 
  Code, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Layers, 
  Cpu, 
  Database 
} from 'lucide-react';

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Codefy';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white antialiased selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/80">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold text-white text-base">
              W
            </span>
            <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              {appName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition">Features</a>
            <a href="#code" className="text-sm font-medium text-gray-300 hover:text-white transition">API</a>
            <Link href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="/docs" className="text-sm font-medium text-gray-300 hover:text-white transition">Documentation</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/signin" className="text-sm font-medium text-gray-300 hover:text-white transition px-3 py-1.5">
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold py-2 px-5 rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28 text-center relative">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Next.js 16 • Baileys Engine • MySQL & REST API
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Automate WhatsApp <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Without the Complexity
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect multi-device WhatsApp sessions via QR code. Broadcast media, manage contacts, and trigger automations with a high-throughput REST API.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              href="/signup" 
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 px-8 rounded-xl transition shadow-xl shadow-emerald-500/25"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/pricing" 
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-8 rounded-xl transition border border-gray-800 shadow-sm"
            >
              View Credit Pricing
            </Link>
          </div>

          {/* Interactive Code Preview Card */}
          <div id="code" className="max-w-2xl mx-auto rounded-2xl bg-gray-900/90 border border-gray-800/80 shadow-2xl p-5 text-left font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-gray-400 text-xs font-sans ml-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  cURL • Send Message Request
                </span>
              </div>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                POST /api/v1/messages
              </span>
            </div>

            <pre className="text-gray-300 leading-relaxed overflow-x-auto p-2">
              <code>
<span className="text-purple-400">curl</span> -X POST <span className="text-emerald-400">https://yourdomain.com/api/v1/messages</span> \<br />
  -H <span className="text-amber-300">"Authorization: Bearer YOUR_API_TOKEN"</span> \<br />
  -H <span className="text-amber-300">"Content-Type: application/json"</span> \<br />
  -d '{`{`}<br />
    <span className="text-cyan-300">"phoneNumber"</span>: <span className="text-emerald-300">"+919876543210"</span>,<br />
    <span className="text-cyan-300">"message"</span>: <span className="text-emerald-300">"Hello! Your order #4102 has shipped 🚀"</span><br />
  {`}`}'
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 border-t border-gray-800/80">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Everything You Need to Scale</h2>
          <p className="text-gray-400 text-base">Reliable infrastructure built for marketing teams, developers, and CRM systems.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6 text-emerald-400" />}
            title="Real-Time Live Chat Inbox"
            description="View incoming customer responses live and reply directly from your web dashboard with full media attachment support."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-teal-400" />}
            title="High-Speed Message Dispatcher"
            description="Send individual or bulk messages with built-in automatic rate limiting and delivery status tracking."
          />
          <FeatureCard
            icon={<Database className="w-6 h-6 text-cyan-400" />}
            title="MySQL Persistence & Auto-Restore"
            description="WhatsApp multi-device session credentials and chat logs persist reliably in MySQL with instant reconnection."
          />
          <FeatureCard
            icon={<Layers className="w-6 h-6 text-purple-400" />}
            title="Bulk Excel Contact Importer"
            description="Upload spreadsheets to import thousands of contacts in seconds, automatically validating country dial codes."
          />
          <FeatureCard
            icon={<Code className="w-6 h-6 text-blue-400" />}
            title="Comprehensive REST API v1"
            description="Bearer-token authenticated endpoints with full CORS headers ready for CRM, Zapier, and custom webhook flows."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-emerald-400" />}
            title="Pay-As-You-Go Credit System"
            description="No steep recurring commitments. Recharge credits that never expire with seamless Razorpay and PhonePe integrations."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gray-900/60 border border-gray-800 p-8 md:p-16">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">How It Works</h2>
            <p className="text-gray-400 text-sm">Start sending automated WhatsApp messages in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="Pair WhatsApp via QR"
              description="Open WhatsApp on your phone, link a device by scanning the QR code in your dashboard."
            />
            <StepCard
              number="02"
              title="Generate API Token"
              description="Create a secure Bearer token in the API Keys panel to authenticate external HTTP calls."
            />
            <StepCard
              number="03"
              title="Broadcast & Automate"
              description="Send single or batch messages, receive incoming webhooks, and chat via the Live Inbox."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Ready to automate your WhatsApp?
            </h2>
            <p className="text-emerald-100 text-base md:text-lg mb-8">
              Sign up today and get 10 free message credits immediately to test your connection.
            </p>
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-bold py-3.5 px-8 rounded-xl transition shadow-xl text-sm"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-12 mt-12 bg-gray-950">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                  W
                </span>
                <span className="text-lg font-bold text-white">{appName}</span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed">
                Automate WhatsApp messaging, campaigns, and live conversation workflows with confidence.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-emerald-400 transition">Features</a></li>
                <li><Link href="/pricing" className="hover:text-emerald-400 transition">Pricing Plans</Link></li>
                <li><Link href="/docs" className="hover:text-emerald-400 transition">REST API Docs</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-400 transition">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/dashboard/docs" className="hover:text-emerald-400 transition">API Reference</Link></li>
                <li><Link href="/dashboard/inbox" className="hover:text-emerald-400 transition">Live Inbox</Link></li>
                <li><Link href="/dashboard/messages" className="hover:text-emerald-400 transition">Bulk Broadcaster</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/signin" className="hover:text-emerald-400 transition">Sign In</Link></li>
                <li><Link href="/signup" className="hover:text-emerald-400 transition">Register</Link></li>
                <li><Link href="/forgot-password" className="hover:text-emerald-400 transition">Reset Password</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Powered by Next.js 16 & @whiskeysockets/baileys</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-2xl bg-gray-900/60 hover:bg-gray-900/90 border border-gray-800 hover:border-emerald-500/30 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg">
    <div className="w-12 h-12 rounded-xl bg-gray-800/80 flex items-center justify-center mb-4 border border-gray-700/50">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="text-left p-6 rounded-2xl bg-gray-850/50 border border-gray-800/60">
    <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3 font-mono">
      {number}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);
