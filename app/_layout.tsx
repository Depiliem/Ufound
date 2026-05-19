import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";
import { deepLinkStore } from "../lib/deepLinkStore";
import { supabase } from "../lib/supabase";

// ── KONSTANTA UNTUK SESI ──────────────────────────────────────────────────
const LAST_ACTIVE_KEY = "last_active_time";
const USER_KEY = "current_user";
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000; // 3 Hari

// ── FIX ERROR 1: SINKRONISASI COCOK SIFAT SDK BARU EXPO NOTIFICATIONS ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Tambahan wajib SDK baru
    shouldShowList: true,   // Tambahan wajib SDK baru
  }),
});

// ── FUNGSI PEMBANTU SESI ──────────────────────────────────────────────────
const updateLastActiveTime = async () => {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch (error) {
    console.error("Gagal update waktu aktif:", error);
  }
};

const checkInactivityAndLogout = async () => {
  try {
    const userString = await AsyncStorage.getItem(USER_KEY);
    const lastActiveString = await AsyncStorage.getItem(LAST_ACTIVE_KEY);

    if (userString && lastActiveString) {
      const lastActiveTime = parseInt(lastActiveString, 10);
      const currentTime = Date.now();

      if (currentTime - lastActiveTime > THREE_DAYS_IN_MS) {
        console.log("[Sesi] 🕒 Sesi habis (lebih dari 3 hari). Menghapus data...");
        await AsyncStorage.multiRemove([USER_KEY, LAST_ACTIVE_KEY]);
        await supabase.auth.signOut();

        router.replace("/");
        return true;
      }
    }

    await updateLastActiveTime();
    return false;
  } catch (error) {
    console.error("Gagal mengecek sesi:", error);
    return false;
  }
};

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
    // ── 1. JALANKAN PENGECEKAN SESI AUTO-LOGOUT ─────────────────────────
    checkInactivityAndLogout();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkInactivityAndLogout();
        } else if (nextAppState === "background" || nextAppState === "inactive") {
          updateLastActiveTime();
        }
      },
    );

    // ── 2. PUSH NOTIFICATIONS SETUP ──────────────────────────────────────
    registerForPushNotificationsAsync();

    // Listener saat notifikasi masuk
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notif] Terima di Foreground:', notification);
    });

    // Listener saat Notifikasi DIKLIK oleh user
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[Notif] User mengklik banner notifikasi:', data);
      
      // FIX ERROR 3: Amankan navigasi String, pastikan datanya valid
      if (data && typeof data.url === 'string' && data.url.trim() !== '') {
        router.push(data.url as any); 
      }
    });

    // ── 3. LOGIKA DEEP LINKING AUTH CALLBACK ─────────────────────────────
    const navigateToCallback = (url: string) => {
      console.log("[Layout] 🔗 Simpan URL & navigasi ke callback");
      deepLinkStore.set(url);
      router.push("/auth/callback");
    };

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      console.log("[Layout] 🔗 Deep link diterima (foreground):", url);
      if (url.includes("auth/callback")) navigateToCallback(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[Layout] 🔗 Initial URL (cold start):", url);
        if (url.includes("auth/callback")) navigateToCallback(url);
      }
    });

    // ── 4. FIX ERROR 4: CARA CLEANUP SUBSCRIPTION YANG BENAR SESUAI SDK BARU ──
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