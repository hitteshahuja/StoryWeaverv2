import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { AnimatePresence } from 'framer-motion';
import { useDbUser } from '../context/UserContext';
import { usersAPI } from '../lib/api';
import ParentalConsentModal from './ParentalConsentModal';

export default function ParentalConsentGate({ children }) {
  const { isSignedIn } = useAuth();
  const { dbUser, loading, refreshUser } = useDbUser();
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isSignedIn || loading) {
      setShowModal(false);
    } else if (!dbUser?.consent_given) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [isSignedIn, loading, dbUser?.consent_given]);

  if (!isSignedIn || loading) return children;

  if (dbUser?.consent_given) return children;

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
