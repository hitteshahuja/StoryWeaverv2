import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { usersAPI } from '../lib/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attach getToken to window so the api interceptor can use it
    window.__clerkGetToken = { getToken };
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn || !clerkUser) {
      setDbUser(null);
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      try {
        const data = await usersAPI.sync({
          email: clerkUser.primaryEmailAddress?.emailAddress,
          name: clerkUser.fullName,
        });
        setDbUser(data);
      } catch (err) {
        console.error('User sync failed:', err);
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, [isSignedIn, clerkUser]);

  const refreshUser = async () => {
    try {
      const data = await usersAPI.me();
      setDbUser(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const purchasedFonts = dbUser?.purchased_fonts
    ? dbUser.purchased_fonts.split(',').filter(Boolean)
    : [];

  return (
    <UserContext.Provider value={{ dbUser, loading, refreshUser, setDbUser, purchasedFonts }}>
      {children}
    </UserContext.Provider>
  );
}

export const useDbUser = () => useContext(UserContext);
