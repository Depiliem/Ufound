import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppContext } from "../../context/AppContext";
import { deepLinkStore } from "../../lib/deepLinkStore";
import { supabase } from "../../lib/supabase";

let _callbackHandled = false;

export default function AuthCallback() {
  const { currentTheme } = useAppContext();
  const [message, setMessage] = useState("Memverifikasi link…");

  useEffect(() => {
    const url = deepLinkStore.get();

    if (url) _callbackHandled = false;
    if (_callbackHandled) return;
    _callbackHandled = true;

    if (!url) {
      // Memberikan jeda sebelum melempar error agar tidak terjadi flash "Verifikasi gagal"
      // saat cold-start dimana deep link butuh sekian milidetik untuk ter-load.
      const timer = setTimeout(() => {
        if (!deepLinkStore.get()) {
          console.log("[Callback] ❌ Tidak ada URL di store");
          router.replace({
            pathname: "/register",
            params: { verified: "error" },
          });
        }
      }, 1000);
      return () => clearTimeout(timer);
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

      const errorPath = (
        type === "recovery" ? "/forgot-password" : "/register"
      ) as any;

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
        await redirect(data.user?.email ?? "", type, url);
        return;
      }

      if (access_token && refresh_token) {
        setMessage("Memulai sesi…");
        const { data, error: sessErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessErr) throw sessErr;
        await redirect(data.user?.email ?? "", type, url);
        return;
      }

      router.replace({ pathname: errorPath, params: { verified: "error" } });
    } catch (e: any) {
      console.error("[Callback] ❌ Exception:", e?.message);
      router.replace({ pathname: "./index" });
    }
  };

  const redirect = async (
    email: string,
    type?: string,
    rawUrl: string = "",
  ) => {
    const isRecovery = type === "recovery" || rawUrl.includes("type=recovery");

    if (isRecovery) {
      setMessage("Berhasil! Mengarahkan…");
      router.replace({
        pathname: "/forgot-password",
        params: { verified: "true", email },
      });
    } else {
      // Pindahkan pengecekan status user ke sini untuk menghilangkan loading ganda di register.tsx
      setMessage("Mengecek data akun...");
      try {
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        setMessage("Berhasil! Mengarahkan…");
        router.replace({
          pathname: "/register",
          params: {
            verified: "true",
            email,
            isNewUser: user ? "false" : "true",
          },
        });
      } catch (e) {
        setMessage("Berhasil! Mengarahkan…");
        router.replace({
          pathname: "/register",
          params: { verified: "true", email, isNewUser: "false" },
        });
      }
    }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: { fontSize: 14 },
});
