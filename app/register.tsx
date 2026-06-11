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
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

type Step = "email" | "sent" | "verify" | "new_user" | "loading" | "error";

const ALLOWED_DOMAINS = [
  "@umn.ac.id",
  "@student.umn.ac.id",
  "@lecturer.umn.ac.id",
];

function StepView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function SSOLogin() {
  const { currentTheme, isDarkMode } = useAppContext();

  const params = useLocalSearchParams<{
    verified?: string;
    email?: string;
    isNewUser?: string;
  }>();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState(""); // State baru untuk OTP
  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPending] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  const {
    verified,
    email: verifiedEmailParam,
    isNewUser: isNewUserParam,
  } = params;

  useEffect(() => {
    if (!verified) return;
    if (verified === "true" && verifiedEmailParam) {
      setPending(verifiedEmailParam);

      if (isNewUserParam === "true") {
        setIsNewUser(true);
        setStep("new_user");
      } else {
        setIsNewUser(false);
        setStep("verify");
      }
    } else if (verified === "error") {
      setErrorMsg("Link tidak valid atau sudah kadaluarsa. Minta link baru.");
      setStep("error");
    }
  }, [verified, verifiedEmailParam, isNewUserParam]);

  const handleSendLink = async () => {
    const trimmed = email.trim().toLowerCase();
    const validDomain = ALLOWED_DOMAINS.some((d) => trimmed.endsWith(d));
    if (!validDomain) {
      setErrorMsg(
        "Gunakan email @umn.ac.id, @student.umn.ac.id, atau @lecturer.umn.ac.id",
      );
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", trimmed)
        .maybeSingle();

      if (existing) {
        setErrorMsg("Email ini sudah terdaftar. Silakan login.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        // Hapus opsi deep link karena sekarang pakai OTP
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

  // Fungsi baru untuk memverifikasi OTP
  const handleVerifyOtp = async () => {
    if (otpToken.trim().length !== 6) {
      setErrorMsg("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpToken.trim(),
        type: "email",
      });
      if (error) throw error;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", pendingEmail.toLowerCase())
        .maybeSingle();

      if (user) {
        setIsNewUser(false);
        setStep("verify");
      } else {
        setIsNewUser(true);
        setStep("new_user");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Kode OTP salah atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!nim.trim() || !password.trim()) {
      setErrorMsg("NIM dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.rpc("verify_user_login", {
        p_email: pendingEmail,
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

      await AsyncStorage.setItem("last_active_time", Date.now().toString());

      if (user.role === "admin") router.replace("/admin");
      else router.replace("/(tabs)/user");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const isLecturer = pendingEmail.endsWith("@lecturer.umn.ac.id");
    if (
      !nama.trim() ||
      (!isLecturer && !nim.trim()) ||
      !password.trim() ||
      !confirmPass.trim()
    ) {
      setErrorMsg(
        isLecturer
          ? "Nama, password, dan konfirmasi wajib diisi."
          : "Semua field wajib diisi.",
      );
      return;
    }
    if (password !== confirmPass) {
      setErrorMsg("Password dan konfirmasi tidak sama.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.rpc("register_user", {
        p_email: pendingEmail,
        p_name: nama.trim(),
        p_nim: isLecturer ? null : nim.trim(),
        p_password: password,
        p_role: isLecturer ? "lecturer" : "student",
      });
      if (error) throw error;

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

      await AsyncStorage.setItem("last_active_time", Date.now().toString());

      router.replace("/(tabs)/user");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Gagal mendaftar. Coba lagi.");
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
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.bg}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 40}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {(step === "email" || step === "error") && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          )}

          {step === "email" && (
            <StepView style={styles.stepWrap}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-outline" size={30} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Registrasi akun kamu
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Masukkan email UMN kamu{"\n"}untuk menerima kode OTP verifikasi
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Email Universitas
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    errorMsg ? styles.inputError : null,
                  ]}
                >
                  <Ionicons
                    name="at-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="nama@student.umn.ac.id"
                    placeholderTextColor={theme.subtext}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setErrorMsg("");
                    }}
                    onSubmitEditing={handleSendLink}
                  />
                </View>
                <View style={styles.domainRow}>
                  {ALLOWED_DOMAINS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.domainChip,
                        { borderColor: theme.primary },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        const local = email.includes("@")
                          ? email.split("@")[0]
                          : email;
                        setEmail(local + d);
                        setErrorMsg("");
                      }}
                    >
                      <Text
                        style={[
                          styles.domainChipText,
                          { color: theme.primary },
                        ]}
                      >
                        {d}
                      </Text>
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
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Kirim Kode OTP</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#FFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </StepView>
          )}

          {step === "sent" && (
            <StepView style={styles.stepWrap}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "#34C77B15", borderColor: "#34C77B30" },
                ]}
              >
                <Ionicons
                  name="mail-unread-outline"
                  size={30}
                  color="#34C77B"
                />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Verifikasi OTP
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Masukkan 6 digit kode yang dikirim ke:
              </Text>
              <View style={[styles.emailChip, { borderColor: theme.primary }]}>
                <Ionicons
                  name="at-outline"
                  size={13}
                  color={theme.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.emailChipText, { color: theme.primary }]}>
                  {pendingEmail}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    errorMsg ? styles.inputError : null,
                  ]}
                >
                  <Ionicons
                    name="key-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        letterSpacing: 4,
                        fontWeight: "700",
                      },
                    ]}
                    placeholder="KODE OTP"
                    placeholderTextColor={theme.subtext}
                    keyboardType="numeric"
                    maxLength={6}
                    value={otpToken}
                    onChangeText={(t) => {
                      setOtpToken(t);
                      setErrorMsg("");
                    }}
                    onSubmitEditing={handleVerifyOtp}
                  />
                </View>
              </View>

              {errorMsg ? <ErrorBox msg={errorMsg} /> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verifikasi Kode</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: theme.border }]}
                onPress={() => {
                  setStep("email");
                  setErrorMsg("");
                  setOtpToken("");
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={theme.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.ghostBtnText, { color: theme.text }]}>
                  Ganti email / Kirim ulang
                </Text>
              </TouchableOpacity>
            </StepView>
          )}

          {step === "verify" && (
            <StepView style={styles.stepWrap}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "#9B6BFF15", borderColor: "#9B6BFF30" },
                ]}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={30}
                  color="#9B6BFF"
                />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Konfirmasi Identitas
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Email terverifikasi! Masukkan NIM dan{"\n"}password untuk
                menyelesaikan login
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Email
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      opacity: 0.6,
                    },
                  ]}
                >
                  <Ionicons
                    name="at-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <Text
                    style={[
                      styles.input,
                      { color: theme.text, paddingVertical: 2 },
                    ]}
                  >
                    {pendingEmail}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#34C77B" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  NIM
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="id-card-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nomor Induk Mahasiswa"
                    placeholderTextColor={theme.subtext}
                    keyboardType="numeric"
                    value={nim}
                    onChangeText={(t) => {
                      setNim(t);
                      setErrorMsg("");
                    }}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: theme.text, paddingRight: 44 },
                    ]}
                    placeholder="Password akun UFound"
                    placeholderTextColor={theme.subtext}
                    secureTextEntry={!showPass}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setErrorMsg("");
                    }}
                    onSubmitEditing={handleVerify}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPass((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPass ? "eye-outline" : "eye-off-outline"}
                      size={17}
                      color={theme.subtext}
                    />
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
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryBtnText}>Masuk Sekarang</Text>
                  </>
                )}
              </TouchableOpacity>
            </StepView>
          )}

          {step === "new_user" && (
            <StepView style={styles.stepWrap}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "#34C77B15", borderColor: "#34C77B30" },
                ]}
              >
                <Ionicons name="person-add-outline" size={30} color="#34C77B" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Buat Akun Baru
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Email terverifikasi! Lengkapi data{"\n"}untuk membuat akun
                UFound kamu
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Email
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      opacity: 0.6,
                    },
                  ]}
                >
                  <Ionicons
                    name="at-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <Text
                    style={[
                      styles.input,
                      { color: theme.text, paddingVertical: 2 },
                    ]}
                  >
                    {pendingEmail}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#34C77B" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Nama Lengkap
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nama sesuai KTM"
                    placeholderTextColor={theme.subtext}
                    autoCapitalize="words"
                    value={nama}
                    onChangeText={(t) => {
                      setNama(t);
                      setErrorMsg("");
                    }}
                  />
                </View>
              </View>

              {!pendingEmail.endsWith("@lecturer.umn.ac.id") && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.subtext }]}>
                    NIM
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="id-card-outline"
                      size={17}
                      color={theme.subtext}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Nomor Induk Mahasiswa"
                      placeholderTextColor={theme.subtext}
                      keyboardType="numeric"
                      value={nim}
                      onChangeText={(t) => {
                        setNim(t);
                        setErrorMsg("");
                      }}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: theme.text, paddingRight: 44 },
                    ]}
                    placeholder="Min. 8 karakter"
                    placeholderTextColor={theme.subtext}
                    secureTextEntry={!showPass}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setErrorMsg("");
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPass((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPass ? "eye-outline" : "eye-off-outline"}
                      size={17}
                      color={theme.subtext}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  Konfirmasi Password
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={theme.subtext}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: theme.text, paddingRight: 44 },
                    ]}
                    placeholder="Ulangi password"
                    placeholderTextColor={theme.subtext}
                    secureTextEntry={!showConfirm}
                    value={confirmPass}
                    onChangeText={(t) => {
                      setConfirm(t);
                      setErrorMsg("");
                    }}
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirm((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-outline" : "eye-off-outline"}
                      size={17}
                      color={theme.subtext}
                    />
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
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={17}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryBtnText}>Buat Akun</Text>
                  </>
                )}
              </TouchableOpacity>
            </StepView>
          )}

          {step === "error" && (
            <StepView style={styles.stepWrap}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "#FF6B6B15", borderColor: "#FF6B6B30" },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={30}
                  color="#FF6B6B"
                />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Verifikasi Gagal
              </Text>
              <ErrorBox msg={errorMsg} />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setStep("email");
                  setErrorMsg("");
                  setEmail("");
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
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
      <Ionicons
        name="alert-circle-outline"
        size={16}
        color="#FF6B6B"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  stepWrap: { width: "100%" },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2B7FE015",
    borderWidth: 1.5,
    borderColor: "#2B7FE030",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputError: { borderColor: "#FF6B6B55" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14 },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  domainRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  domainChip: {
    backgroundColor: "#2B7FE012",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  domainChipText: { fontSize: 11, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FF6B6B12",
    borderWidth: 1,
    borderColor: "#FF6B6B30",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: "#FF6B6B", fontSize: 13, flex: 1, lineHeight: 18 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B7FE0",
    borderRadius: 13,
    paddingVertical: 16,
    marginBottom: 14,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.6 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
  },
  ghostBtnText: { fontSize: 13 },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B7FE012",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  emailChipText: { fontSize: 13, fontWeight: "600" },
  stepsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2B7FE018",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumText: { fontSize: 11, fontWeight: "800" },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },
  expireNote: { fontSize: 11, marginBottom: 16 },
  infoCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  infoText: { fontSize: 12, flex: 1 },
});
