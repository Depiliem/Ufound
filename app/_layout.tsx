import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";
import { deepLinkStore } from "../lib/deepLinkStore";
import { supabase } from "../lib/supabase";

const LAST_ACTIVE_KEY = "last_active_time";
const USER_KEY = "current_user";
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

// ── FUNGSI PEMBANTU PUSH NOTIFICATION PERMISSION ──────────────────────────
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Gagal mendapatkan token untuk push notification!');
    return;
  }
}

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

export default function RootLayout() {
  // FIX ERROR 2: Berikan tipe data 'any' atau 'Subscription' dari expo-notifications
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    const updateLastActiveTime = async () => {
      try {
        await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } catch (error) {
        console.error("Gagal update waktu aktif:", error);
      }
    };

    // Fungsi mengecek durasi tidak aktif hanya ketika aplikasi kembali dibuka dari background
    const checkInactivityOnResume = async () => {
      try {
        const userString = await AsyncStorage.getItem(USER_KEY);
        const lastActiveString = await AsyncStorage.getItem(LAST_ACTIVE_KEY);

        if (userString && lastActiveString) {
          const lastActiveTime = parseInt(lastActiveString, 10);
          const currentTime = Date.now();

          // Skenario jika ditinggal lebih dari 3 hari saat aplikasi diminimize
          if (currentTime - lastActiveTime > THREE_DAYS_IN_MS) {
            console.log(
              "[Sesi] Kedaluwarsa dari background. Menghapus sesi...",
            );
            await AsyncStorage.multiRemove([USER_KEY, LAST_ACTIVE_KEY]);
            await supabase.auth.signOut();
            router.replace("/");
          }
        }
      } catch (error) {
        console.error("Gagal memeriksa sesi resume:", error);
      }
    };

    // ── MONITOR STATUS APLIKASI (BACKGROUND / FOREGROUND) ──
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkInactivityOnResume();
        } else if (
          nextAppState === "background" ||
          nextAppState === "inactive"
        ) {
          updateLastActiveTime();
        }
      },
    );

    // ── DEEP LINKING ──
    const navigateToCallback = (url: string) => {
      console.log("[Layout] 🔗 Simpan URL & navigasi ke callback");
      deepLinkStore.set(url);
      router.push("/auth/callback");
    };

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("auth/callback")) navigateToCallback(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/callback")) navigateToCallback(url);
    });

    return () => {
      appStateSubscription.remove();
      linkingSubscription.remove();
      
      // Panggil metode .remove() langsung dari instance target object-nya
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <GlobalSafeArea>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="report" />
            <Stack.Screen name="admin" />
          </Stack>
        </GlobalSafeArea>
      </AppProvider>
    </SafeAreaProvider>
  );
}