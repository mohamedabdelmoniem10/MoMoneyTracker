import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView, Platform, StatusBar } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CurrencyProvider } from '@/lib/CurrencyContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <CurrencyProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ExpoStatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              paddingTop:
                Platform.OS === 'android' ? StatusBar.currentHeight : 0,
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
      </SafeAreaView>
    </CurrencyProvider>
  );
}
