import Link from 'next/link';
import { MessageSquare, Zap, Shield, Code, CheckCircle2, ArrowRight } from 'lucide-react';
import { PricingSection } from '@/components/PricingSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            WhatsApp SaaS
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
            <a href="#api" className="text-gray-300 hover:text-white transition">API</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/signin" className="text-gray-300 hover:text-white transition">Sign In</Link>
            <Link href="/signup" className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600">
              Automate WhatsApp
            </span>
            <br />At Scale
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Connect your WhatsApp account via our powerful API. Send messages, automate conversations, and build intelligent chatbots without the complexity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg transition shadow-xl flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a href="#api" className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-lg transition border border-gray-700">
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-400">Everything you need to build amazing WhatsApp experiences</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="Message Automation"
            description="Send text, images, documents, and more. Build automated workflows to engage with customers 24/7."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Lightning Fast API"
            description="Our REST API is optimized for speed. Send messages in milliseconds with 99.9% uptime guarantee."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Secure & Reliable"
            description="Enterprise-grade security with token-based authentication. Your data is encrypted end-to-end."
          />
          <FeatureCard
            icon={<Code className="w-8 h-8" />}
            title="Easy Integration"
            description="Simple REST API with comprehensive documentation. Get started in minutes, not hours."
          />
          <FeatureCard
            icon={<CheckCircle2 className="w-8 h-8" />}
            title="Credit System"
            description="Pay-as-you-go pricing model. Only pay for what you use with our flexible credit system."
          />
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="Multi-Account Support"
            description="Manage multiple WhatsApp accounts from a single dashboard. Perfect for agencies and teams."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gray-800/30 rounded-3xl my-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-gray-400">Get started in 3 simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            number="1"
            title="Sign Up & Connect"
            description="Create your account and scan the QR code to link your WhatsApp account."
          />
          <StepCard
            number="2"
            title="Generate API Token"
            description="Create your secure API token from the dashboard to authenticate your requests."
          />
          <StepCard
            number="3"
            title="Start Sending"
            description="Use our REST API to send messages, automate workflows, and scale your communication."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* API Preview */}
      <section id="api" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, Powerful API</h2>
          <p className="text-xl text-gray-400">Send your first message in minutes</p>
        </div>
        <div className="max-w-3xl mx-auto bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <pre className="text-sm text-green-400 overflow-x-auto">
            <code>{`curl -X POST https://yourapi.com/api/message/send \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "Hello from WhatsApp SaaS!"
  }'`}</code>
          </pre>
        </div>
        <div className="text-center">
          <Link href="/docs" className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
            View Full Documentation
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-3xl p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">Join thousands of developers building with our WhatsApp API</p>
          <Link href="/signup" className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg transition shadow-xl inline-flex items-center">
            Create Free Account
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">WhatsApp SaaS</h3>
              <p className="text-gray-400">Automate WhatsApp at scale with our powerful API.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#api" className="hover:text-white transition">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 WhatsApp SaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 hover:border-green-500/50 transition">
    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-2xl font-bold">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);
