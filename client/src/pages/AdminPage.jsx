import { useEffect, useState, useCallback } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, AlertCircle, History } from 'lucide-react';
import StarField from '../components/StarField';
import Footer from '../components/Footer';
import UserSearch from '../components/admin/UserSearch';
import CreditAdjustmentModal from '../components/admin/CreditAdjustmentModal';
import AuditLogViewer from '../components/admin/AuditLogViewer';
import { adminAPI } from '../lib/api';
import { Toast } from '../components/Toast';

export default function AdminPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true = admin, false = not admin
  const [toast, setToast] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const handleUserSelect = useCallback((user) => {
    setSelectedUser(user);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleAdjustmentSuccess = useCallback((data) => {
    showToast(`Credits adjusted successfully. New balance: ${data.newBalance}`, 'success');
    // Optionally refresh the user list or audit log here
  }, [showToast]);

  const handleSearchError = useCallback((errorMessage) => {
    showToast(errorMessage, 'error');
  }, [showToast]);

  const handleAuditLogError = useCallback((errorMessage) => {
    showToast(errorMessage, 'error');
  }, [showToast]);

  // Check admin authorization on mount
  useEffect(() => {
    if (!isSignedIn) return;

    const verifyAdmin = async () => {
      try {
        const result = await adminAPI.verify();
        if (result.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          showToast('Access denied. Admin privileges required.', 'error');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error) {
        setIsAdmin(false);
        showToast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    verifyAdmin();
  }, [isSignedIn, navigate, showToast]);

  // Redirect if not signed in
  if (!isSignedIn) return <RedirectToSignIn />;

  // Show loading state while checking admin status
  if (isAdmin === null) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <StarField />
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-dream-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-white/50">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin (brief moment before redirect)
  if (isAdmin === false) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <StarField />
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-white/50">You do not have admin privileges.</p>
          <p className="text-sm text-gray-400 dark:text-white/40 mt-2">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="p-2.5 rounded-xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
            <Shield className="w-5 h-5 text-dream-600 dark:text-dream-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-white/50 text-sm">Manage users and credits</p>
          </div>
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
          >
            <History className="w-4 h-4" />
            {showAuditLog ? 'Hide Audit Log' : 'View Audit Log'}
          </button>
        </div>

        {/* User Search Component */}
        {!showAuditLog && (
          <UserSearch onUserSelect={handleUserSelect} onError={handleSearchError} />
        )}

        {/* Audit Log Viewer */}
        {showAuditLog && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Audit Log</h2>
              <p className="text-gray-500 dark:text-white/50 text-sm">
                View all administrative actions and credit adjustments
              </p>
            </div>
            <AuditLogViewer onError={handleAuditLogError} />
          </div>
        )}
      </div>

      <Footer />
      
      {/* Credit Adjustment Modal */}
      {selectedUser && (
        <CreditAdjustmentModal
          user={selectedUser}
          onClose={handleCloseModal}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
