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

type Step = "email" | "sent" | "verify" | "new_user" | "loading" | "error";

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
  const [nama, setNama]           = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [pendingEmail, setPending] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // ── Terima hasil dari auth/callback ──────────────────────────────────────
  const { verified, email: verifiedEmailParam } = params;
  useEffect(() => {
    if (!verified) return; // params kosong {} — abaikan
    if (verified === "true" && verifiedEmailParam) {
      console.log("[Register] ✅ Email terverifikasi:", verifiedEmailParam);
      setPending(verifiedEmailParam);
      checkUserExists(verifiedEmailParam);
    } else if (verified === "error") {
      console.log("[Register] ❌ Verifikasi gagal dari callback");
      setErrorMsg("Link tidak valid atau sudah kadaluarsa. Minta link baru.");
      setStep("error");
    }
  }, [verified, verifiedEmailParam]);

  // ── Cek apakah email sudah terdaftar di DB ───────────────────────────────
  const checkUserExists = async (verifiedEmail: string) => {
    setStep("loading");
    console.log("[Register] ⏳ Cek user di DB untuk:", verifiedEmail);
    try {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", verifiedEmail.toLowerCase())
        .maybeSingle();

      if (user) {
        console.log("[Register] ✅ User sudah ada → step verify (login)");
        setIsNewUser(false);
        setStep("verify");
      } else {
        console.log("[Register] ℹ️ User belum ada → step new_user (daftar)");
        setIsNewUser(true);
        setStep("new_user");
      }
    } catch (e) {
      console.error("[Register] Gagal cek user:", e);
      setStep("verify");
    }
  };

  // ── Step 1: Kirim magic link ──────────────────────────────────────────────
  const handleSendLink = async () => {
    const trimmed = email.trim().toLowerCase();
    const validDomain = ALLOWED_DOMAINS.some(d => trimmed.endsWith(d));

    console.log("\n[Register] ══════ KIRIM MAGIC LINK ══════");
    console.log("[Register] Email:", trimmed, "| Domain valid:", validDomain);

    if (!validDomain) {
      setErrorMsg("Gunakan email @umn.ac.id, @student.umn.ac.id, atau @lecturer.umn.ac.id");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Kirim magic link langsung — cek DB dilakukan setelah email terverifikasi
      console.log("[Register] ⏳ Mengirim magic link...");
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: "ufound://auth/callback",
          shouldCreateUser: true, // izinkan user baru agar bisa register
        },
      });

      if (error) {
        console.log("[Register] ❌ Error OTP:", JSON.stringify(error));
        throw error;
      }

      console.log("[Register] ✅ Magic link terkirim ke:", trimmed);
      setPending(trimmed);
      setStep("sent");
    } catch (e: any) {
      console.error("[Register] ❌ Exception:", e?.message);
      setErrorMsg(e?.message ?? "Gagal mengirim link. Coba lagi.");
    } finally {
      setLoading(false);
      console.log("[Register] ══════════════════════════════\n");
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
      else router.replace("/(tabs)/user");

    } catch (e: any) {
      setErrorMsg(e?.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Daftar user baru ──────────────────────────────────────────────
  const handleRegister = async () => {
    const isLecturer = pendingEmail.endsWith("@lecturer.umn.ac.id");
    if (!nama.trim() || (!isLecturer && !nim.trim()) || !password.trim() || !confirmPass.trim()) {
      setErrorMsg(isLecturer ? "Nama, password, dan konfirmasi wajib diisi." : "Semua field wajib diisi.");
      return;
    }
    if (password !== confirmPass) {
      setErrorMsg("Password dan konfirmasi password tidak sama.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    console.log("\n[Register] ══════ DAFTAR USER BARU ══════");
    console.log("[Register] Email:", pendingEmail);
    console.log("[Register] Nama:", nama.trim());
    console.log("[Register] NIM:", nim.trim());

    try {
      // Hash password via RPC (pakai fungsi pgcrypto yang sama)
      console.log("[Register] ⏳ Menyimpan user baru ke DB...");
      const { data, error } = await supabase
        .from("users")
        .insert({
          email:    pendingEmail,
          name:     nama.trim(),
          nim:      isLecturer ? null : nim.trim(),
          password: password,
          role:     pendingEmail.endsWith("@lecturer.umn.ac.id") ? "lecturer" : "student",
        })
        .select("id, name, nim, email, role")
        .single();

      if (error) {
        console.log("[Register] ❌ Insert error:", JSON.stringify(error));
        throw error;
      }

      console.log("[Register] ✅ User berhasil dibuat:", data.id);
      await AsyncStorage.setItem("current_user", JSON.stringify({
        id:    data.id,
        name:  data.name,
        nim:   data.nim,
        email: data.email,
        role:  data.role,
      }));

      router.replace("/(tabs)/user");
    } catch (e: any) {
      console.error("[Register] ❌ Exception:", e?.message);
      setErrorMsg(e?.message ?? "Gagal mendaftar. Coba lagi.");
    } finally {
      setLoading(false);
      console.log("[Register] ══════════════════════════════\n");
    }
  };
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
              <Text style={styles.title}>Registrasi akun kamu</Text>
              <Text style={styles.subtitle}>
                Masukkan email UMN kamu{"\n"}untuk menerima link verifikasi
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Universitas</Text>
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
                    <TouchableOpacity
                      key={d}
                      style={styles.domainChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        const local = email.includes("@") ? email.split("@")[0] : email;
                        setEmail(local + d);
                        setErrorMsg("");
                      }}
                    >
                      <Text style={styles.domainChipText}>{d}</Text>
                    </TouchableOpacity>
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
                  <View style={styles.infoRow}>
                    <Text style={styles.infoText}>Setelah klik link, masukkan NIM & password</Text>
                  </View>
                
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
                  { num: "2", text: 'Klik tombol "Verifikasi & masuk" di email dari UFound' }
                ].map((s, i) => (
                  <View key={i} style={[styles.stepRow, i < 1 && styles.stepRowBorder]}>
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

          {/* ── new_user (register) ── */}
          {step === "new_user" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#34C77B15", borderColor: "#34C77B30" }]}>
                <Ionicons name="person-add-outline" size={30} color="#34C77B" />
              </View>
              <Text style={styles.title}>Buat Akun Baru</Text>
              <Text style={styles.subtitle}>
                Email terverifikasi! Lengkapi data{"\n"}untuk membuat akun UFound kamu
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

              {/* Nama */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Lengkap</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nama sesuai KTM"
                    placeholderTextColor="#4A5570"
                    autoCapitalize="words"
                    value={nama}
                    onChangeText={t => { setNama(t); setErrorMsg(""); }}
                  />
                </View>
              </View>

              {/* NIM — hanya untuk mahasiswa */}
              {!pendingEmail.endsWith("@lecturer.umn.ac.id") && (
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
              )}

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Min. 8 karakter"
                    placeholderTextColor="#4A5570"
                    secureTextEntry={!showPass}
                    value={password}
                    onChangeText={t => { setPassword(t); setErrorMsg(""); }}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)} activeOpacity={0.7}>
                    <Ionicons name={showPass ? "eye-outline" : "eye-off-outline"} size={17} color="#4A5570" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Konfirmasi Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Konfirmasi Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={17} color="#4A5570" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Ulangi password"
                    placeholderTextColor="#4A5570"
                    secureTextEntry={!showConfirm}
                    value={confirmPass}
                    onChangeText={t => { setConfirm(t); setErrorMsg(""); }}
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)} activeOpacity={0.7}>
                    <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={17} color="#4A5570" />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#161C2C" />
                  : <>
                      <Ionicons name="person-add-outline" size={17} color="#161C2C" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>Buat Akun</Text>
                    </>
                }
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
  scroll: { flexGrow: 1, justifyContent: "flex-start", paddingHorizontal: 24, paddingVertical: 10 },
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