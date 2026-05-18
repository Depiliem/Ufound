import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { deepLinkStore } from "../../lib/deepLinkStore";
import { supabase } from "../../lib/supabase";

// Module-level guard — bertahan meski komponen unmount/remount oleh StrictMode
let isHandled = false;

export default function AuthCallback() {
  const [message, setMessage] = useState("Memverifikasi link…");

  useEffect(() => {
    if (isHandled) return;
    isHandled = true;

    const url = deepLinkStore.get();
    deepLinkStore.clear(); // Store dibersihkan di sini, jadi tidak bisa dipanggil lagi di bawah

    console.log("[Callback] ══════ RAW URL ══════");
    console.log(
      "[Callback] URL dari store:",
      url ? url.substring(0, 80) + "…" : null,
    );

    if (!url) {
      console.log("[Callback] ❌ Tidak ada URL di store");
      router.replace({ pathname: "/register", params: { verified: "error" } });
      return;
    }

    handleDeepLink(url);

    // Reset guard saat unmount agar bisa dipakai lagi di sesi berikutnya
    return () => {
      isHandled = false;
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      const allParams = parseAllParams(url);
      console.log("[Callback] Params keys:", Object.keys(allParams).join(", "));

      const token_hash = allParams["token_hash"];
      const access_token = allParams["access_token"];
      const refresh_token = allParams["refresh_token"];
      const type = allParams["type"]; // <--- PERBAIKAN 1: Ekstrak tipe link (magiclink / recovery)
      const error = allParams["error"];
      const error_desc = allParams["error_description"];

      // Tentukan rute fallback jika terjadi error
      const errorPath = type === "recovery" ? "/forgot-password" : "/register";

      if (error) {
        console.log("[Callback] ❌ Error dari Supabase:", error, error_desc);
        router.replace({
          pathname: errorPath,
          params: { verified: "error" },
        });
        return;
      }

      // Format 1 — PKCE flow (token_hash)
      if (token_hash) {
        console.log("[Callback] ⏳ Format PKCE — verifyOtp...");
        setMessage("Memverifikasi token…");

        const { data, error: otpErr } = await supabase.auth.verifyOtp({
          token_hash,
          type: (type as any) || "magiclink", // <--- PERBAIKAN 2: Gunakan tipe dinamis, jangan hardcode "magiclink"
        });

        if (otpErr) throw otpErr;

        const email = data.user?.email ?? "";
        console.log("[Callback] ✅ PKCE berhasil, email:", email);
        redirect(email, type, url); // <--- PERBAIKAN 3: Kirim parameter type dan url mentah ke fungsi redirect
        return;
      }

      // Format 2 — Implicit flow (access_token + refresh_token)
      if (access_token && refresh_token) {
        console.log("[Callback] ⏳ Format Implicit — setSession...");
        setMessage("Memulai sesi…");

        const { data, error: sessErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessErr) throw sessErr;

        const email = data.user?.email ?? "";
        console.log("[Callback] ✅ Implicit berhasil, email:", email);
        redirect(email, type, url); // <--- PERBAIKAN 3: Kirim parameter type dan url mentah
        return;
      }

      console.log("[Callback] ❌ Tidak ada token ditemukan di URL");
      router.replace({ pathname: errorPath, params: { verified: "error" } });
    } catch (e: any) {
      console.error("[Callback] ❌ Exception:", e?.message);
      // Fallback ke login jika gagal memilah
      router.replace({ pathname: "./index" });
    }
  };

  // ── UPDATE: Logic Redirect Dinamis ──
  // Menambahkan parameter rawUrl untuk berjaga-jaga jika 'type' tidak terdeteksi langsung
  const redirect = (email: string, type?: string, rawUrl: string = "") => {
    setMessage("Berhasil! Mengarahkan…");

    // Deteksi jika ini adalah jalur Lupa Password
    const isRecovery = type === "recovery" || rawUrl.includes("type=recovery");

    // Jika recovery, arahkan ke forgot-password. Jika tidak, ke register.
    const targetPath = isRecovery ? "/forgot-password" : "/register";

    console.log(`[Callback] 🔀 Mengarahkan user ke: ${targetPath}`);

    router.replace({
      pathname: targetPath,
      params: { verified: "true", email },
    });
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
            const key = decodeURIComponent(pair.substring(0, idx));
            const val = decodeURIComponent(pair.substring(idx + 1));
            result[key] = val;
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
  container: {
    flex: 1,
    backgroundColor: "#161C2C",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: { color: "#8A9AB8", fontSize: 14 },
});
