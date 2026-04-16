import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, Shield } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <nav className="fixed w-full top-0 z-50 backdrop-blur-md bg-[#1A1A1A]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-wider uppercase text-[#FF6B00]">LOADHUNTERS</div>
          <div className="flex gap-6">
            <button
              onClick={() => navigate('/login')}
              className="text-[#FF6B00] hover:text-[#FF5500] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-[#FF6B00] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#FF5500] transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F]">
          <div className="w-full max-w-none mx-auto text-center space-y-8">
            <div className="w-full px-4 sm:px-8" style={{ background: 'transparent' }}>
              <img
                src="/Adobe_Express_-_file.png"
                alt="LoadHunters"
                className="w-full h-auto object-contain min-w-[260px]"
                style={{
                  display: 'block',
                  margin: '0 auto',
                  maxWidth: '1100px',
                  background: 'transparent',
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <button
                onClick={() => navigate('/pricing')}
                className="bg-[#FF6B00] text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-[#FF5500] transition-all hover:shadow-2xl hover:shadow-[#FF6B00]/50"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/login')}
                className="border-2 border-[#FF6B00] text-[#FF6B00] px-10 py-4 rounded-lg font-bold text-lg hover:bg-[#FF6B00]/10 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 bg-[#0F0F0F] border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">
              Built for Dispatch Excellence
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-8 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#FF6B00]/50 transition-colors">
                <div className="w-14 h-14 bg-[#FF6B00]/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-7 h-7 text-[#FF6B00]" />
                </div>
                <h3 className="text-2xl font-bold">Live Revenue Tracking</h3>
                <p className="text-gray-400 leading-relaxed">
                  See exactly what you're earning in real-time. Every mile, every delivery, every detail tracked and calculated automatically.
                </p>
              </div>

              <div className="space-y-4 p-8 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#FF6B00]/50 transition-colors">
                <div className="w-14 h-14 bg-[#FF6B00]/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-[#FF6B00]" />
                </div>
                <h3 className="text-2xl font-bold">Automated Detention Monitoring</h3>
                <p className="text-gray-400 leading-relaxed">
                  Track detention time automatically. Get compensated for every hour your drivers wait. No manual logging required.
                </p>
              </div>

              <div className="space-y-4 p-8 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#FF6B00]/50 transition-colors">
                <div className="w-14 h-14 bg-[#FF6B00]/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-7 h-7 text-[#FF6B00]" />
                </div>
                <h3 className="text-2xl font-bold">Secure Fleet Overview</h3>
                <p className="text-gray-400 leading-relaxed">
                  Enterprise-grade security. Real-time fleet visibility. Complete control over your operation and driver data.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 bg-[#1A1A1A]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">
              Engineered for Precision
            </h2>

            <div className="space-y-8 mb-12">
              <p className="text-center text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">
                LoadHunters was built by a Software Architect focused on structural integrity, scalability, and cybersecurity. Every feature is designed with precision engineering principles.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-[#0F0F0F] p-6 rounded-lg border border-[#FF6B00]/20 space-y-2">
                <div className="text-[#FF6B00] font-bold text-sm uppercase tracking-wide">Architecture</div>
                <p className="text-gray-300">Modular design with clean separation of concerns</p>
              </div>

              <div className="bg-[#0F0F0F] p-6 rounded-lg border border-[#FF6B00]/20 space-y-2">
                <div className="text-[#FF6B00] font-bold text-sm uppercase tracking-wide">Security</div>
                <p className="text-gray-300">End-to-end encryption and role-based access control</p>
              </div>

              <div className="bg-[#0F0F0F] p-6 rounded-lg border border-[#FF6B00]/20 space-y-2">
                <div className="text-[#FF6B00] font-bold text-sm uppercase tracking-wide">Scalability</div>
                <p className="text-gray-300">Built to handle fleets of any size with consistent performance</p>
              </div>

              <div className="bg-[#0F0F0F] p-6 rounded-lg border border-[#FF6B00]/20 space-y-2">
                <div className="text-[#FF6B00] font-bold text-sm uppercase tracking-wide">Reliability</div>
                <p className="text-gray-300">99.9% uptime SLA with redundant infrastructure</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent p-8 rounded-lg border border-[#FF6B00]/30 text-center">
              <p className="text-gray-200 text-lg">
                <span className="text-[#FF6B00] font-bold">No shortcuts.</span> Built right from the ground up with enterprise-grade standards.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 bg-[#0F0F0F] border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">
              Simple, Transparent Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-[#1A1A1A] p-8 rounded-xl border border-white/10 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">Solo</h3>
                  <p className="text-gray-400">For independent dispatchers</p>
                </div>

                <div className="space-y-2">
                  <p className="text-4xl font-bold text-[#FF6B00]">$49</p>
                  <p className="text-gray-400 text-sm">per month</p>
                </div>

                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Live revenue tracking
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Up to 5 drivers
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Basic reporting
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Email support
                  </li>
                </ul>

                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-[#FF6B00] text-white py-3 rounded-lg font-bold hover:bg-[#FF5500] transition-colors"
                >
                  Get Started
                </button>
              </div>

              <div className="bg-[#1A1A1A] p-8 rounded-xl border-2 border-[#FF6B00] space-y-6 relative scale-105">
                <div className="absolute -top-4 left-6 bg-[#FF6B00] text-[#1A1A1A] px-4 py-1 rounded-full text-xs font-bold uppercase">
                  Most Popular
                </div>

                <div>
                  <h3 className="text-3xl font-bold mb-2">Growth</h3>
                  <p className="text-gray-400">For growing operations</p>
                </div>

                <div className="space-y-2">
                  <p className="text-4xl font-bold text-[#FF6B00]">$129</p>
                  <p className="text-gray-400 text-sm">per month</p>
                </div>

                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Everything in Solo
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Up to 25 drivers
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Priority support
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Custom integrations
                  </li>
                </ul>

                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-[#FF6B00] text-white py-3 rounded-lg font-bold hover:bg-[#FF5500] transition-colors"
                >
                  Get Started
                </button>
              </div>

              <div className="bg-[#1A1A1A] p-8 rounded-xl border border-white/10 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">Fleet</h3>
                  <p className="text-gray-400">For enterprise operations</p>
                </div>

                <div className="space-y-2">
                  <p className="text-4xl font-bold text-[#FF6B00]">$249</p>
                  <p className="text-gray-400 text-sm">per month</p>
                </div>

                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Unlimited drivers
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Priority support
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    Custom dispatch zones
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full"></span>
                    White-label options
                  </li>
                </ul>

                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-[#FF6B00] text-white py-3 rounded-lg font-bold hover:bg-[#FF5500] transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>

            <p className="text-center text-gray-400 mt-12">
              14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        <section className="px-4 py-20 bg-[#1A1A1A] border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl font-bold">
              Ready to take control of your dispatch operation?
            </h2>

            <p className="text-xl text-gray-400">
              Join hundreds of dispatchers already using LoadHunters to maximize revenue and simplify operations.
            </p>

            <button
              onClick={() => navigate('/pricing')}
              className="inline-block bg-[#FF6B00] text-white px-12 py-4 rounded-lg font-bold text-lg hover:bg-[#FF5500] transition-all hover:shadow-2xl hover:shadow-[#FF6B00]/50"
            >
              Start Your Free Trial
            </button>
          </div>
        </section>

        <footer className="px-4 py-12 bg-[#0F0F0F] border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div>
                <h4 className="font-bold mb-4">LoadHunters</h4>
                <p className="text-gray-400 text-sm">
                  Precision dispatch management for modern logistics.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-3 text-sm uppercase">Product</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><button onClick={() => navigate('/pricing')} className="hover:text-[#FF6B00] transition-colors">Pricing</button></li>
                  <li><a href="#features" className="hover:text-[#FF6B00] transition-colors">Features</a></li>
                  <li><a href="#security" className="hover:text-[#FF6B00] transition-colors">Security</a></li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold mb-3 text-sm uppercase">Company</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">Contact</a></li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold mb-3 text-sm uppercase">Legal</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-[#FF6B00] transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; 2024 LoadHunters. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
