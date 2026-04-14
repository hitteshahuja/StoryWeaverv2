import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Info, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import LegalConfig from '../config/legalConfig';

function Toggle({ checked, onChange, label, description, mandatory }) {
  return (
    <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-white/5 border-gray-200 dark:border-white/10">
      <div className="pt-0.5">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? 'bg-dream-500' : 'bg-gray-200 dark:bg-white/10'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
          {mandatory && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-dream-500/10 text-dream-600 dark:text-dream-300">
              Required
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-white/40 mt-1 leading-relaxed">{description}</p>
      </div>
    </label>
  );
}

function WhyTooltip({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-80 p-4 rounded-xl bg-white dark:bg-night-800 border border-gray-200 dark:border-white/10 shadow-xl z-50"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Why we ask this</h4>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-white/60 space-y-2 leading-relaxed">
            <p>
              <strong>For your child's protection:</strong> Laws like the US Children's Online Privacy Protection Act (COPPA) and the EU/UK GDPR require us to get <em>verifiable parental consent</em> before we can process any data about children under 13.
            </p>
            <p>
              <strong>What "processing" means:</strong> When you upload a photo, our AI looks at it to understand what your child looks like (hair colour, eye colour, etc.) so it can draw them in a storybook. The photo itself is deleted within 60 seconds.
            </p>
            <p>
              <strong>You're always in control:</strong> You can revoke any of these consents at any time from your dashboard. Revoking consent stops future processing immediately.
            </p>
            <p>
              <strong>Nothing is shared:</strong> We never sell data, never show ads, and never let children use the service without you.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ParentalConsentModal({ onConsent, loading }) {
  const [isAdult, setIsAdult] = useState(false);
  const [consentImage, setConsentImage] = useState(false);
  const [consentVoice, setConsentVoice] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const canContinue = isAdult && consentImage && consentPrivacy;

  const handleSubmit = () => {
    if (!canContinue) return;
    onConsent({
      is_adult_confirmed: true,
      consent_image_processing: consentImage,
      consent_voice_cloning: consentVoice,
      consent_privacy_policy: consentPrivacy,
      consent_timestamp: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-night-950/80 backdrop-blur-xl"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="relative w-full max-w-lg bg-white dark:bg-night-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
                <Shield className="w-5 h-5 text-dream-600 dark:text-dream-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Parental Consent</h2>
                <p className="text-xs text-gray-500 dark:text-white/40">Required before your family can use {LegalConfig.companyName}</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowWhy(!showWhy)}
                className="p-2 rounded-lg text-gray-400 hover:text-dream-500 hover:bg-dream-50 dark:hover:bg-dream-500/10 transition-colors"
                title="Why we ask this"
              >
                <Info className="w-4 h-4" />
              </button>
              <WhyTooltip isOpen={showWhy} onClose={() => setShowWhy(false)} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Age gate */}
          <Toggle
            checked={isAdult}
            onChange={setIsAdult}
            label="I confirm I am over 18 and the legal guardian of the children"
            description="We are required by law (COPPA/GDPR) to verify that a parent or legal guardian is providing consent. By checking this box, you confirm you have the authority to consent on behalf of your child."
            mandatory
          />

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Processing Consents</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          </div>

          {/* Image processing */}
          <Toggle
            checked={consentImage}
            onChange={setConsentImage}
            label="AI Image Processing"
            description="I consent to my child's uploaded photos being analysed by AI to extract physical features (hair colour, eye colour, etc.) for generating personalised illustrations. The raw photos are processed in memory only and permanently deleted within 60 seconds. Only AI-generated text descriptions are retained."
            mandatory
          />

          {/* Voice cloning */}
          <Toggle
            checked={consentVoice}
            onChange={setConsentVoice}
            label="AI Voice Cloning (Optional)"
            description="I consent to short voice samples (up to 15 seconds) being processed by AI to create a synthetic voice for text-to-speech narration. Raw voice samples are processed in memory and permanently deleted within 60 seconds. This feature is entirely optional."
          />

          {/* Privacy policy */}
          <Toggle
            checked={consentPrivacy}
            onChange={setConsentPrivacy}
            label={`I have read the ${LegalConfig.companyName} Privacy Policy`}
            description={
              <>
                I understand how my family's data is collected, processed, and stored. I am aware of my rights to access, export, and delete data at any time.{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-dream-500 hover:underline font-medium">
                  Read Privacy Policy →
                </a>
              </>
            }
            mandatory
          />

          {/* Warning when not all mandatory boxes checked */}
          {!canContinue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                All required boxes must be checked before you can continue. Voice cloning is optional.
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5">
          <button
            onClick={handleSubmit}
            disabled={!canContinue || loading}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              canContinue && !loading
                ? 'bg-dream-500 text-white hover:bg-dream-600 active:scale-[0.98] shadow-lg shadow-dream-500/20'
                : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving consent...
              </>
            ) : canContinue ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Continue
              </>
            ) : (
              'Please check all required boxes'
            )}
          </button>
          <p className="text-[10px] text-center text-gray-400 dark:text-white/30 mt-3">
            By continuing, you agree to {LegalConfig.companyName}'s Terms of Service and confirm you are the legal guardian.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
