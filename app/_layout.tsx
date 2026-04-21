import { Stack } from "expo-router";
import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../context/AppContext";

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
