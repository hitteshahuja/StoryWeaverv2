import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { adminAPI } from '../../lib/api';

export default function UserSearch({ onUserSelect, onError }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on new search
    }, 300); // 300ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Load users when debounced query or page changes
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const result = await adminAPI.searchUsers(debouncedQuery, pagination.page, 20);
        setUsers(result.users || []);
        setPagination({
          page: result.page || 1,
          totalPages: result.totalPages || 1,
          total: result.total || 0,
        });
      } catch (error) {
        console.error('Failed to load users:', error);
        if (onError) {
          onError('Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [debouncedQuery, pagination.page, onError]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUserClick = useCallback((user) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
  }, [onUserSelect]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent transition-all"
          />
        </div>
        {pagination.total > 0 && (
          <div className="mt-2 text-sm text-gray-500 dark:text-white/50 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{pagination.total} user{pagination.total !== 1 ? 's' : ''} found</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-dream-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-white/50">
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 dark:text-white/50">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-dream-100 dark:bg-dream-500/20 text-dream-700 dark:text-dream-300">
                          {user.credits}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.subscription_status
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50'
                        }`}>
                          {user.subscription_status ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-white/50">
                        {new Date(user.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          className="btn-secondary text-sm py-2 px-4"
                          onClick={() => handleUserClick(user)}
                        >
                          Adjust Credits
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 dark:text-white/50 break-all">{user.email}</p>
                    </div>
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.subscription_status
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50'
                    }`}>
                      {user.subscription_status ? 'Premium' : 'Free'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-white/50">Credits: </span>
                        <span className="font-medium text-dream-600 dark:text-dream-300">{user.credits}</span>
                      </div>
                      <div className="text-gray-400 dark:text-white/40">
                        {new Date(user.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full btn-secondary text-sm py-2"
                    onClick={() => handleUserClick(user)}
                  >
                    Adjust Credits
                  </button>
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
