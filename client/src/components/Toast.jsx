import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const toastIcons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-dream-500" />,
};

const toastStyles = {
  success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
  error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
  info: 'border-dream-200 dark:border-dream-800 bg-dream-50 dark:bg-dream-900/20',
};

export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-slide-in ${toastStyles[type]}`}>
      {toastIcons[type]}
      <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
      <button onClick={onClose} className="ml-1 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

let toastCallback = null;
export function showToast(message, type = 'info') {
  if (toastCallback) toastCallback(message, type);
}

export function setToastHandler(fn) {
  toastCallback = fn;
}