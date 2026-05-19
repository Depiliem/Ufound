import AsyncStorage from "@react-native-async-storage/async-storage"; // Tambahkan import ini
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native"; // Tambahkan AppState
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";
import { deepLinkStore } from "../lib/deepLinkStore";
import { supabase } from "../lib/supabase"; // Tambahkan import ini jika dipakai untuk logout

// ── KONSTANTA UNTUK SESI ──────────────────────────────────────────────────
const LAST_ACTIVE_KEY = "last_active_time";
const USER_KEY = "current_user";
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000; // 3 Hari

// ── FUNGSI PEMBANTU (LANGSUNG DI SINI) ────────────────────────────────────
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

      // Jika selisih waktu sekarang dengan waktu terakhir > 3 hari
      if (currentTime - lastActiveTime > THREE_DAYS_IN_MS) {
        console.log(
          "[Sesi] 🕒 Sesi habis (lebih dari 3 hari). Menghapus data...",
        );
        await AsyncStorage.multiRemove([USER_KEY, LAST_ACTIVE_KEY]);
        await supabase.auth.signOut(); // Opsional, bersihkan jika pakai sesi supabase

        router.replace("/"); // Lempar ke halaman login awal
        return true;
      }
    }

    // Jika belum 3 hari, perbarui waktu aktifnya menjadi saat ini
    await updateLastActiveTime();
    return false;
  } catch (error) {
    console.error("Gagal mengecek sesi:", error);
    return false;
  }
};

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
    // ── 1. JALANKAN PENGECEKAN SESI AUTO-LOGOUT ─────────────────────────
    // Cek saat aplikasi pertama kali dibuka (Cold Start)
    checkInactivityAndLogout();

    // Cek setiap kali aplikasi berubah status (ke background atau kembali dibuka)
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkInactivityAndLogout();
        } else if (
          nextAppState === "background" ||
          nextAppState === "inactive"
        ) {
          updateLastActiveTime();
        }
      },
    );

    // ── 2. LOGIKA DEEP LINKING (KODE ASLI KAMU) ─────────────────────────
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

    // ── 3. CLEANUP ────────────────────────────────────────────────────────
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
