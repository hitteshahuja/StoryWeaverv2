import { X, Sparkles } from 'lucide-react';

export default function CreditModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md card border border-dream-500/30 shadow-dream-lg animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
        </button>

        <div className="text-center py-4">
          <div className="inline-flex p-3 rounded-2xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20 mb-4">
            <Sparkles className="w-7 h-7 text-gold-600 dark:text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">You're out of credits!</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-2 max-w-xs mx-auto">
            AI DreamWeaver is currently in beta. Paid plans are coming soon — stay tuned!
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dream-500/10 border border-dream-500/20 text-dream-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-dream-400 animate-pulse" />
            Beta — Payments coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
