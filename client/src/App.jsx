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
import ParentalConsentGate from './components/ParentalConsentGate';
import PrivacyPolicy from './components/PrivacyPolicy';
import formbricks from '@formbricks/js';
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  console.warn('⚠️  VITE_CLERK_PUBLISHABLE_KEY is not set. Auth will not work.');
}

if (typeof window !== "undefined") {
  formbricks.setup({
    environmentId: "cmo2vt4vx6wtivw01i4rdxl5u",
    appUrl: "https://app.formbricks.com",
    debug: true,
  });
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
                <ParentalConsentGate>
                  <InitialSetupModal />
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/app" element={<AppPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                  </Routes>
                </ParentalConsentGate>
              </main>
            </div>
          </Router>
        </UserProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}
