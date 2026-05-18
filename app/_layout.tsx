import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";
 
// ── Konfigurasi tampilan notifikasi saat app sedang FOREGROUND ─────────────
// Ini yang bikin notif muncul di atas layar (banner) meski app sedang dibuka
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // tampilkan banner di atas layar
    shouldPlaySound: true,    // mainkan suara
    shouldSetBadge: false,
    shouldShowBanner: true,   // iOS 14+ — banner di atas layar
    shouldShowList: true,     // iOS — tampil di notification center
  }),
});
 
function GlobalSafeArea({ children }: { children: React.ReactNode }) {
  const { currentTheme } = useAppContext();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      edges={["top", "bottom"]}
    >
      {children}
    </SafeAreaView>
  );
}
 
function NotificationHandler() {
  // Listener untuk notifikasi yang DITERIMA saat app foreground
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  // Listener untuk notifikasi yang DITEKAN user (dari mana saja)
  const responseListener = useRef<Notifications.Subscription | null>(null);
 
  useEffect(() => {
    // Saat notifikasi masuk ketika app sedang buka — cukup tampilkan saja
    // (handler di atas sudah mengurus banner-nya)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Bisa tambahkan log atau state update di sini jika diperlukan
      });
 
    // Saat user MENEKAN notifikasi — navigasi ke halaman detail item
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          url?: string;
        };
        // data.url diisi "/detail/<id>" dari admin.tsx saat kirim notif
        if (data?.url) {
          router.push(data.url as any);
        }
      });
 
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
 
  return null;
}
 
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <GlobalSafeArea>
          {/* Handler notifikasi dipasang di level root agar selalu aktif */}
          <NotificationHandler />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="report" />
          </Stack>
        </GlobalSafeArea>
      </AppProvider>
    </SafeAreaProvider>
  );
}
 
