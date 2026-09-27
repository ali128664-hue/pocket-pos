import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard } from 'lucide-react-native';
import { colors } from '../../src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.neutral[200],
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
