/**
 * app/sso.tsx — v7
 * Dirancang untuk: npx expo start --dev-client
 *
 * Flow:
 *   1. Input email (@umn.ac.id / @student.umn.ac.id / @lecturer.umn.ac.id)
 *   2. Cek email di DB → kirim magic link
 *   3. User klik link di email → deep link ufound:// buka app
 *   4. app/auth/callback.tsx tangkap token → redirect ke sso?verified=true
 *   5. Input NIM + password → login
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

type Step = "email" | "sent" | "verify" | "loading" | "error";

const ALLOWED_DOMAINS = ["@umn.ac.id", "@student.umn.ac.id", "@lecturer.umn.ac.id"];

// ── Animated wrapper ──────────────────────────────────────────────────────────
function StepView({ children, style }: { children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SSOLogin() {
  const params = useLocalSearchParams<{
    verified?: string;   // "true" saat callback berhasil
    email?: string;      // email yang sedang diverifikasi
  }>();

  const [step, setStep]           = useState<Step>("email");
  const [email, setEmail]         = useState("");
  const [nim, setNim]             = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [errorMsg, setErrorMsg]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [pendingEmail, setPending] = useState("");

  // ── Terima hasil dari auth/callback ──────────────────────────────────────
  useEffect(() => {
    if (params.verified === "true" && params.email) {
      setPending(params.email);
      setStep("verify");
    } else if (params.verified === "error") {
      setErrorMsg("Link tidak valid atau sudah kadaluarsa. Minta link baru.");
      setStep("error");
    }
  }, [params.verified, params.email]);

  // ── Step 1: Kirim magic link ──────────────────────────────────────────────
  const handleSendLink = async () => {
    const trimmed = email.trim().toLowerCase();
    const validDomain = ALLOWED_DOMAINS.some(d => trimmed.endsWith(d));

    if (!validDomain) {
      setErrorMsg("Gunakan email @umn.ac.id, @student.umn.ac.id, atau @lecturer.umn.ac.id");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Cek apakah email terdaftar di DB
      const { data: user, error: dbErr } = await supabase
        .from("users")
        .select("id")
        .eq("email", trimmed)
        .single();

      if (dbErr || !user) {
        setErrorMsg("Email ini tidak terdaftar di sistem UFound.\nHubungi admin untuk mendaftar.");
        setLoading(false);
        return;
      }

      // Kirim magic link — redirect ke Supabase dulu, lalu ke deep link
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // Supabase akan redirect ke ini setelah konfirmasi
          // Lalu dari Supabase redirect ke deep link ufound://
          emailRedirectTo: "ufound://auth/callback",
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setPending(trimmed);
      setStep("sent");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Gagal mengirim link. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verifikasi NIM + password ────────────────────────────────────
  const handleVerify = async () => {
    if (!nim.trim() || !password.trim()) {
      setErrorMsg("NIM dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.rpc("verify_user_login", {
        p_email:    pendingEmail,
        p_password: password,
      });

      if (error || !data || data.length === 0) {
        setErrorMsg("Password salah. Coba lagi.");
        setLoading(false);
        return;
      }

      const user = data[0];

      if (user.nim !== nim.trim()) {
        setErrorMsg("NIM tidak sesuai dengan akun ini.");
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem("current_user", JSON.stringify({
        id:    user.id,
        name:  user.name,
        nim:   user.nim,
        email: user.email,
        role:  user.role,
      }));

      if (user.role === "admin") router.replace("/admin");
      else router.replace("/(tabs)");

    } catch (e: any) {
      setErrorMsg(e?.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          {(step === "email" || step === "error") && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#8A9AB8" />
            </TouchableOpacity>
          )}

          {/* ── email ── */}
          {step === "email" && (
            <StepView style={styles.stepWrap}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-outline" size={30} color="#2B7FE0" />
              </View>
              <Text style={styles.title}>Masuk dengan SSO</Text>
              <Text style={styles.subtitle}>
                Masukkan email institusi UMN kamu{"\n"}untuk menerima link verifikasi
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Institusi</Text>
                <View style={[styles.inputWrap, errorMsg ? styles.inputError : null]}>
                  <Ionicons name="at-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="nama@student.umn.ac.id"
                    placeholderTextColor="#4A5570"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={t => { setEmail(t); setErrorMsg(""); }}
                    onSubmitEditing={handleSendLink}
                  />
                </View>
                <View style={styles.domainRow}>
                  {ALLOWED_DOMAINS.map(d => (
                    <View key={d} style={styles.domainChip}>
                      <Text style={styles.domainChipText}>{d}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendLink}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#161C2C" />
                  : <>
                      <Text style={styles.primaryBtnText}>Kirim Link Verifikasi</Text>
                      <Ionicons name="arrow-forward" size={17} color="#161C2C" style={{ marginLeft: 8 }} />
                    </>
                }
              </TouchableOpacity>

              <View style={styles.infoCard}>
                {[
                  { icon: "time-outline",             text: "Link berlaku 10 menit" },
                  { icon: "phone-portrait-outline",   text: "Setelah klik link, masukkan NIM & password" },
                  { icon: "checkmark-circle-outline", text: "Hanya akun terdaftar yang bisa masuk" },
                ].map((item, i) => (
                  <View key={i} style={[styles.infoRow, i < 2 && styles.infoRowBorder]}>
                    <Ionicons name={item.icon as any} size={14} color="#2B7FE0" style={{ marginRight: 10 }} />
                    <Text style={styles.infoText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </StepView>
          )}

          {/* ── sent ── */}
          {step === "sent" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#34C77B15", borderColor: "#34C77B30" }]}>
                <Ionicons name="mail-unread-outline" size={30} color="#34C77B" />
              </View>
              <Text style={styles.title}>Cek Email Kamu</Text>
              <Text style={styles.subtitle}>Link verifikasi dikirim ke</Text>
              <View style={styles.emailChip}>
                <Ionicons name="at-outline" size={13} color="#2B7FE0" style={{ marginRight: 6 }} />
                <Text style={styles.emailChipText}>{pendingEmail}</Text>
              </View>

              <View style={styles.stepsCard}>
                {[
                  { num: "1", text: "Buka inbox email UMN kamu" },
                  { num: "2", text: 'Klik tombol "Log In" di email dari UFound' },
                  { num: "3", text: "App akan terbuka otomatis, lalu masukkan NIM & password" },
                ].map((s, i) => (
                  <View key={i} style={[styles.stepRow, i < 2 && styles.stepRowBorder]}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{s.num}</Text>
                    </View>
                    <Text style={styles.stepText}>{s.text}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.expireNote}>Link berlaku selama 10 menit</Text>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => { setStep("email"); setErrorMsg(""); }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={15} color="#4A5570" style={{ marginRight: 6 }} />
                <Text style={styles.ghostBtnText}>Kirim ulang / ganti email</Text>
              </TouchableOpacity>
            </StepView>
          )}

          {/* ── loading ── */}
          {step === "loading" && (
            <StepView style={[styles.stepWrap, { alignItems: "center", paddingTop: 60 }]}>
              <ActivityIndicator size="large" color="#2B7FE0" style={{ marginBottom: 20 }} />
              <Text style={styles.title}>Memverifikasi…</Text>
              <Text style={styles.subtitle}>Sebentar ya</Text>
            </StepView>
          )}

          {/* ── verify ── */}
          {step === "verify" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#9B6BFF15", borderColor: "#9B6BFF30" }]}>
                <Ionicons name="finger-print-outline" size={30} color="#9B6BFF" />
              </View>
              <Text style={styles.title}>Konfirmasi Identitas</Text>
              <Text style={styles.subtitle}>
                Email terverifikasi! Masukkan NIM dan{"\n"}password untuk menyelesaikan login
              </Text>

              {/* Email readonly */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrap, { opacity: 0.6 }]}>
                  <Ionicons name="at-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <Text style={[styles.input, { color: "#8A9AB8", paddingVertical: 2 }]}>{pendingEmail}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#34C77B" />
                </View>
              </View>

              {/* NIM */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NIM</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="id-card-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nomor Induk Mahasiswa"
                    placeholderTextColor="#4A5570"
                    keyboardType="numeric"
                    value={nim}
                    onChangeText={t => { setNim(t); setErrorMsg(""); }}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Password akun UFound"
                    placeholderTextColor="#4A5570"
                    secureTextEntry={!showPass}
                    value={password}
                    onChangeText={t => { setPassword(t); setErrorMsg(""); }}
                    onSubmitEditing={handleVerify}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPass(p => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showPass ? "eye-outline" : "eye-off-outline"} size={17} color="#4A5570" />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#161C2C" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={17} color="#161C2C" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>Masuk Sekarang</Text>
                    </>
                }
              </TouchableOpacity>
            </StepView>
          )}

          {/* ── error ── */}
          {step === "error" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#FF6B6B15", borderColor: "#FF6B6B30" }]}>
                <Ionicons name="close-circle-outline" size={30} color="#FF6B6B" />
              </View>
              <Text style={styles.title}>Verifikasi Gagal</Text>
              <ErrorBox msg={errorMsg} />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => { setStep("email"); setErrorMsg(""); setEmail(""); }}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-outline" size={17} color="#161C2C" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </StepView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Reusable error box ────────────────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" style={{ marginRight: 8 }} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BG     = "#161C2C";
const CARD   = "#1E2538";
const BORDER = "#2A3350";

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: CARD,
    alignItems: "center", justifyContent: "center", marginBottom: 28, alignSelf: "flex-start",
  },
  stepWrap: { width: "100%" },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#2B7FE015", borderWidth: 1.5, borderColor: "#2B7FE030",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title:    { fontSize: 24, fontWeight: "800", color: "#FFF", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#8A9AB8", lineHeight: 22, marginBottom: 24 },
  inputGroup: { marginBottom: 14 },
  label:  { fontSize: 11, fontWeight: "700", color: "#8A9AB8", marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  inputError: { borderColor: "#FF6B6B55" },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, fontSize: 14, color: "#FFF" },
  eyeBtn:     { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  domainRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  domainChip: {
    backgroundColor: "#2B7FE012", borderWidth: 1, borderColor: "#2B7FE030",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  domainChipText: { fontSize: 11, color: "#2B7FE0", fontWeight: "600" },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FF6B6B12", borderWidth: 1, borderColor: "#FF6B6B30",
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1, lineHeight: 18 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF", borderRadius: 13, paddingVertical: 16, marginBottom: 14,
    shadowColor: "#2B7FE0", shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#161C2C" },
  btnDisabled:    { opacity: 0.6 },
  ghostBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 13,
  },
  ghostBtnText: { fontSize: 13, color: "#4A5570" },
  emailChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#2B7FE012", borderWidth: 1, borderColor: "#2B7FE030",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: "flex-start", marginBottom: 24,
  },
  emailChipText: { fontSize: 13, fontWeight: "600", color: "#2B7FE0" },
  stepsCard: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 16, marginBottom: 14,
  },
  stepRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#2B7FE018", borderWidth: 1, borderColor: "#2B7FE040",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  stepNumText: { fontSize: 11, fontWeight: "800", color: "#2B7FE0" },
  stepText:    { fontSize: 13, color: "#C0CCDE", flex: 1, lineHeight: 18 },
  expireNote:  { fontSize: 11, color: "#4A5570", marginBottom: 16 },
  infoCard: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 14, marginTop: 4,
  },
  infoRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  infoText:      { fontSize: 12, color: "#8A9AB8", flex: 1 },
});