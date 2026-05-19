import { Ionicons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";
import { Colors } from "../../constants/Colors";
import { useAppContext } from "../../context/AppContext";
import { useNfc } from "../../hooks/useNfc";
import { supabase } from "../../lib/supabase";

type UserData = {
  id: string;
  name: string;
  nim: string | null;
  email: string;
  role: string;
};

type Stats = {
  totalLost: number;
  totalFound: number;
  approved: number;
  pending: number;
};

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, currentTheme } = useAppContext();
  const [isNotif, setIsNotif] = React.useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalLost: 0,
    totalFound: 0,
    approved: 0,
    pending: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [hasNfc, setHasNfc] = useState(false);

  // NFC Modal state
  const [nfcModalVisible, setNfcModalVisible] = useState(false);

  const { status: nfcStatus, error: nfcError, startScan, cancelScan } = useNfc();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem("current_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed);
          fetchStats(parsed.id);
          checkNfcRegistered(parsed.id);
        }
      } catch {}
    };
    loadUser();
  }, []);

  const checkNfcRegistered = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("nfc_uid")
        .eq("id", userId)
        .single();
      setHasNfc(!!data?.nfc_uid);
    } catch {}
  };

  const fetchStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("type, status")
        .eq("user_id", userId);

      if (error || !data) return;

      const totalLost = data.filter((i) => i.type === "lost").length;
      const totalFound = data.filter((i) => i.type === "found").length;
      const approved = data.filter((i) => i.status === "approved").length;
      const pending = data.filter((i) => i.status === "pending").length;

      setStats({ totalLost, totalFound, approved, pending });
    } catch {
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRegisterNfc = async () => {
    if (!user) return;

    setNfcModalVisible(true);
    const scannedUid = await startScan();

    if (!scannedUid) {
      // startScan sets error internally, keep modal open to show error
      return;
    }
    const { data: existing } = await supabase
      .from("users")
      .select("id, name")
      .eq("nfc_uid", scannedUid)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      Alert.alert(
        "KTM Sudah Terdaftar",
        `Kartu ini sudah terdaftar ke akun ${existing.name}. Hubungi admin jika ini milikmu.`
      );
      setNfcModalVisible(false);
      return;
    }

    // Save UID to Supabase
    const { error } = await supabase
      .from("users")
      .update({ nfc_uid: scannedUid })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Gagal", "Tidak bisa menyimpan UID kartu. Coba lagi.");
      setNfcModalVisible(false);
      return;
    }

    // Close modal after short delay to show success state
    setTimeout(() => {
      setNfcModalVisible(false);
      setHasNfc(true);
      Alert.alert(
        "Berhasil! 🎉",
        `KTM kamu berhasil didaftarkan.\nUID: ${scannedUid}\n\nSekarang kamu bisa login pakai tap KTM.`
      );
    }, 1200);
  };

  const handleRemoveNfc = () => {
    Alert.alert(
      "Hapus KTM",
      "Yakin ingin menghapus KTM dari akun ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            await supabase
              .from("users")
              .update({ nfc_uid: null })
              .eq("id", user.id);
            setHasNfc(false);
          },
        },
      ]
    );
  };

  const handleCloseNfcModal = async () => {
    await cancelScan();
    setNfcModalVisible(false);
  };

  const theme = {
    bg: currentTheme.background,
    card: currentTheme.cardBackground,
    border: currentTheme.border,
    text: currentTheme.textMain,
    subtext: currentTheme.textSecondary,
    primary: currentTheme.chipActive,
    primaryLight: isDarkMode ? "#2D1F4A" : "#EDE7F6",
    accent: currentTheme.searchBackground,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title="Profile" currentTheme={currentTheme} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Profile Card ── */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
            <View style={styles.defaultAvatar}>
              <Image
                source={require("../../assets/images/user.png")}
                style={styles.defaultAvatarImage}
              />
            </View>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {user?.name ?? "–"}
          </Text>
          <Text style={[styles.profileNim, { color: theme.subtext }]}>
            {user?.nim ?? "–"}
          </Text>

          {/* NFC Badge */}
          {hasNfc && (
            <View style={[styles.nfcBadge, { backgroundColor: isDarkMode ? "#1A3A2A" : "#E8F8EF" }]}>
              <Ionicons name="card-outline" size={13} color="#34C759" />
              <Text style={[styles.nfcBadgeText, { color: "#34C759" }]}>
                KTM Terdaftar
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats Card ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Statistik Laporan
        </Text>
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statItem,
                { borderRightWidth: 1, borderRightColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: "rgba(255,59,48,0.1)" },
                ]}
              >
                <Ionicons name="search-outline" size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.totalLost}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Barang Hilang
              </Text>
            </View>
            <View
              style={[
                styles.statItem,
                { borderRightWidth: 1, borderRightColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: "rgba(52,199,89,0.1)" },
                ]}
              >
                <Ionicons name="hand-left-outline" size={20} color="#34C759" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.totalFound}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Barang Temuan
              </Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: "rgba(255,149,0,0.1)" },
                ]}
              >
                <Ionicons name="hourglass-outline" size={20} color="#FF9500" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.pending}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Menunggu
              </Text>
            </View>
          </View>

          <View
            style={[styles.statsApprovedRow, { borderTopColor: theme.border }]}
          >
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={[styles.statsApprovedText, { color: theme.subtext }]}>
              <Text style={{ color: "#34C759", fontWeight: "700" }}>
                {statsLoading ? "–" : stats.approved}
              </Text>{" "}
              laporan disetujui
            </Text>
            <TouchableOpacity
              style={styles.statsHistoryBtn}
              onPress={() => router.push("/history")}
            >
              <Text
                style={[styles.statsHistoryBtnText, { color: Colors.primary }]}
              >
                Lihat Riwayat →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Pengaturan
        </Text>
        <View
          style={[
            styles.settingsCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Dark Mode toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>
                {isDarkMode ? (
                  <AntDesign name="moon" size={24} color="yellow" />
                ) : (
                  <AntDesign name="moon" size={24} color="black" />
                )}
              </Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {isDarkMode ? "Dark Mode" : "Dark Mode"}
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Tema tampilan aplikasi
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.accent, true: theme.primary }}
              thumbColor={"#fff"}
            />
          </TouchableOpacity>

          {/* NFC / KTM Setting */}
          <TouchableOpacity
            onPress={hasNfc ? handleRemoveNfc : handleRegisterNfc}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>
                <Ionicons
                  name="card-outline"
                  size={22}
                  color={hasNfc ? "#34C759" : theme.text}
                />
              </Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {hasNfc ? "KTM Terdaftar" : "Daftarkan KTM"}
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  {hasNfc
                    ? "Tap untuk hapus kartu NFC"
                    : "Login cepat pakai tap kartu KTM"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={hasNfc ? "checkmark-circle" : "chevron-forward"}
              size={20}
              color={hasNfc ? "#34C759" : theme.subtext}
            />
          </TouchableOpacity>

          {/* Log Out */}
          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.removeItem("current_user");
              router.replace("/");
            }}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>
                <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              </Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Log Out
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Keluar Akun
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── NFC Scan Modal ── */}
      <Modal
        visible={nfcModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseNfcModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {/* Icon Area */}
            <View
              style={[
                styles.nfcIconCircle,
                {
                  backgroundColor:
                    nfcStatus === "success"
                      ? "rgba(52,199,89,0.12)"
                      : nfcStatus === "error"
                      ? "rgba(255,59,48,0.12)"
                      : "rgba(43,127,224,0.12)",
                },
              ]}
            >
              <Ionicons
                name={
                  nfcStatus === "success"
                    ? "checkmark-circle"
                    : nfcStatus === "error"
                    ? "close-circle"
                    : "card"
                }
                size={52}
                color={
                  nfcStatus === "success"
                    ? "#34C759"
                    : nfcStatus === "error"
                    ? "#FF3B30"
                    : "#2B7FE0"
                }
              />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {nfcStatus === "success"
                ? "KTM Terdeteksi!"
                : nfcStatus === "error"
                ? "Gagal Membaca"
                : "Tempelkan KTM"}
            </Text>

            {/* Subtitle */}
            <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
              {nfcStatus === "success"
                ? "KTM berhasil dibaca. Menyimpan..."
                : nfcStatus === "error"
                ? nfcError ?? "Terjadi kesalahan."
                : "Dekatkan kartu KTM ke bagian belakang HP kamu"}
            </Text>

            {/* Scanning animation dots */}
            {nfcStatus === "scanning" && (
              <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.dot, { backgroundColor: "#2B7FE0" }]}
                  />
                ))}
              </View>
            )}

            {/* Cancel button */}
            {nfcStatus !== "success" && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={handleCloseNfcModal}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: theme.subtext }]}>
                  Batal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  defaultAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#B0B0B0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  defaultAvatarImage: {
    width: 90,
    height: 90,
    resizeMode: "cover",
  },
  scroll: { padding: 16 },

  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  avatarWrap: { borderRadius: 70, padding: 3, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  profileName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileNim: { fontSize: 14, marginBottom: 12 },

  nfcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  nfcBadgeText: { fontSize: 12, fontWeight: "600" },

  // Stats
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  statsRow: { flexDirection: "row" },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statNumber: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 10, textAlign: "center" },
  statsApprovedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  statsApprovedText: { fontSize: 13, flex: 1 },
  statsHistoryBtn: { paddingHorizontal: 4 },
  statsHistoryBtnText: { fontSize: 12, fontWeight: "600" },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
  },

  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingEmoji: { fontSize: 22 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 2 },

  // NFC Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
  },
  nfcIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
