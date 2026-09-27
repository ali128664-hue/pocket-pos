import React from 'react';
import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="adjust-stock/[id]" />
      <Stack.Screen name="categories" />
    </Stack>
  );
}
