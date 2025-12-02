// Updated AuthContext for Client app with real backend integration
// File: Client_new/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientApi, User } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = clientApi.getToken();
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await clientApi.me();
      
      if (res.ok && res.user) {
        setUser(res.user);
        
        // Start auto-sync if authenticated
        clientApi.startAutoSync((data) => {
          // Handle background sync updates
          console.log('Auto-sync update:', data);
        });
      } else {
        // Token invalid, clear it
        clientApi.clearToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clientApi.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await clientApi.login(username, password);
      
      if (res.ok && res.token && res.user) {
        clientApi.setToken(res.token);
        setUser(res.user);
        
        // Start auto-sync
        clientApi.startAutoSync((data) => {
          console.log('Auto-sync update:', data);
        });
        
        toast({
          title: "Welcome!",
          description: `Logged in as ${res.user.displayName || res.user.userId}`,
        });
        
        navigate('/gallery');
        return true;
      } else {
        toast({
          title: "Login Failed",
          description: res.error || "Invalid credentials",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await clientApi.logout();
      
      clientApi.clearToken();
      setUser(null);
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      clientApi.clearToken();
      setUser(null);
      navigate('/login');
    }
  };

  const refreshUser = async () => {
    const token = clientApi.getToken();
    if (!token) return;

    try {
      const res = await clientApi.me();
      if (res.ok && res.user) {
        setUser(res.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}