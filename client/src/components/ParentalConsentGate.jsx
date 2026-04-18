import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { AnimatePresence } from 'framer-motion';
import { useDbUser } from '../context/UserContext';
import { usersAPI } from '../lib/api';
import ParentalConsentModal from './ParentalConsentModal';

export default function ParentalConsentGate({ children }) {
  const { isSignedIn } = useAuth();
  const { dbUser, loading: dbLoading, refreshUser } = useDbUser();
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Only show modal after dbUser is fully loaded AND consent not given
  useEffect(() => {
    // Don't show modal while still loading user data
    if (!isSignedIn || dbLoading) {
      setShowModal(false);
      return;
    }
    
    // User loaded and consent already given - don't show
    if (dbUser?.consent_given) {
      setShowModal(false);
      return;
    }
    
    // User loaded but no consent - show modal
    setShowModal(true);
  }, [isSignedIn, dbLoading, dbUser?.consent_given]);

  // Don't render modal if user not signed in, still loading, or already consented
  if (!isSignedIn || dbLoading || dbUser?.consent_given) return children;

  const handleConsent = async (consentData) => {
    setSaving(true);
    try {
      await usersAPI.consent(consentData);
      await refreshUser();
      setShowModal(false);
    } catch (err) {
      console.error('Consent save failed:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || 'Failed to save consent. Please try again.';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {showModal && (
          <ParentalConsentModal onConsent={handleConsent} loading={saving} />
        )}
      </AnimatePresence>
    </>
  );
}
