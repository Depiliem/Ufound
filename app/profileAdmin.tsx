import { Ionicons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Stats = {
  totalLost: number;
  totalFound: number;
  approved: number;
  pending: number;
};

type Item = {
  id: string;
  created_at: string;
  type: "lost" | "found";
  name: string;
  category: string;
  building: string;
  floor: string;
  description: string;
  image_url: string | null;
  status: string | null;
  push_token: string | null;
};

const getThumbnail = (urlData: string | null) => {
  if (!urlData) return null;
  try {
    const parsed = JSON.parse(urlData);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    return urlData;
  } catch {
    return urlData;
  }
};

export default function ProfileAdminScreen() {
  const { isDarkMode, toggleTheme, currentTheme } = useAppContext();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalLost: 0, totalFound: 0, approved: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Moderation state ──
  const [isModerationVisible, setIsModerationVisible] = useState(false);
  const [pendingItems, setPendingItems] = useState<Item[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingTab, setPendingTab] = useState<"lost" | "found">("lost");
  const [pendingCount, setPendingCount] = useState(0);

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
    fetchPendingCount();
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

  const fetchPendingCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    } catch {}
  }, []);

  const fetchPendingItems = useCallback(async () => {
    try {
      setPendingLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", pendingTab)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingItems(data || []);
    } catch {
    } finally {
      setPendingLoading(false);
    }
  }, [pendingTab]);

  const openModeration = () => {
    setIsModerationVisible(true);
    fetchPendingItems();
  };

  const sendPushNotification = async (
    expoPushToken: string,
    statusLaporan: string,
    itemName: string,
    itemId: string
  ) => {
    const isApproved = statusLaporan === "approved";
    const title = isApproved ? "Laporan Disetujui! 🎉" : "Laporan Ditolak ⚠️";
    const body = isApproved
      ? `Laporan mengenai "${itemName}" sudah diverifikasi dan diposting ya!`
      : `Cek lagi laporan "${itemName}" anda, ada data yang kurang sesuai.`;

    const message = {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { url: `/detail/${itemId}` },
      channelId: "laporan-ufound",
    };

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error("Gagal mengirim push notification via API Expo:", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const targetItem = pendingItems.find((i) => i.id === id);

      const { error } = await supabase
        .from("items")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      if (targetItem && targetItem.push_token) {
        await sendPushNotification(targetItem.push_token, newStatus, targetItem.name, id);
      }

      fetchPendingItems();
      fetchPendingCount();
    } catch {
      if (Platform.OS === "web") {
        window.alert("Gagal memperbarui status laporan.");
      } else {
        Alert.alert("Gagal", "Gagal memperbarui status laporan.");
      }
    }
  };

  const confirmAction = (id: string, newStatus: string) => {
    const actionText = newStatus === "approved" ? "Setujui" : "Tolak";
    if (Platform.OS === "web") {
      if (window.confirm(`${actionText} laporan ini?`))
        handleUpdateStatus(id, newStatus);
    } else {
      Alert.alert(
        `${actionText} Laporan`,
        `Yakin ingin ${actionText.toLowerCase()} laporan ini?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: `Ya, ${actionText}`,
            style: newStatus === "rejected" ? "destructive" : "default",
            onPress: () => handleUpdateStatus(id, newStatus),
          },
        ],
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderPendingCard = ({ item }: { item: Item }) => {
    const thumbnailUri = getThumbnail(item.image_url);
    return (
      <View style={[styles.pendingCard, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <TouchableOpacity
          style={styles.pendingCardTop}
          onPress={() => { setIsModerationVisible(false); router.push(`/detail/${item.id}`); }}
        >
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.pendingThumb} />
          ) : (
            <View style={[styles.pendingThumbEmpty, { backgroundColor: currentTheme.background }]}>
              <Ionicons name="image-outline" size={24} color={currentTheme.textSecondary} />
            </View>
          )}
          <View style={styles.pendingCardText}>
            <Text style={[styles.pendingItemName, { color: currentTheme.textMain }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.pendingMeta, { color: currentTheme.textSecondary }]}>{item.category} · {item.building} · {item.floor}</Text>
            <Text style={[styles.pendingDate, { color: currentTheme.textSecondary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.pendingActionRow, { borderTopColor: currentTheme.border }]}>
          <TouchableOpacity style={[styles.pendingActionBtn, styles.rejectBtn]} onPress={() => confirmAction(item.id, "rejected")}>
            <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.pendingActionText}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pendingActionBtn, styles.approveBtn]} onPress={() => confirmAction(item.id, "approved")}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.pendingActionText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
      {/* ── Top Header ── */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>LOST N FOUND</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => router.push("/history")}
            style={styles.iconButton}
          >
            <Ionicons name="time" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {/* ── Moderation Button with Badge ── */}
          <TouchableOpacity onPress={openModeration} style={styles.iconButton}>
            <View>
              <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
                source={require("../assets/images/user.png")}
                style={styles.defaultAvatarImage}
              />
            </View>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {user?.name ?? "–"}
          </Text>
          {/* Badge Admin */}
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>
          <Text style={[styles.profileEmail, { color: theme.subtext }]}>
            {user?.email ?? "–"}
          </Text>
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
            style={[
              styles.statsApprovedRow,
              { borderTopColor: theme.border },
            ]}
          >
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
              <Text
                style={[
                  styles.statsHistoryBtnText,
                  { color: Colors.primary },
                ]}
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
                  <AntDesign name="sun" size={24} color="black" />
                )}
              </Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
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

      {/* ── Moderation Modal ── */}
      <Modal
        visible={isModerationVisible}
        animationType="slide"
        onRequestClose={() => setIsModerationVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}
          edges={["top", "bottom"]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border, backgroundColor: Colors.primary }]}>
            <TouchableOpacity onPress={() => setIsModerationVisible(false)}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Moderasi Laporan</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={[styles.pendingTabContainer, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity
              style={[styles.pendingTabButton, { borderBottomColor: currentTheme.border }, pendingTab === "lost" && { borderBottomColor: Colors.primary }]}
              onPress={() => setPendingTab("lost")}
            >
              <Text style={[styles.pendingTabText, { color: currentTheme.textSecondary }, pendingTab === "lost" && { color: Colors.primary }]}>
                Lost
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pendingTabButton, { borderBottomColor: currentTheme.border }, pendingTab === "found" && { borderBottomColor: Colors.primary }]}
              onPress={() => setPendingTab("found")}
            >
              <Text style={[styles.pendingTabText, { color: currentTheme.textSecondary }, pendingTab === "found" && { color: Colors.primary }]}>
                Found
              </Text>
            </TouchableOpacity>
          </View>

          <PendingList
            pendingTab={pendingTab}
            currentTheme={currentTheme}
            renderPendingCard={renderPendingCard}
            pendingLoading={pendingLoading}
            pendingItems={pendingItems}
            fetchPendingItems={fetchPendingItems}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Bottom Tab Bar ── */}
      <View style={[styles.tabBar, { backgroundColor: currentTheme.cardBackground, borderTopColor: currentTheme.border }]}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push("/admin")}>
          <Ionicons name="home-outline" size={24} color={currentTheme.textSecondary} />
          <Text style={[styles.tabBarLabel, { color: currentTheme.textSecondary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBarFabWrap} onPress={() => router.push("/report")}>
          <View style={[styles.tabBarFabInner, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Ionicons name="add" size={32} color={Colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.tabBarItem}>
          <Ionicons name="person" size={24} color={Colors.primary} />
          <Text style={[styles.tabBarLabel, { color: Colors.primary }]}>Profile</Text>
        </View>
      </View>
    </View>
  );
}

function PendingList({ pendingTab, currentTheme, renderPendingCard, pendingLoading, pendingItems, fetchPendingItems }: any) {
  React.useEffect(() => { fetchPendingItems(); }, [pendingTab]);
  if (pendingLoading) return (
    <View style={styles.centerContent}>
      <Text style={{ color: currentTheme.textSecondary }}>Memuat...</Text>
    </View>
  );
  if (pendingItems.length === 0) return (
    <View style={styles.centerContent}>
      <Ionicons name="shield-checkmark-outline" size={60} color={currentTheme.iconEmpty} />
      <Text style={[styles.emptyTitle, { color: currentTheme.textMain }]}>Semua Bersih!</Text>
      <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>Tidak ada laporan yang menunggu moderasi.</Text>
    </View>
  );
  return (
    <FlatList
      data={pendingItems}
      keyExtractor={(item) => item.id}
      renderItem={renderPendingCard}
      contentContainerStyle={styles.pendingListContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Top Header ──
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
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconButton: { marginLeft: 15 },

  // ── Badge ──
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold" },

  scroll: { padding: 16 },

  // ── Profile Card ──
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  avatarWrap: { borderRadius: 70, padding: 3, marginBottom: 12 },
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
  profileName: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  adminBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  profileEmail: { fontSize: 13 },

  // ── Stats ──
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

  // ── Settings ──
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

  // ── Moderation Modal ──
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  pendingTabContainer: { flexDirection: "row", paddingHorizontal: 20 },
  pendingTabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2 },
  pendingTabText: { fontSize: 14, fontWeight: "600" },
  pendingListContainer: { padding: 16, paddingBottom: 60 },
  pendingCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  pendingCardTop: { flexDirection: "row", padding: 12, alignItems: "center" },
  pendingThumb: { width: 72, height: 72, borderRadius: 8, resizeMode: "cover" },
  pendingThumbEmpty: { width: 72, height: 72, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  pendingCardText: { flex: 1, marginLeft: 12 },
  pendingItemName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  pendingMeta: { fontSize: 12, marginBottom: 3 },
  pendingDate: { fontSize: 11 },
  pendingActionRow: { flexDirection: "row", borderTopWidth: 1 },
  pendingActionBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 11, gap: 6 },
  rejectBtn: { backgroundColor: "#EF4444" },
  approveBtn: { backgroundColor: "#10B981" },
  pendingActionText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },

  // ── Empty state ──
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 8 },

  // ── Bottom Tab Bar ──
  tabBar: {
    flexDirection: "row",
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabBarItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabBarLabel: { fontSize: 11, marginTop: 2 },
  tabBarFabWrap: { top: -25, justifyContent: "center", alignItems: "center" },
  tabBarFabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});