import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAppContext } from "../../context/AppContext";
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

const PROFILE_IMAGE = { uri: "https://randomuser.me/api/portraits/men/9.jpg" };

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, currentTheme } = useAppContext();
  const [isNotif, setIsNotif] = React.useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalLost: 0, totalFound: 0, approved: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem("current_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed);
          fetchStats(parsed.id);
        }
      } catch {}
    };
    loadUser();
  }, []);

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
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="stats-chart" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/history")}>
            <Ionicons name="time-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
            <Image source={PROFILE_IMAGE} style={styles.avatar} />
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>{user?.name ?? "–"}</Text>
          <Text style={[styles.profileNim, { color: theme.subtext }]}>{user?.nim ?? "–"}</Text>
        </View>

        {/* ── Stats Card ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistik Laporan</Text>
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: theme.border }]}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(255,59,48,0.1)" }]}>
                <Ionicons name="search-outline" size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.totalLost}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Barang Hilang</Text>
            </View>
            <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: theme.border }]}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(52,199,89,0.1)" }]}>
                <Ionicons name="hand-left-outline" size={20} color="#34C759" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.totalFound}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Barang Temuan</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(255,149,0,0.1)" }]}>
                <Ionicons name="hourglass-outline" size={20} color="#FF9500" />
              </View>
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {statsLoading ? "–" : stats.pending}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Menunggu</Text>
            </View>
          </View>

          <View style={[styles.statsApprovedRow, { borderTopColor: theme.border }]}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={[styles.statsApprovedText, { color: theme.subtext }]}>
              <Text style={{ color: "#34C759", fontWeight: "700" }}>
                {statsLoading ? "–" : stats.approved}
              </Text>
              {" "}laporan disetujui
            </Text>
            <TouchableOpacity
              style={styles.statsHistoryBtn}
              onPress={() => router.push("/history")}
            >
              <Text style={[styles.statsHistoryBtnText, { color: Colors.primary }]}>Lihat Riwayat →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Pengaturan</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>{isDarkMode ? "🌙" : "🌞"}</Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>Tema tampilan aplikasi</Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.accent, true: theme.primary }}
              thumbColor={"#fff"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsNotif((prev) => !prev)}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>{isNotif ? "🔔" : "🔕"}</Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Notifikasi</Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  {isNotif ? "Notifikasi aktif" : "Notifikasi dimatikan"}
                </Text>
              </View>
            </View>
            <Switch
              value={isNotif}
              onValueChange={setIsNotif}
              trackColor={{ false: theme.accent, true: theme.primary }}
              thumbColor={"#fff"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.removeItem("current_user");
            router.replace("/login");
          }}
          style={[styles.settingRow, { borderBottomColor: "transparent" }]}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingEmoji}>🚪</Text>
            <View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Log Out</Text>
              <Text style={[styles.settingDesc, { color: theme.subtext }]}>Keluar Akun</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  topHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", letterSpacing: 1 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconButton: { marginLeft: 15 },
  scroll: { padding: 16 },

  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  avatarWrap: { borderWidth: 3, borderRadius: 60, padding: 3, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  profileName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileNim: { fontSize: 14, marginBottom: 12 },

  // Stats
  statsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  statsRow: { flexDirection: "row" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 8 },
  statIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
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

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10, marginLeft: 4 },

  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
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
});
