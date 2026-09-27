import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ShopProvider, useShop } from '../src/context/ShopContext';
import { CartProvider } from '../src/context/CartContext';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

function RootNavigation() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { hasShop, isLoadingShop } = useShop();
  const segments = useSegments();
  const router = useRouter();

  const isResolving = isAuthLoading || (isAuthenticated && isLoadingShop);

  useEffect(() => {
    if (isResolving) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // User is authenticated
      if (!hasShop) {
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)/create-shop');
        }
      } else {
        // User is authenticated and has an active shop membership
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isAuthenticated, hasShop, isResolving, segments, router]);

  if (isResolving) {
    return <LoadingSpinner message="Starting PocketPOS..." fullScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sale-success" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShopProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <RootNavigation />
          </CartProvider>
        </ShopProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
