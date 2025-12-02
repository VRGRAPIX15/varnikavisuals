import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import Gallery from './Gallery';

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Gallery /> : <Login />;
};

export default Index;
