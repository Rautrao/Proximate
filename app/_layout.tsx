import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Slim, theme-matched scrollbars on web. Injected once at app start so
// every screen inherits the same chrome.
const WEB_SCROLLBAR_CSS = `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #09090b; }
  ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
  html { scrollbar-color: #27272a #09090b; scrollbar-width: thin; }
  body { background: #09090b; }
`;

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('proximate-scrollbar')) return;
    const style = document.createElement('style');
    style.id = 'proximate-scrollbar';
    style.textContent = WEB_SCROLLBAR_CSS;
    document.head.appendChild(style);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="sos-active"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
