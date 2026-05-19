import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { supabase } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
type HeaderProps = {
  title: string;
  currentTheme: any;
};

type StatRow = {
  label: string;
  count: number;
};

type RawStatItem = { building: string; floor: string };

// ── Statistics Modal ──────────────────────────────────────────────────────────
const BUILDINGS = ["Semua", "Gedung A", "Gedung B", "Gedung C", "Gedung D"];
const BAR_COLOR = Colors.primary;

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
      // UBAH: Baca dari tabel 'item_logs' alih-alih tabel 'items'
      const { data, error } = await supabase
        .from("item_logs")
        .select("building, floor")
        .eq("type", "found"); // Anda bisa mengatur filter apa pun di sini

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

  // ── Derived stats ──────────────────────────────────────────────────────────
  const filteredRaw = rawData.filter(
    (d) => filterBuilding === "Semua" || d.building === filterBuilding,
  );

  const chartRows: StatRow[] = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredRaw.forEach((d) => {
      if (!d.building || !d.floor) return;
      const key =
        viewMode === "floor" ? `${d.building} · ${d.floor}` : d.building;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRaw, viewMode]);

  const totalFiltered = filteredRaw.length;
  const maxCount = chartRows.length > 0 ? chartRows[0].count : 1;

  // Summary cards always from full rawData
  const totalAll = rawData.length;
  const buildingMap: Record<string, number> = {};
  rawData.forEach((d) => {
    if (d.building)
      buildingMap[d.building] = (buildingMap[d.building] || 0) + 1;
  });
  const topBuilding =
    Object.entries(buildingMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  const locationMap: Record<string, number> = {};
  rawData.forEach((d) => {
    if (d.building && d.floor) {
      const k = `${d.building} · ${d.floor}`;
      locationMap[k] = (locationMap[k] || 0) + 1;
    }
  });
  const topLocation =
    Object.entries(locationMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent // Ditambahkan untuk performa layout yang lebih baik
      onRequestClose={onClose}
    >
      <View style={statsStyles.overlay}>
        <View
          style={[
            statsStyles.sheet,
            { backgroundColor: currentTheme.cardBackground },
          ]}
        >
          <View
            style={[
              statsStyles.handle,
              { backgroundColor: currentTheme.border },
            ]}
          />

          {/* ── Header ── */}
          <View style={statsStyles.header}>
            <View>
              <Text
                style={[statsStyles.title, { color: currentTheme.textMain }]}
              >
                Statistik Barang Hilang
              </Text>
              <Text
                style={[
                  statsStyles.subtitle,
                  { color: currentTheme.textSecondary },
                ]}
              >
                Barang ditemukan yang sudah disetujui
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                statsStyles.closeBtn,
                {
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Ionicons name="close" size={18} color={currentTheme.textMain} />
            </TouchableOpacity>
          </View>

          {/* ── Summary cards ── */}
          <View style={statsStyles.summaryRow}>
            <View
              style={[
                statsStyles.summaryCard,
                {
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={[
                  statsStyles.summaryNum,
                  { color: currentTheme.textMain },
                ]}
              >
                {totalAll}
              </Text>
              <Text
                style={[
                  statsStyles.summaryLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                Total{"\n"}Temuan
              </Text>
            </View>
            <View
              style={[
                statsStyles.summaryCard,
                {
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={[
                  statsStyles.summaryNum,
                  { color: currentTheme.textMain },
                ]}
                numberOfLines={1}
              >
                {topBuilding}
              </Text>
              <Text
                style={[
                  statsStyles.summaryLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                Gedung{"\n"}Terbanyak
              </Text>
            </View>
            <View
              style={[
                statsStyles.summaryCard,
                {
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={[
                  statsStyles.summaryNum,
                  { color: currentTheme.textMain, fontSize: 11 },
                ]}
                numberOfLines={2}
              >
                {topLocation}
              </Text>
              <Text
                style={[
                  statsStyles.summaryLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                Lokasi{"\n"}Terbanyak
              </Text>
            </View>
          </View>

          {/* ── Filter: Gedung ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={statsStyles.filterScroll}
            style={{ marginBottom: 10, flexGrow: 0 }}
          >
            {BUILDINGS.map((b) => {
              const active = filterBuilding === b;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => setFilterBuilding(b)}
                  style={[
                    statsStyles.filterChip,
                    {
                      backgroundColor: active
                        ? BAR_COLOR
                        : currentTheme.background,
                      borderColor: active ? BAR_COLOR : currentTheme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      statsStyles.filterChipText,
                      { color: active ? "#fff" : currentTheme.textSecondary },
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Toggle: Per Lantai / Per Gedung ── */}
          <View
            style={[
              statsStyles.toggleRow,
              {
                backgroundColor: currentTheme.background,
                borderColor: currentTheme.border,
              },
            ]}
          >
            {(["floor", "building"] as const).map((mode) => {
              const active = viewMode === mode;
              const label = mode === "floor" ? "Per Lantai" : "Per Gedung";
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[
                    statsStyles.toggleBtn,
                    active && { backgroundColor: BAR_COLOR },
                  ]}
                >
                  <Text
                    style={[
                      statsStyles.toggleBtnText,
                      { color: active ? "#fff" : currentTheme.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Chart ── */}
          <View
            style={[statsStyles.chartBox, { borderColor: currentTheme.border }]}
          >
            <View style={statsStyles.chartHeaderRow}>
              <Text
                style={[
                  statsStyles.chartHeaderLabel,
                  { color: currentTheme.textMain },
                ]}
              >
                {viewMode === "floor"
                  ? filterBuilding === "Semua"
                    ? "Semua Gedung & Lantai"
                    : filterBuilding
                  : "Perbandingan Gedung"}
              </Text>
              {totalFiltered > 0 && (
                <Text
                  style={[
                    statsStyles.chartHeaderCount,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  {totalFiltered} item
                </Text>
              )}
            </View>

            {statsLoading ? (
              <ActivityIndicator
                size="large"
                color={BAR_COLOR}
                style={{ marginVertical: 30 }}
              />
            ) : chartRows.length === 0 ? (
              <View style={statsStyles.empty}>
                <Ionicons
                  name="bar-chart-outline"
                  size={44}
                  color={currentTheme.textSecondary}
                />
                <Text
                  style={[
                    statsStyles.emptyText,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Belum ada data untuk filter ini
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                {chartRows.map((row, idx) => {
                  const pct =
                    totalFiltered > 0
                      ? Math.round((row.count / totalFiltered) * 100)
                      : 0;
                  const fillRatio = row.count / maxCount;
                  const fillW = Math.max(4, fillRatio * TRACK_WIDTH);
                  const isFirst = idx === 0;

                  return (
                    <View key={row.label} style={statsStyles.barRow}>
                      <View style={statsStyles.barLabelCol}>
                        <Text
                          style={[
                            statsStyles.barLabel,
                            { color: currentTheme.textMain },
                          ]}
                          numberOfLines={2}
                        >
                          {row.label}
                        </Text>
                        <Text
                          style={[
                            statsStyles.barPct,
                            { color: currentTheme.textSecondary },
                          ]}
                        >
                          {pct}%
                        </Text>
                      </View>

                      <View
                        style={[
                          statsStyles.barTrack,
                          { backgroundColor: currentTheme.background },
                        ]}
                      >
                        <View
                          style={[
                            statsStyles.barFill,
                            {
                              width: fillW,
                              backgroundColor: isFirst
                                ? BAR_COLOR
                                : BAR_COLOR + "99",
                            },
                          ]}
                        />
                        {isFirst && (
                          <View
                            style={[
                              statsStyles.crownDot,
                              { backgroundColor: BAR_COLOR },
                            ]}
                          >
                            <Text style={{ fontSize: 8 }}></Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={[
                          statsStyles.countCol,
                          {
                            borderColor: isFirst
                              ? BAR_COLOR + "60"
                              : currentTheme.border,
                            backgroundColor: isFirst
                              ? BAR_COLOR + "15"
                              : currentTheme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            statsStyles.countText,
                            {
                              color: isFirst
                                ? BAR_COLOR
                                : currentTheme.textMain,
                            },
                          ]}
                        >
                          {row.count}
                        </Text>
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

// ── Header Component ──────────────────────────────────────────────────────────
export default function Header({ title, currentTheme }: HeaderProps) {
  const [isStatsVisible, setIsStatsVisible] = useState(false);

  return (
    <>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>{title}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsStatsVisible(true)}
          >
            <Ionicons name="bar-chart-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/history")}
          >
            <Ionicons name="time" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <StatsModal
        visible={isStatsVisible}
        onClose={() => setIsStatsVisible(false)}
        currentTheme={currentTheme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
});

const statsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 30, // Ditambahkan: Safe area bawah untuk perangkat mobile
    height: "85%", // Ditambahkan: Memberikan tinggi absolut agar flex child tidak overflow
    width: "100%", // Ditambahkan: Pastikan lebar penuhi layar
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  summaryNum: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  summaryLabel: { fontSize: 10, textAlign: "center", lineHeight: 14 },
  filterScroll: { paddingRight: 4, gap: 8, flexDirection: "row" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  toggleBtnText: { fontSize: 13, fontWeight: "700" },
  chartBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flex: 1,
    minHeight: 200,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartHeaderLabel: { fontSize: 13, fontWeight: "700" },
  chartHeaderCount: { fontSize: 11 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  barLabelCol: { width: 110, paddingRight: 10 },
  barLabel: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  barPct: { fontSize: 10, marginTop: 2 },
  barTrack: {
    flex: 1,
    height: 24,
    borderRadius: 12,
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
  },
  barFill: { height: 24, borderRadius: 12, position: "absolute", left: 0 },
  crownDot: {
    position: "absolute",
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  countCol: {
    width: 44,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  countText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyText: { marginTop: 10, fontSize: 13, textAlign: "center" },
});
