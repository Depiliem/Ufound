import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { supabase } from "../lib/supabase";

// ── Pixel-art "U" logo ────────────────────────────────────────────────────────
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
      <Text style={logoStyles.brandName}>ufound</Text>
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
    color: "#5A6A8A",
    letterSpacing: 4,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Login Gagal", "Email dan password wajib diisi.");
      return;
    }
 
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("verify_user_login", { p_email: email.trim(), p_password: password });
 
      if (error || !data || data.length === 0) {
        Alert.alert("Login Gagal", "Email atau password salah.");
        return;
      }
 
      const user = data[0];

      await AsyncStorage.setItem("current_user", JSON.stringify({
        id: user.id,
        name: user.name,
        nim: user.nim,
        email: user.email,
        role: user.role,
      }));
 
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#161C2C" />
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
          {/* Logo area */}
          <View style={styles.logoSection}>
            <PixelLogo />
          </View>
 
          {/* Form area */}
          <View style={styles.formSection}>
            <Text style={styles.welcomeText}>Welcome</Text>
 
            {/* Email */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#4A5570"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
 
            {/* Password */}
            <View style={styles.inputWrapPass}>
              <TextInput
                style={[styles.input, { paddingRight: 52 }]}
                placeholder="Password"
                placeholderTextColor="#4A5570"
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
                  color="#4A5570"
                />
              </TouchableOpacity>
            </View>

            
              {/* Forgot Password Link */}
            <TouchableOpacity 
              onPress={() => router.push("/")} 
              style={styles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
 
            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#8A9AB8" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Register Link Footer */}
            <View style={styles.registerRow}>
              <Text style={styles.noAccountText}>Tidak punya akun? </Text>
              <TouchableOpacity onPress={() => router.push("/register")} activeOpacity={0.7}>
                <Text style={styles.registerLink}>Registrasi disini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BG = "#161C2C";
const CARD = "#1E2538";
const BORDER = "#2A3350";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  formSection: {
    width: "100%",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 24,
  },
  inputWrap: {
    position: "relative",
    marginBottom: 25,
  },
  inputWrapPass: {
    position: "relative",
  },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  loginBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
  },
  loginBtnText: {
    color: "#8A9AB8",
    fontSize: 16,
    fontWeight: "600",
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  forgotBtn: {
    alignItems: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotText: {
    color: "#5A6A8A",
    fontSize: 12,
    fontWeight: "500",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  noAccountText: {
    color: "#5A6A8A",
    fontSize: 14,
  },
  registerLink: {
    color: "#2B7FE0",
    fontSize: 14,
    fontWeight: "600",
  },
});