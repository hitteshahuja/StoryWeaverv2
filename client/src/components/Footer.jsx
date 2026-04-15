import { Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Sparkles, BookOpen, LayoutDashboard, DollarSign, Shield, Mail, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';
import logo from '../assets/dreamweaverlogo3.png';
import LegalConfig from '../config/legalConfig';

export default function Footer() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { theme } = useTheme();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-night-900 border-t border-gray-200 dark:border-white/10">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <img src={logo} alt="Logo" height={40} width={40} />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-dream-300 to-purple-300 bg-clip-text text-transparent">
                DreamWeaver
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-white/50 leading-relaxed">
              AI-powered magical bedtime stories for little dreamers. 
              Turn photos into personalized adventures.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="mailto:hello@dreamweaver.ai" 
                className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:bg-dream-50 dark:hover:bg-dream-500/10 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
                aria-label="Email us"
              >
                <Mail className="w-4 h-4" />
              </a>
              <span className="text-xs text-gray-400 dark:text-white/30">
                hello@dreamweaver.ai
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Navigate</h3>
            <ul className="space-y-2.5">
              {isSignedIn && (
                <>
                  <FooterLink to="/app" icon={<Sparkles className="w-4 h-4" />}>Generate Story</FooterLink>
                  <FooterLink to="/library" icon={<BookOpen className="w-4 h-4" />}>Story Library</FooterLink>
                  <FooterLink to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>Dashboard</FooterLink>
                </>
              )}
              <FooterLink to="/pricing" icon={<DollarSign className="w-4 h-4" />}>Pricing</FooterLink>
              <FooterLink to="/privacy" icon={<Shield className="w-4 h-4" />}>Privacy Policy</FooterLink>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-sm text-gray-500 dark:text-white/50 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-gray-500 dark:text-white/50 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-gray-500 dark:text-white/50 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <Link 
                  to="/privacy#consent" 
                  className="text-sm text-gray-500 dark:text-white/50 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
                >
                  Parental Consent
                </Link>
              </li>
            </ul>
          </div>

          {/* Secure Payments */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Secure Payments</h3>
            <p className="text-sm text-gray-500 dark:text-white/50 mb-4">
              All payments are processed securely via Stripe. We accept all major cards.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <rect width="16" height="11" x="4" y="5" rx="2" fill="currentColor" className="text-gray-400 dark:text-white/30"/>
                  <rect width="16" height="11" x="4" y="5" rx="2" fill="url(#visa-gradient)" />
                  <defs>
                    <linearGradient id="visa-gradient" x1="4" y1="5" x2="20" y2="16">
                      <stop stopColor="#1A1F71"/>
                      <stop offset="1" stopColor="#F7B600"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-xs font-medium text-gray-600 dark:text-white/70">Visa</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#EB001B"/>
                  <circle cx="12" cy="12" r="10" fill="#F79E1B" fillOpacity="0.8"/>
                </svg>
                <span className="text-xs font-medium text-gray-600 dark:text-white/70">Mastercard</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-white/30">
              <Shield className="w-3.5 h-3.5" />
              <span>256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 dark:text-white/40">
              © {currentYear} {LegalConfig.legalEntity}. All rights reserved.
            </p>
            <p className="text-sm text-gray-400 dark:text-white/40 flex items-center gap-1">
              Made with <Heart className="w-3.5 h-3.5 text-red-400" /> for little dreamers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, icon, children }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-dream-500 dark:hover:text-dream-300 transition-colors"
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}
