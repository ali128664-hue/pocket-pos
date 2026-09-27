import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f8fafc' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
