import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

type Step = "email" | "sent" | "reset" | "error";

const ALLOWED_DOMAINS = ["@umn.ac.id", "@student.umn.ac.id", "@lecturer.umn.ac.id"];

function StepView({ children, style }: { children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export default function ForgotPassword() {
  const { currentTheme, isDarkMode } = useAppContext();
  const params = useLocalSearchParams<{ verified?: string; email?: string }>();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPending] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.verified) return;
    if (params.verified === "true" && params.email) {
      setPending(params.email);
      setStep("reset");
    } else if (params.verified === "error") {
      setErrorMsg("Link verifikasi tidak valid atau sudah kedaluwarsa. Silakan minta link baru.");
      setStep("error");
    }
  }, [params.verified, params.email]);

  const handleSendLink = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const validDomain = ALLOWED_DOMAINS.some((d) => trimmedEmail.endsWith(d));
    if (!validDomain) {
      setErrorMsg("Gunakan email @umn.ac.id, @student.umn.ac.id, atau @lecturer.umn.ac.id");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const redirectUrl = Linking.createURL("auth/callback");
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: redirectUrl });
      if (error) throw error;
      setPending(trimmedEmail);
      setStep("sent");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Gagal mengirim link. Pastikan email ini sudah terdaftar resmi.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password.trim() || !confirmPass.trim()) { setErrorMsg("Password dan konfirmasi wajib diisi."); return; }
    if (password !== confirmPass) { setErrorMsg("Password dan konfirmasi password tidak sama."); return; }
    if (password.length < 8) { setErrorMsg("Password minimal 8 karakter."); return; }
    
    setLoading(true);
    setErrorMsg("");
    try {
      await supabase.auth.updateUser({ password: password });
      const { error: dbError } = await supabase.rpc("update_user_password", { p_email: pendingEmail, p_new_password: password });
      if (dbError) throw dbError;
      Alert.alert("Berhasil", "Password kamu berhasil diperbarui. Silakan login kembali.", [
        { text: "OK", onPress: () => { router.replace({ pathname: "/" }); } },
      ]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Gagal memperbarui password. Coba lagi.");
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 40}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {(step === "email" || step === "error") && (
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          )}

          {step === "email" && (
            <StepView style={styles.stepWrap}>
              <View style={styles.iconWrap}><Ionicons name="lock-closed-outline" size={30} color={theme.primary} /></View>
              <Text style={[styles.title, { color: theme.text }]}>Lupa Password?</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Masukkan email UMN kamu untuk{"\n"}menerima link verifikasi ganti password.</Text>
              
              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }, errorMsg ? styles.inputError : null]}>
                  <Ionicons name="at-outline" size={17} color={theme.subtext} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: theme.text }]} placeholder="nama@student.umn.ac.id" placeholderTextColor={theme.subtext} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={(t) => { setEmail(t); setErrorMsg(""); }} onSubmitEditing={handleSendLink} />
                </View>
                <View style={styles.domainRow}>
                  {ALLOWED_DOMAINS.map((d) => (
                    <TouchableOpacity key={d} style={[styles.domainChip, { borderColor: theme.primary }]} activeOpacity={0.7} onPress={() => { const local = email.includes("@") ? email.split("@")[0] : email; setEmail(local + d); setErrorMsg(""); }}>
                      <Text style={[styles.domainChipText, { color: theme.primary }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleSendLink} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <>
                  <Text style={styles.primaryBtnText}>Kirim Link Reset</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFF" style={{ marginLeft: 8 }} />
                </>}
              </TouchableOpacity>
            </StepView>
          )}

          {step === "sent" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#34C77B15", borderColor: "#34C77B30" }]}><Ionicons name="mail-unread-outline" size={30} color="#34C77B" /></View>
              <Text style={[styles.title, { color: theme.text }]}>Cek Email Kamu</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Link verifikasi dikirim ke:</Text>
              <View style={[styles.emailChip, { borderColor: theme.primary }]}><Ionicons name="at-outline" size={13} color={theme.primary} style={{ marginRight: 6 }} /><Text style={[styles.emailChipText, { color: theme.primary }]}>{pendingEmail}</Text></View>
              
              <View style={[styles.stepsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {[{ num: "1", text: "Buka inbox email student kamu" }, { num: "2", text: "Klik link Reset Password yang dikirim dari sistem" }].map((s, i) => (
                  <View key={i} style={[styles.stepRow, i < 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={[styles.stepNum, { borderColor: theme.primary }]}><Text style={[styles.stepNumText, { color: theme.primary }]}>{s.num}</Text></View>
                    <Text style={[styles.stepText, { color: theme.subtext }]}>{s.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[styles.ghostBtn, { borderColor: theme.border }]} onPress={() => { setStep("email"); setErrorMsg(""); }} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={15} color={theme.text} style={{ marginRight: 6 }} />
                <Text style={[styles.ghostBtnText, { color: theme.text }]}>Kirim ulang / ganti email</Text>
              </TouchableOpacity>
            </StepView>
          )}

          {step === "reset" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#9B6BFF15", borderColor: "#9B6BFF30" }]}><Ionicons name="key-outline" size={30} color="#9B6BFF" /></View>
              <Text style={[styles.title, { color: theme.text }]}>Buat Password Baru</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Verifikasi sukses! Silakan masukkan{"\n"}password baru untuk akun kamu.</Text>
              
              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border, opacity: 0.6, marginBottom: 14 }]}>
                  <Ionicons name="at-outline" size={17} color={theme.subtext} style={styles.inputIcon} />
                  <Text style={[styles.input, { color: theme.text, paddingVertical: 2 }]}>{pendingEmail}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#34C77B" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>Password Baru</Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={17} color={theme.subtext} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: theme.text, paddingRight: 44 }]} placeholder="Min. 8 karakter" placeholderTextColor={theme.subtext} secureTextEntry={!showPass} value={password} onChangeText={(t) => { setPassword(t); setErrorMsg(""); }} />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)} activeOpacity={0.7}>
                    <Ionicons name={showPass ? "eye-outline" : "eye-off-outline"} size={17} color={theme.subtext} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>Konfirmasi Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={17} color={theme.subtext} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: theme.text, paddingRight: 44 }]} placeholder="Ulangi password baru" placeholderTextColor={theme.subtext} secureTextEntry={!showConfirm} value={confirmPass} onChangeText={(t) => { setConfirm(t); setErrorMsg(""); }} onSubmitEditing={handleUpdatePassword} />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm((p) => !p)} activeOpacity={0.7}>
                    <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={17} color={theme.subtext} />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleUpdatePassword} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <>
                  <Ionicons name="save-outline" size={17} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Simpan Password</Text>
                </>}
              </TouchableOpacity>
            </StepView>
          )}

          {step === "error" && (
            <StepView style={styles.stepWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#FF6B6B15", borderColor: "#FF6B6B30" }]}><Ionicons name="close-circle-outline" size={30} color="#FF6B6B" /></View>
              <Text style={[styles.title, { color: theme.text }]}>Gagal</Text>
              <ErrorBox msg={errorMsg} />
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { setStep("email"); setErrorMsg(""); setEmail(""); }} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={17} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </StepView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" style={{ marginRight: 8 }} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "flex-start", paddingHorizontal: 24, paddingVertical: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 28, alignSelf: "flex-start" },
  stepWrap: { width: "100%" },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#2B7FE015", borderWidth: 1.5, borderColor: "#2B7FE030", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  inputError: { borderColor: "#FF6B6B55" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14 },
  eyeBtn: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  domainRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  domainChip: { backgroundColor: "#2B7FE012", borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  domainChipText: { fontSize: 11, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FF6B6B12", borderWidth: 1, borderColor: "#FF6B6B30", borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1, lineHeight: 18 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2B7FE0", borderRadius: 13, paddingVertical: 16, marginBottom: 14, elevation: 3 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.6 },
  ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
  ghostBtnText: { fontSize: 13 },
  emailChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#2B7FE012", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 24 },
  emailChipText: { fontSize: 13, fontWeight: "600" },
  stepsCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2B7FE018", borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 12 },
  stepNumText: { fontSize: 11, fontWeight: "800" },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },
});