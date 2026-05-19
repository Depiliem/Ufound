import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
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
          </Stack>
        </GlobalSafeArea>
      </AppProvider>
    </SafeAreaProvider>
  );
}
