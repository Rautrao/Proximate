import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Hide native scrollbars entirely on web (track + thumb). The page still
// scrolls via wheel / trackpad / touch — this is the same pattern Apple,
// Instagram, etc. use to avoid a chunky chrome strip overlapping content.
// Aggressively hide scrollbars on every scrollable element + define the
// infinite-marquee animation used by the trust strip on the welcome page.
const WEB_SCROLLBAR_CSS = `
  *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  body { background: #09090b; }

  @keyframes proximate-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .proximate-marquee {
    animation: proximate-marquee 40s linear infinite;
    will-change: transform;
  }
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
