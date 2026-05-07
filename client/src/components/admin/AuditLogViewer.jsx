import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Filter, X } from 'lucide-react';
import { adminAPI } from '../../lib/api';

export default function AuditLogViewer({ filterUserId = null, onError }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState(filterUserId || '');
  const [appliedFilter, setAppliedFilter] = useState(filterUserId || null);

  // Load audit logs when page or filter changes
  useEffect(() => {
    const loadAuditLogs = async () => {
      setLoading(true);
      try {
        const result = await adminAPI.getAuditLog(
          pagination.page,
          50,
          appliedFilter || null
        );
        setLogs(result.logs || []);
        setPagination({
          page: result.page || 1,
          totalPages: result.totalPages || 1,
          total: result.total || 0,
        });
      } catch (error) {
        console.error('Failed to load audit logs:', error);
        if (onError) {
          onError('Failed to load audit logs');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, [pagination.page, appliedFilter, onError]);

  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleApplyFilter = useCallback(() => {
    setAppliedFilter(userIdFilter.trim() || null);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  }, [userIdFilter]);

  const handleClearFilter = useCallback(() => {
    setUserIdFilter('');
    setAppliedFilter(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionTypeLabel = (actionType) => {
    switch (actionType) {
      case 'credit_adjustment':
        return 'Credit Adjustment';
      default:
        return actionType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'credit_adjustment':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-400 dark:text-white/40" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/70 uppercase tracking-wider">
            Filter Logs
          </h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by User ID (optional)"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent transition-all"
          />
          <button
            onClick={handleApplyFilter}
            className="btn-secondary px-4 py-2"
          >
            Apply
          </button>
          {appliedFilter && (
            <button
              onClick={handleClearFilter}
              className="btn-secondary px-3 py-2"
              title="Clear filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {appliedFilter && (
          <div className="mt-2 text-sm text-gray-500 dark:text-white/50">
            Filtering by User ID: <span className="font-medium">{appliedFilter}</span>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="mt-2 text-sm text-gray-500 dark:text-white/50 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{pagination.total} log entr{pagination.total !== 1 ? 'ies' : 'y'} found</span>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-dream-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-white/50">
              {appliedFilter ? 'No audit logs found for this user' : 'No audit logs found'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Target User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-white/60 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.admin_email}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-600 dark:text-white/60">
                          User ID: {log.target_user_id}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                          {getActionTypeLabel(log.action_type)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700 dark:text-white/70">
                          {log.action_details && (
                            <div className="space-y-1">
                              {log.action_details.amount !== undefined && (
                                <p>
                                  <span className="font-medium">Amount:</span>{' '}
                                  <span className={log.action_details.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {log.action_details.amount >= 0 ? '+' : ''}{log.action_details.amount}
                                  </span>
                                </p>
                              )}
                              {log.action_details.reason && (
                                <p>
                                  <span className="font-medium">Reason:</span> {log.action_details.reason}
                                </p>
                              )}
                              {log.previous_value !== null && log.previous_value !== undefined && (
                                <p className="text-xs text-gray-500 dark:text-white/50">
                                  Previous: {log.previous_value} → New: {log.new_value}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                        {getActionTypeLabel(log.action_type)}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-2">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-white/50">Admin: </span>
                      <span className="font-medium text-gray-900 dark:text-white">{log.admin_email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-white/50">Target User: </span>
                      <span className="text-gray-700 dark:text-white/70">ID {log.target_user_id}</span>
                    </div>
                    
                    {log.action_details && (
                      <div className="pt-2 border-t border-gray-200 dark:border-white/10 space-y-1">
                        {log.action_details.amount !== undefined && (
                          <p>
                            <span className="text-gray-500 dark:text-white/50">Amount: </span>
                            <span className={`font-medium ${log.action_details.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {log.action_details.amount >= 0 ? '+' : ''}{log.action_details.amount}
                            </span>
                          </p>
                        )}
                        {log.action_details.reason && (
                          <p>
                            <span className="text-gray-500 dark:text-white/50">Reason: </span>
                            <span className="text-gray-700 dark:text-white/70">{log.action_details.reason}</span>
                          </p>
                        )}
                        {log.previous_value !== null && log.previous_value !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-white/50">
                            Previous: {log.previous_value} → New: {log.new_value}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                <p className="text-sm text-gray-500 dark:text-white/50">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
