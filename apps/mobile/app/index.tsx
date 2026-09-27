import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Starting PocketPOS..." fullScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
