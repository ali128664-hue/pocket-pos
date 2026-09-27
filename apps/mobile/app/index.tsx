import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useShop } from '../src/context/ShopContext';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { hasShop, isLoadingShop } = useShop();

  const isResolving = isAuthLoading || (isAuthenticated && isLoadingShop);

  if (isResolving) {
    return <LoadingSpinner message="Starting PocketPOS..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasShop) {
    return <Redirect href="/(onboarding)/create-shop" />;
  }

  return <Redirect href="/(tabs)" />;
}
