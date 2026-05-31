import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Hide native scrollbars entirely on web (track + thumb). The page still
// scrolls via wheel / trackpad / touch — this is the same pattern Apple,
// Instagram, etc. use to avoid a chunky chrome strip overlapping content.
// Aggressively hide scrollbars on every scrollable element, not just the
// document. Expo Web's <ScrollView> renders as a div with overflow:auto
// and gets its OWN scrollbar separate from the page — both need to be
// killed, hence the universal selector + !important.
const WEB_SCROLLBAR_CSS = `
  *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
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
