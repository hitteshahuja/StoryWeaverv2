import { Link, useNavigate } from 'react-router-dom';
import { SignInButton, SignOutButton, useAuth, UserButton } from '@clerk/clerk-react';
import { useDbUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeProvider';
import { Sparkles, BookOpen, LayoutDashboard, DollarSign, Moon, Sun, Shield } from 'lucide-react';
import logo from '../assets/dreamweaverlogo3.png';
export default function Navbar() {
  const { isSignedIn } = useAuth();
  const { dbUser } = useDbUser();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-night-950/80 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <img src={logo} alt="Logo" height={48} width={48} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-dream-300 to-purple-300 bg-clip-text text-transparent">
              DreamWeaver
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {isSignedIn && (
              <>
                <NavLink to="/app" icon={<Sparkles className="w-4 h-4" />}>Generate</NavLink>
                <NavLink to="/library" icon={<BookOpen className="w-4 h-4" />}>Library</NavLink>
                <NavLink to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>Dashboard</NavLink>
              </>
            )}
            <NavLink to="/pricing" icon={<DollarSign className="w-4 h-4" />}>Pricing</NavLink>
            <NavLink to="/privacy" icon={<Shield className="w-4 h-4" />}>Privacy</NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isSignedIn && dbUser != null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
                <Sparkles className="w-3.5 h-3.5 text-gold-500 dark:text-gold-400" />
                <span className="text-sm font-semibold text-dream-600 dark:text-dream-200">
                  {dbUser.credits ?? 0} credits
                </span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <SignOutButton>
                  <button className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                    Logout
                  </button>
                </SignOutButton>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="btn-primary text-sm py-2 px-4">Sign In</button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, children }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-white/70
                 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200"
    >
      {icon}
      {children}
    </Link>
  );
}
