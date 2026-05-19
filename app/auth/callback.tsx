import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { deepLinkStore } from "../../lib/deepLinkStore";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const [message, setMessage] = useState("Memverifikasi link…");
  // Gunakan useRef bukan module-level variable
  // agar guard terikat ke instance komponen, bukan ke module
  let _callbackHandled = false;

  useEffect(() => {
    // Guard per-instance, bukan per-module
    if (_callbackHandled) return;
    _callbackHandled = true;

    const url = deepLinkStore.get();
    // Jangan clear dulu sebelum handleDeepLink selesai
    // Clear hanya setelah URL berhasil dibaca

    console.log("[Callback] URL dari store:", url ? url.substring(0, 80) + "…" : null);

    if (!url) {
      console.log("[Callback] ❌ Tidak ada URL di store");
      router.replace({ pathname: "/register", params: { verified: "error" } });
      return;
    }

    // Clear SETELAH berhasil dibaca, bukan sebelum diproses
    deepLinkStore.clear();
    handleDeepLink(url);

    // Tidak perlu reset isHandled di cleanup
    // karena useRef tidak bocor ke instance lain
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      const allParams = parseAllParams(url);
      const token_hash = allParams["token_hash"];
      const access_token = allParams["access_token"];
      const refresh_token = allParams["refresh_token"];
      const type = allParams["type"];
      const error = allParams["error"];
      const error_desc = allParams["error_description"];

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

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2B7FE0" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#161C2C", alignItems: "center", justifyContent: "center", gap: 16 },
  text: { color: "#8A9AB8", fontSize: 14 },
});