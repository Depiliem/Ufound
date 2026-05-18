import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";
import { deepLinkStore } from "../lib/deepLinkStore";

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
    const navigateToCallback = (url: string) => {
      console.log("[Layout] 🔗 Simpan URL & navigasi ke callback");
      deepLinkStore.set(url); // simpan dulu sebelum navigasi
      router.push("/auth/callback");
    };

    // ── Foreground / background ───────────────────────────────────────────
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("[Layout] 🔗 Deep link diterima (foreground):", url);
      if (url.includes("auth/callback")) navigateToCallback(url);
    });

    // ── Cold start ────────────────────────────────────────────────────────
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log("[Layout] 🔗 Initial URL (cold start):", url);
        if (url.includes("auth/callback")) navigateToCallback(url);
      }
    });

    return () => subscription.remove();
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