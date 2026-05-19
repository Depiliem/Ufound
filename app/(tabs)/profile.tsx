import { Ionicons } from "@expo/vector-icons";
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
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

// ── Statistics Modal (sama persis dengan user.tsx) ────────────────────────────
const BUILDINGS = ["Semua", "Gedung A", "Gedung B", "Gedung C", "Gedung D"];
const BAR_COLOR = Colors.primary;

type RawStatItem = { building: string; floor: string };
type StatRow = { label: string; count: number };

function StatsModal({
  visible,
  onClose,
  currentTheme,
}: {
  visible: boolean;
  onClose: () => void;
  currentTheme: any;
}) {
  const [rawData, setRawData] = useState<RawStatItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filterBuilding, setFilterBuilding] = useState("Semua");
  const [viewMode, setViewMode] = useState<"floor" | "building">("floor");

  const screenWidth = Dimensions.get("window").width;
  const TRACK_WIDTH = screenWidth - 40 - 110 - 44 - 24;

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("building, floor")
        .eq("type", "found")
        .eq("status", "approved");
      if (error || !data) return;
      setRawData(data as RawStatItem[]);
    } catch {
    } finally {
      setStatsLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) fetchStats();
  }, [visible]);

  const filteredRaw = rawData.filter(
    (d) => filterBuilding === "Semua" || d.building === filterBuilding
  );

  const chartRows: StatRow[] = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredRaw.forEach((d) => {
      if (!d.building || !d.floor) return;
      const key = viewMode === "floor" ? `${d.building} · ${d.floor}` : d.building;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRaw, viewMode]);

  const totalFiltered = filteredRaw.length;
  const maxCount = chartRows.length > 0 ? chartRows[0].count : 1;

  const totalAll = rawData.length;
  const buildingMap: Record<string, number> = {};
  rawData.forEach((d) => { if (d.building) buildingMap[d.building] = (buildingMap[d.building] || 0) + 1; });
  const topBuilding = Object.entries(buildingMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  const locationMap: Record<string, number> = {};
  rawData.forEach((d) => { if (d.building && d.floor) { const k = `${d.building} · ${d.floor}`; locationMap[k] = (locationMap[k] || 0) + 1; } });
  const topLocation = Object.entries(locationMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={statsStyles.overlay}>
        <View style={[statsStyles.sheet, { backgroundColor: currentTheme.cardBackground }]}>
          <View style={[statsStyles.handle, { backgroundColor: currentTheme.border }]} />

          <View style={statsStyles.header}>
            <View>
              <Text style={[statsStyles.title, { color: currentTheme.textMain }]}>Statistik Temuan</Text>
              <Text style={[statsStyles.subtitle, { color: currentTheme.textSecondary }]}>
                Barang ditemukan yang sudah disetujui
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[statsStyles.closeBtn, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}
            >
              <Ionicons name="close" size={18} color={currentTheme.textMain} />
            </TouchableOpacity>
          </View>

          <View style={statsStyles.summaryRow}>
            <View style={[statsStyles.summaryCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
              <Text style={[statsStyles.summaryNum, { color: currentTheme.textMain }]}>{totalAll}</Text>
              <Text style={[statsStyles.summaryLabel, { color: currentTheme.textSecondary }]}>Total{"\n"}Temuan</Text>
            </View>
            <View style={[statsStyles.summaryCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
              <Text style={[statsStyles.summaryNum, { color: currentTheme.textMain }]} numberOfLines={1}>{topBuilding}</Text>
              <Text style={[statsStyles.summaryLabel, { color: currentTheme.textSecondary }]}>Gedung{"\n"}Terbanyak</Text>
            </View>
            <View style={[statsStyles.summaryCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
              <Text style={[statsStyles.summaryNum, { color: currentTheme.textMain, fontSize: 11 }]} numberOfLines={2}>{topLocation}</Text>
              <Text style={[statsStyles.summaryLabel, { color: currentTheme.textSecondary }]}>Lokasi{"\n"}Terbanyak</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={statsStyles.filterScroll}
            style={{ marginBottom: 10 }}
          >
            {BUILDINGS.map((b) => {
              const active = filterBuilding === b;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => setFilterBuilding(b)}
                  style={[statsStyles.filterChip, { backgroundColor: active ? BAR_COLOR : currentTheme.background, borderColor: active ? BAR_COLOR : currentTheme.border }]}
                >
                  <Text style={[statsStyles.filterChipText, { color: active ? "#fff" : currentTheme.textSecondary }]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[statsStyles.toggleRow, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
            {(["floor", "building"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[statsStyles.toggleBtn, active && { backgroundColor: BAR_COLOR }]}
                >
                  <Text style={[statsStyles.toggleBtnText, { color: active ? "#fff" : currentTheme.textSecondary }]}>
                    {mode === "floor" ? "Per Lantai" : "Per Gedung"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[statsStyles.chartBox, { borderColor: currentTheme.border }]}>
            <View style={statsStyles.chartHeaderRow}>
              <Text style={[statsStyles.chartHeaderLabel, { color: currentTheme.textMain }]}>
                {viewMode === "floor"
                  ? filterBuilding === "Semua" ? "Semua Gedung & Lantai" : filterBuilding
                  : "Perbandingan Gedung"}
              </Text>
              {totalFiltered > 0 && (
                <Text style={[statsStyles.chartHeaderCount, { color: currentTheme.textSecondary }]}>
                  {totalFiltered} item
                </Text>
              )}
            </View>

            {statsLoading ? (
              <ActivityIndicator size="large" color={BAR_COLOR} style={{ marginVertical: 30 }} />
            ) : chartRows.length === 0 ? (
              <View style={statsStyles.empty}>
                <Ionicons name="bar-chart-outline" size={44} color={currentTheme.textSecondary} />
                <Text style={[statsStyles.emptyText, { color: currentTheme.textSecondary }]}>
                  Belum ada data untuk filter ini
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {chartRows.map((row, idx) => {
                  const pct = totalFiltered > 0 ? Math.round((row.count / totalFiltered) * 100) : 0;
                  const fillW = Math.max(4, (row.count / maxCount) * TRACK_WIDTH);
                  const isFirst = idx === 0;
                  return (
                    <View key={row.label} style={statsStyles.barRow}>
                      <View style={statsStyles.barLabelCol}>
                        <Text style={[statsStyles.barLabel, { color: currentTheme.textMain }]} numberOfLines={2}>
                          {row.label}
                        </Text>
                        <Text style={[statsStyles.barPct, { color: currentTheme.textSecondary }]}>{pct}%</Text>
                      </View>
                      <View style={[statsStyles.barTrack, { backgroundColor: currentTheme.background }]}>
                        <View style={[statsStyles.barFill, { width: fillW, backgroundColor: isFirst ? BAR_COLOR : BAR_COLOR + "99" }]} />
                        {isFirst && (
                          <View style={[statsStyles.crownDot, { backgroundColor: BAR_COLOR }]}>
                            <Text style={{ fontSize: 8 }}>👑</Text>
                          </View>
                        )}
                      </View>
                      <View style={[statsStyles.countCol, { borderColor: isFirst ? BAR_COLOR + "60" : currentTheme.border, backgroundColor: isFirst ? BAR_COLOR + "15" : currentTheme.background }]}>
                        <Text style={[statsStyles.countText, { color: isFirst ? BAR_COLOR : currentTheme.textMain }]}>{row.count}</Text>
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const statsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 12, maxHeight: "90%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center" },
  summaryNum: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  summaryLabel: { fontSize: 10, textAlign: "center", lineHeight: 14 },
  filterScroll: { paddingRight: 4, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  toggleRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 9 },
  toggleBtnText: { fontSize: 13, fontWeight: "700" },
  chartBox: { borderWidth: 1, borderRadius: 16, padding: 14, flex: 1, minHeight: 200 },
  chartHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chartHeaderLabel: { fontSize: 13, fontWeight: "700" },
  chartHeaderCount: { fontSize: 11 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  barLabelCol: { width: 110, paddingRight: 10 },
  barLabel: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  barPct: { fontSize: 10, marginTop: 2 },
  barTrack: { flex: 1, height: 24, borderRadius: 12, overflow: "visible", position: "relative", justifyContent: "center" },
  barFill: { height: 24, borderRadius: 12, position: "absolute", left: 0 },
  crownDot: { position: "absolute", right: 4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  countCol: { width: 44, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  countText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyText: { marginTop: 10, fontSize: 13, textAlign: "center" },
});

// ── Profile Screen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, currentTheme } = useAppContext();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalLost: 0, totalFound: 0, approved: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isStatsVisible, setIsStatsVisible] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem("current_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed);
          fetchStats(parsed.id);
        }
      } catch { }
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
      {/* ── Header sama seperti user.tsx ── */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>LOST N FOUND</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setIsStatsVisible(true)} style={styles.iconButton}>
            <Ionicons name="bar-chart-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/history")} style={styles.iconButton}>
            <Ionicons name="time" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
            <View style={styles.defaultAvatar}>
              <Image
                source={require("../../assets/images/user.png")}
                style={styles.defaultAvatarImage}
              />
            </View>
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
              <Text style={styles.settingEmoji}>
                {isDarkMode
                  ? <AntDesign name="moon" size={24} color="yellow" />
                  : <AntDesign name="sun" size={24} color="black" />}
              </Text>
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
            onPress={async () => {
              await AsyncStorage.removeItem("current_user");
              router.replace("/");
            }}
            style={styles.settingRow}
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
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Stats Modal */}
      <StatsModal
        visible={isStatsVisible}
        onClose={() => setIsStatsVisible(false)}
        currentTheme={currentTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // ── Header (sama persis dengan user.tsx) ──
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
  // ── Avatar ──
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
    resizeMode: "cover"
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
