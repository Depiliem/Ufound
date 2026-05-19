import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react"; // Pastikan useEffect diimport
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

function PixelLogo() {
  const BLUE = "#2B7FE0";
  const DARK = "#1B4FA0";

  const grid = [
    [1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 0, 0],
  ];

  const CELL = 9;

  return (
    <View style={logoStyles.wrapper}>
      <View style={logoStyles.grid}>
        {grid.map((row, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={{
                  width: CELL,
                  height: CELL,
                  margin: 1,
                  borderRadius: 1,
                  backgroundColor:
                    cell === 1 ? (r > 3 ? DARK : BLUE) : "transparent",
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={logoStyles.brandName}>U-Found</Text>
      <Text style={logoStyles.brandSub}>UMN Lost N Found</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  grid: { marginBottom: 10 },
  brandName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2B7FE0",
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A9AB8",
    letterSpacing: 4,
  },
});

export default function Login() {
  const { currentTheme, isDarkMode } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // State baru untuk menahan render layar selama pengecekan sesi cold start berjalan
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ── PENGECEKAN AUTO-LOGIN SAAT APLIKASI DIBUKA DARI NOL ────────────────────
  useEffect(() => {
    const verifySessionOnStart = async () => {
      try {
        const userString = await AsyncStorage.getItem("current_user");
        const lastActiveString = await AsyncStorage.getItem("last_active_time");

        if (userString && lastActiveString) {
          const lastActiveTime = parseInt(lastActiveString, 10);
          const currentTime = Date.now();
          const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

          // Jika ternyata sesi lokal sudah lewat dari 3 hari, hapus total
          if (currentTime - lastActiveTime > THREE_DAYS_IN_MS) {
            await AsyncStorage.multiRemove([
              "current_user",
              "last_active_time",
            ]);
            await supabase.auth.signOut();
            setCheckingAuth(false);
            return;
          }

          // Jika sesi valid, perbarui waktu aktif saat ini dan langsung arahkan rute
          const user = JSON.parse(userString);
          await AsyncStorage.setItem("last_active_time", Date.now().toString());

          if (user.role === "admin") {
            router.replace("/admin");
          } else {
            router.replace("/(tabs)/user");
          }
          return;
        }
      } catch (err) {
        console.error("Gagal memproses auto login cold start:", err);
      }
      // Jika tidak ada data user/sesi kosong, buka kunci loading agar form login terlihat
      setCheckingAuth(false);
    };

    verifySessionOnStart();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Login Gagal", "Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("verify_user_login", {
        p_email: email.trim(),
        p_password: password,
      });

      if (error || !data || data.length === 0) {
        Alert.alert("Login Gagal", "Email atau password salah.");
        return;
      }

      const user = data[0];

      await AsyncStorage.setItem(
        "current_user",
        JSON.stringify({
          id: user.id,
          name: user.name,
          nim: user.nim,
          email: user.email,
          role: user.role,
        }),
      );

      // Set timestamp awal saat berhasil login
      await AsyncStorage.setItem("last_active_time", Date.now().toString());

      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/(tabs)/user");
      }
    } catch (err) {
      Alert.alert("Error", "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: currentTheme.background,
    card: currentTheme.cardBackground,
    border: currentTheme.border,
    text: currentTheme.textMain,
    subtext: currentTheme.textSecondary,
    primary: "#2B7FE0",
  };

  // Menampilkan layar loading bersih sewaktu sistem membaca AsyncStorage
  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.bg}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <PixelLogo />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.welcomeText, { color: theme.text }]}>
              Welcome
            </Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={theme.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapPass}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                    paddingRight: 52,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.subtext}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((p) => !p)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={theme.subtext}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: theme.subtext }]}>
                Lupa Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={[styles.noAccountText, { color: theme.subtext }]}>
                Tidak punya akun?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/register")}
                activeOpacity={0.7}
              >
                <Text style={[styles.registerLink, { color: theme.primary }]}>
                  Registrasi disini
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoSection: { alignItems: "center", marginBottom: 60 },
  formSection: { width: "100%" },
  welcomeText: { fontSize: 28, fontWeight: "800", marginBottom: 24 },
  inputWrap: { position: "relative", marginBottom: 25 },
  inputWrapPass: { position: "relative" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  loginBtn: {
    backgroundColor: "#2B7FE0",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    elevation: 2,
  },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  loginBtnDisabled: { opacity: 0.6 },
  forgotBtn: { alignItems: "flex-end", marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 12, fontWeight: "600" },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  noAccountText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: "700" },
});
