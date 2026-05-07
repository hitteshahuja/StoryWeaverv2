import { useState } from 'react';
import { X, Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { adminAPI } from '../../lib/api';

export default function CreditAdjustmentModal({ user, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!amount || amount.trim() === '') {
      errors.amount = 'Amount is required';
    } else if (isNaN(amount)) {
      errors.amount = 'Amount must be a valid number';
    } else if (parseFloat(amount) === 0) {
      errors.amount = 'Amount cannot be zero';
    }
    
    if (!reason || reason.trim() === '') {
      errors.reason = 'Reason is required';
    } else if (reason.trim().length < 3) {
      errors.reason = 'Reason must be at least 3 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await adminAPI.adjustCredits(
        user.id,
        parseFloat(amount),
        reason.trim()
      );
      
      setSuccess({
        message: 'Credit adjustment successful',
        newBalance: result.newBalance
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Reset form
      setAmount('');
      setReason('');
      setValidationErrors({});
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Credit adjustment error:', err);
      
      if (err.response?.status === 404) {
        setError('User not found');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Invalid request. Please check your input.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to perform this action');
      } else {
        setError(err.response?.data?.message || 'Failed to adjust credits. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    if (validationErrors.amount) {
      setValidationErrors({ ...validationErrors, amount: '' });
    }
  };

  const handleReasonChange = (e) => {
    setReason(e.target.value);
    if (validationErrors.reason) {
      setValidationErrors({ ...validationErrors, reason: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md card border border-dream-500/30 shadow-dream-lg animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          disabled={loading}
        >
          <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
        </button>

        <div className="py-4">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20 mb-4">
              <Coins className="w-7 h-7 text-gold-600 dark:text-gold-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adjust Credits</h2>
            <p className="text-gray-500 dark:text-white/50 text-sm mt-2">
              {user.email}
            </p>
            <p className="text-gray-600 dark:text-white/60 text-sm mt-1">
              Current balance: <span className="font-semibold text-gold-600 dark:text-gold-400">{user.credits} credits</span>
            </p>
          </div>

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {success.message}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  New balance: <span className="font-semibold">{success.newBalance} credits</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300 flex-1">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="e.g., 5 or -3"
                step="any"
                disabled={loading || success}
                className={`w-full px-3 py-2 rounded-lg border ${
                  validationErrors.amount
                    ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500'
                    : 'border-gray-300 dark:border-white/10 focus:ring-dream-500'
                } bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {validationErrors.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.amount}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Use positive numbers to add credits, negative to subtract
              </p>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={handleReasonChange}
                placeholder="e.g., Waitlist trial, Customer support resolution"
                rows={3}
                disabled={loading || success}
                className={`w-full px-3 py-2 rounded-lg border ${
                  validationErrors.reason
                    ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500'
                    : 'border-gray-300 dark:border-white/10 focus:ring-dream-500'
                } bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {validationErrors.reason && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.reason}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 px-4 py-2 rounded-lg bg-dream-500 hover:bg-dream-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adjusting...' : success ? 'Success!' : 'Adjust Credits'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
