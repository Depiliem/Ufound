import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppContext } from "../../context/AppContext"; // <--- Import context tema
import { deepLinkStore } from "../../lib/deepLinkStore";
import { supabase } from "../../lib/supabase";

// ─── Module-level guard ────────────────────────────────────────────────────────
// useRef TIDAK cukup karena React StrictMode (development/Expo Go) sengaja
// unmount → remount komponen, sehingga setiap instance punya useRef baru (false).
// Module-level variable survive siklus unmount→remount tersebut.
//
// Reset logic: jika store masih punya URL (deep link baru masuk),
// guard direset agar magic link berikutnya tetap bisa diproses.
let _callbackHandled = false;

export default function AuthCallback() {
  const { currentTheme } = useAppContext(); // <--- Ambil tema saat ini
  const [message, setMessage] = useState("Memverifikasi link…");

  useEffect(() => {
    const url = deepLinkStore.get();

    // Jika store masih ada URL → invokasi pertama (atau deep link baru).
    // Reset guard supaya magic link berikutnya tetap jalan.
    if (url) _callbackHandled = false;

    // Guard: sudah ditangani dan tidak ada URL baru → StrictMode re-run, skip.
    if (_callbackHandled) return;
    _callbackHandled = true;

    console.log("[Callback] URL dari store:", url ? url.substring(0, 80) + "…" : null);

    if (!url) {
      console.log("[Callback] ❌ Tidak ada URL di store");
      router.replace({ pathname: "/register", params: { verified: "error" } });
      return;
    }

    deepLinkStore.clear();
    handleDeepLink(url);
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      const allParams = parseAllParams(url);
      const token_hash = allParams["token_hash"];
      const access_token = allParams["access_token"];
      const refresh_token = allParams["refresh_token"];
      const type = allParams["type"];
      const error = allParams["error"];

      const errorPath = type === "recovery" ? "/forgot-password" : "/register";

      if (error) {
        router.replace({ pathname: errorPath, params: { verified: "error" } });
        return;
      }

      if (token_hash) {
        setMessage("Memverifikasi token…");
        const { data, error: otpErr } = await supabase.auth.verifyOtp({
          token_hash,
          type: (type as any) || "magiclink",
        });
        if (otpErr) throw otpErr;
        redirect(data.user?.email ?? "", type, url);
        return;
      }

      if (access_token && refresh_token) {
        setMessage("Memulai sesi…");
        const { data, error: sessErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessErr) throw sessErr;
        redirect(data.user?.email ?? "", type, url);
        return;
      }

      router.replace({ pathname: errorPath, params: { verified: "error" } });
    } catch (e: any) {
      console.error("[Callback] ❌ Exception:", e?.message);
      router.replace({ pathname: "./index" });
    }
  };

  const redirect = (email: string, type?: string, rawUrl: string = "") => {
    setMessage("Berhasil! Mengarahkan…");
    const isRecovery = type === "recovery" || rawUrl.includes("type=recovery");
    const targetPath = isRecovery ? "/forgot-password" : "/register";
    router.replace({ pathname: targetPath, params: { verified: "true", email } });
  };

  const parseAllParams = (url: string): Record<string, string> => {
    const result: Record<string, string> = {};
    try {
      const [base, fragment] = url.split("#");
      const queryString = base.includes("?") ? base.split("?")[1] : "";
      const parsePairs = (str: string) => {
        if (!str) return;
        str.split("&").forEach((pair) => {
          const idx = pair.indexOf("=");
          if (idx > -1) {
            result[decodeURIComponent(pair.substring(0, idx))] =
              decodeURIComponent(pair.substring(idx + 1));
          }
        });
      };
      parsePairs(queryString);
      parsePairs(fragment ?? "");
    } catch (e) {
      console.error("[Callback] Parse error:", e);
    }
    return result;
  };

  // ─── Tema dinamis ───
  const theme = {
    bg: currentTheme.background,
    text: currentTheme.textSecondary,
    primary: "#2B7FE0",
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
    </View>
  );
}

// Hardcode warna dihapus dari StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text: { fontSize: 14 },
});