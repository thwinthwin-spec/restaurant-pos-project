import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me'),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const setup = useQuery({
    queryKey: ['setup'],
    queryFn: () => api.get('/setup/status'),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const onExpired = () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.removeQueries({ predicate: (query) => !['auth', 'setup'].includes(query.queryKey[0]) });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [queryClient]);

  const setUser = useCallback((user) => queryClient.setQueryData(['auth', 'me'], { user }), [queryClient]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // The local session is cleared even if the network call fails.
    }
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.removeQueries({ predicate: (query) => !['auth', 'setup'].includes(query.queryKey[0]) });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: session.data?.user || null,
      isLoading: session.isLoading,
      setup: setup.data || null,
      isSetupLoading: setup.isLoading,
      setUser,
      logout,
      refreshSetup: () => setup.refetch(),
    }),
    [session.data, session.isLoading, setup.data, setup.isLoading, setup.refetch, setUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
