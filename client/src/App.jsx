import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeProvider';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
import LibraryPage from './pages/LibraryPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import InitialSetupModal from './components/InitialSetupModal';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  console.warn('⚠️  VITE_CLERK_PUBLISHABLE_KEY is not set. Auth will not work.');
}

export default function App() {
  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={CLERK_KEY || 'pk_test_placeholder'}>
        <UserProvider>
          <Router>
            <div className="min-h-screen transition-colors duration-300">
              <Navbar />
            <main>
              <InitialSetupModal />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/app" element={<AppPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Routes>
            </main>
            </div>
          </Router>
        </UserProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}
