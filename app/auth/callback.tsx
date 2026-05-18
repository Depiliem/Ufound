/**
 * app/auth/callback.tsx
 * Menangkap deep link dari magic link email
 * Deep link: ufound://auth/callback?token_hash=xxx&type=magiclink
 *
 * Setelah verifikasi berhasil → redirect ke /sso?verified=true&email=xxx
 */

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    token_hash?: string;
    type?:       string;
    error?:      string;
    error_description?: string;
  }>();

  const [message, setMessage] = useState("Memverifikasi link…");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    // Kalau ada error dari Supabase
    if (params.error) {
      console.error("[Callback] Error dari Supabase:", params.error_description);
      router.replace({ pathname: "/sso", params: { verified: "error" } });
      return;
    }

    const token_hash = params.token_hash;
    const type       = params.type;

    console.log("[Callback] token_hash:", token_hash ? token_hash.substring(0, 12) + "..." : "tidak ada");
    console.log("[Callback] type:", type);

    if (!token_hash) {
      setMessage("Token tidak ditemukan…");
      router.replace({ pathname: "/sso", params: { verified: "error" } });
      return;
    }

    try {
      setMessage("Memverifikasi token…");

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (error) throw error;

      const email = data.user?.email ?? "";
      console.log("[Callback] ✅ Berhasil, email:", email);

      setMessage("Berhasil! Mengarahkan…");

      // Redirect ke sso dengan flag verified + email
      router.replace({
        pathname: "/sso",
        params: { verified: "true", email },
      });

    } catch (e: any) {
      console.error("[Callback] ❌ Gagal:", e?.message);
      router.replace({ pathname: "/sso", params: { verified: "error" } });
    }
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