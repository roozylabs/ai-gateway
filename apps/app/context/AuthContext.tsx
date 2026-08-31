'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { User, LoginRequest, apiLogin, apiLogout, apiGetMe } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => Cookies.get('auth_token') || null);

  useEffect(() => {
    const currentToken = Cookies.get('auth_token') || null;
    if (currentToken !== token) {
      setToken(currentToken);
    }
  }, [token]);

  const {
    data: user = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: apiGetMe,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (data) => {
      Cookies.set('auth_token', data.token, { expires: 7, path: '/', sameSite: 'lax' });
      setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const login = async (credentials: LoginRequest) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore network errors or already expired tokens on logout
    } finally {
      Cookies.remove('auth_token', { path: '/' });
      Cookies.remove('auth_token');
      setToken(null);
      queryClient.clear();
      window.location.href = '/signin';
    }
  };

  const isAuthenticated = !!token && !!user && !isError;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading: isLoading && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
