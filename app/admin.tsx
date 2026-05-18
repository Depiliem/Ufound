import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

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

type CategoryOption = {
  label: string;
  value: string;
  icon: string;
};

const CATEGORIES: CategoryOption[] = [
  { label: "Semua", value: "All", icon: "apps-outline" },
  { label: "Elektronik", value: "Elektronik", icon: "phone-portrait-outline" },
  { label: "Alat Makan", value: "Alat Makan", icon: "restaurant-outline" },
  { label: "Pakaian", value: "Pakaian", icon: "shirt-outline" },
  { label: "Kunci", value: "Kunci", icon: "key-outline" },
  { label: "Accesories", value: "Accesories", icon: "glasses-outline" },
  { label: "Lainnya", value: "Lainnya", icon: "cube-outline" },
];

export default function AdminPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("Semua");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [isModerationVisible, setIsModerationVisible] = useState(false);
  const [pendingItems, setPendingItems] = useState<Item[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingTab, setPendingTab] = useState<"lost" | "found">("lost");
  const [pendingCount, setPendingCount] = useState(0);

  const { currentTheme, isDarkMode } = useAppContext();

  const filterBuildings = ["Semua", "Gedung A", "Gedung B", "Gedung C", "Gedung D"];

  const checkRole = async () => {
    try {
      const raw = await AsyncStorage.getItem("current_user");
      if (!raw) {
        router.replace("/(tabs)");
        return;
      }
      const user = JSON.parse(raw);
      if (user.role !== "admin") {
        router.replace("/(tabs)");
        return;
      }
    } catch {
      router.replace("/(tabs)");
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkRole();
    }, []),
  );

  const fetchApprovedItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", activeTab)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error approved items:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchApprovedItems();
      fetchPendingCount();
    }, [activeTab, fetchApprovedItems, fetchPendingCount]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovedItems();
    fetchPendingCount();
    if (isModerationVisible) {
      fetchPendingItems();
    }
  };

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
    } catch (err) {
      console.error("Error pending items:", err);
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
  itemId: string,
) => {
  const isApproved = statusLaporan === "approved";
 
  const title = isApproved
    ? "Laporan Disetujui! "
    : "Laporan Ditolak ";
 
  const body = isApproved
    ? `Laporan mengenai ${itemName} sudah diverifikasi dan diposting ya!`
    : `Cek lagi laporan ${itemName} anda, ada yang kurang sesuai !.`;
 
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    // data.url digunakan oleh _layout.tsx untuk navigasi ke detail saat notif ditekan
    data: { url: `/detail/${itemId}` },
    channelId: "laporan-ufound",  // channel yang sudah dibuat di report.tsx (ada vibrate-nya)
    android: {
      vibrate: [0, 300, 200, 300],
    },
    priority: "high",
  };
 
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
 
    const resData = await response.json();
    console.log("Respon Server Expo Push:", resData);
  } catch (error) {
    console.error("Gagal mengirim push notification:", error);
  }
};


  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const itemDitemukan = pendingItems.find(i => i.id === id);

      const { error } = await supabase
        .from("items")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      if (itemDitemukan && itemDitemukan.push_token) {
        await sendPushNotification(itemDitemukan.push_token, newStatus, itemDitemukan.name, id);
      }

      fetchPendingItems();
      fetchPendingCount();
      fetchApprovedItems();
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
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleTabSwitch = (tab: "lost" | "found") => {
    setActiveTab(tab);
    setSelectedCategory("All");
    setSelectedBuilding("Semua");
    setSearchQuery("");
  };

  const filteredItems = items.filter((item) => {
    if (!item) return false;
    const name = item.name || "";
    const description = item.description || "";
    const building = item.building || "";
    const category = item.category || "";

    const matchSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBuilding =
      selectedBuilding === "Semua" || building === selectedBuilding;
    const matchCategory =
      selectedCategory === "All" || category === selectedCategory;
    return matchSearch && matchBuilding && matchCategory;
  });

  const renderMainCard = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.cardBackground,
          borderColor: currentTheme.border,
        },
      ]}
      onPress={() => router.push(`/detail/${item.id}`)}
    >
      <View style={styles.imageWrapper}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.noImageContainer,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={40}
              color={currentTheme.textSecondary}
            />
          </View>
        )}
        <View style={styles.categoryOverlay}>
          <Text style={styles.categoryOverlayText}>{item.category}</Text>
        </View>
        <View
          style={[
            styles.typeBadgeOverlay,
            item.type === "lost" ? styles.typeBadgeLost : styles.typeBadgeFound,
          ]}
        >
          <Text style={styles.typeBadgeOverlayText}>
            {item.type === "lost" ? "Hilang" : "Ditemukan"}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text
          style={[styles.itemName, { color: currentTheme.textMain }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.locationText, { color: currentTheme.textSecondary }]}
          >
            {item.building} · {item.floor}
          </Text>
        </View>
        <View style={styles.dateRow}>
          <Ionicons
            name="time-outline"
            size={13}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.dateText, { color: currentTheme.textSecondary }]}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPendingCard = ({ item }: { item: Item }) => (
    <View
      style={[
        styles.pendingCard,
        {
          backgroundColor: currentTheme.cardBackground,
          borderColor: currentTheme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.pendingCardTop}
        onPress={() => {
          setIsModerationVisible(false);
          router.push(`/detail/${item.id}`);
        }}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.pendingThumb} />
        ) : (
          <View
            style={[
              styles.pendingThumbEmpty,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={currentTheme.textSecondary}
            />
          </View>
        )}
        <View style={styles.pendingCardText}>
          <Text
            style={[styles.pendingItemName, { color: currentTheme.textMain }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.pendingMeta, { color: currentTheme.textSecondary }]}
          >
            {item.category} · {item.building} · {item.floor}
          </Text>
          <Text
            style={[styles.pendingDate, { color: currentTheme.textSecondary }]}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>

      <View
        style={[
          styles.pendingActionRow,
          { borderTopColor: currentTheme.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.pendingActionBtn, styles.rejectBtn]}
          onPress={() => confirmAction(item.id, "rejected")}
        >
          <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.pendingActionText}>Tolak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pendingActionBtn, styles.approveBtn]}
          onPress={() => confirmAction(item.id, "approved")}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.pendingActionText}>Setujui</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.background}
      />
      <View
        style={[styles.container, { backgroundColor: currentTheme.background }]}
      >
        {/* Header */}
        <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>LOST N FOUND</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.push("/history")}
              style={styles.iconButton}
            >
              <Ionicons name="time" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openModeration}
              style={styles.iconButton}
            >
              <View>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#FFFFFF"
                />
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

        {/* Lost / Found Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
              activeTab === "lost" && { borderBottomColor: Colors.primary },
            ]}
            onPress={() => handleTabSwitch("lost")}
          >
            <Text
              style={[
                styles.tabText,
                { color: currentTheme.textSecondary },
                activeTab === "lost" && { color: Colors.primary },
              ]}
            >
              Lost Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
              activeTab === "found" && { borderBottomColor: Colors.primary },
            ]}
            onPress={() => handleTabSwitch("found")}
          >
            <Text
              style={[
                styles.tabText,
                { color: currentTheme.textSecondary },
                activeTab === "found" && { color: Colors.primary },
              ]}
            >
              Found Items
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: currentTheme.searchBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: currentTheme.textMain }]}
              placeholder={`Search ${activeTab} item`}
              placeholderTextColor={currentTheme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons
              name="search"
              size={20}
              color={currentTheme.textSecondary}
              style={styles.searchIcon}
            />
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <Text
            style={[
              styles.categorySectionLabel,
              { color: currentTheme.textSecondary },
            ]}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive
                        ? Colors.primary
                        : currentTheme.cardBackground,
                      borderColor: isActive
                        ? Colors.primary
                        : currentTheme.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={13}
                    color={isActive ? "#FFFFFF" : currentTheme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isActive
                          ? "#FFFFFF"
                          : currentTheme.textSecondary,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Building Filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterBuildings.map((bldg, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: currentTheme.cardBackground,
                    borderColor: currentTheme.border,
                  },
                  selectedBuilding === bldg && {
                    backgroundColor: currentTheme.chipActive,
                    borderColor: currentTheme.chipActive,
                  },
                ]}
                onPress={() => setSelectedBuilding(bldg)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: currentTheme.textSecondary },
                    selectedBuilding === bldg && {
                      color: currentTheme.textMain,
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {bldg}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results count */}
        {!loading && (
          <View style={styles.resultsBar}>
            <Text
              style={[
                styles.resultsCount,
                { color: currentTheme.textSecondary },
              ]}
            >
              {filteredItems.length} item ditemukan
            </Text>
          </View>
        )}

        {/* Main grid list */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons
              name="search-outline"
              size={60}
              color={currentTheme.iconEmpty}
            />
            <Text
              style={[styles.emptyText, { color: currentTheme.textSecondary }]}
            >
              Tidak ada data yang sesuai.
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              filteredItems.length % 2 !== 0
                ? [...filteredItems, { id: "__placeholder__" } as any]
                : filteredItems
            }
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              item.id === "__placeholder__" ? (
                <View style={styles.cardPlaceholder} />
              ) : (
                renderMainCard({ item })
              )
            }
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
          />
        )}
      </View>

      {/* Moderation Modal */}
      <Modal
        visible={isModerationVisible}
        animationType="slide"
        onRequestClose={() => setIsModerationVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: currentTheme.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: currentTheme.border,
                backgroundColor: Colors.primary,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setIsModerationVisible(false)}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Moderasi Laporan</Text>
            <View style={{ width: 26 }} />
          </View>

          <View
            style={[
              styles.tabContainer,
              { borderBottomColor: currentTheme.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                { borderBottomColor: currentTheme.border },
                pendingTab === "lost" && { borderBottomColor: Colors.primary },
              ]}
              onPress={() => setPendingTab("lost")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: currentTheme.textSecondary },
                  pendingTab === "lost" && { color: Colors.primary },
                ]}
              >
                Lost
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                { borderBottomColor: currentTheme.border },
                pendingTab === "found" && { borderBottomColor: Colors.primary },
              ]}
              onPress={() => setPendingTab("found")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: currentTheme.textSecondary },
                  pendingTab === "found" && { color: Colors.primary },
                ]}
              >
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
        </View>
      </Modal>

      {/* Manual Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: currentTheme.cardBackground,
            borderTopColor: currentTheme.border,
          },
        ]}
      >
        <View style={styles.tabBarItem}>
          <Ionicons name="home" size={24} color={Colors.primary} />
          <Text style={[styles.tabBarLabel, { color: Colors.primary }]}>
            Home
          </Text>
        </View>

        <TouchableOpacity
          style={styles.tabBarFabWrap}
          onPress={() => router.push("/report")}
        >
          <View
            style={[
              styles.tabBarFabInner,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <Ionicons name="add" size={32} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.tabBarLabel, { color: currentTheme.textSecondary }]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PendingList({
  pendingTab,
  currentTheme,
  renderPendingCard,
  pendingLoading,
  pendingItems,
  fetchPendingItems,
}: {
  pendingTab: "lost" | "found";
  currentTheme: any;
  renderPendingCard: any;
  pendingLoading: boolean;
  pendingItems: Item[];
  fetchPendingItems: () => void;
}) {
  React.useEffect(() => {
    fetchPendingItems();
  }, [pendingTab, fetchPendingItems]);

  if (pendingLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Ionicons
          name="shield-checkmark-outline"
          size={60}
          color={currentTheme.iconEmpty}
        />
        <Text style={[styles.emptyTitle, { color: currentTheme.textMain }]}>
          Semua Bersih!
        </Text>
        <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
          Tidak ada laporan yang menunggu moderasi.
        </Text>
      </View>
    );
  }

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
  container: { flex: 1 },
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
  tabContainer: { flexDirection: "row", paddingHorizontal: 20 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  searchSection: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchIcon: { marginLeft: 10 },
  categorySection: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  categorySectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoryScroll: { paddingHorizontal: 20 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 12, fontWeight: "500" },
  filterSection: { marginTop: 10, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  resultsBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  resultsCount: { fontSize: 12 },
  listContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  card: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  imageWrapper: { position: "relative" },
  cardImage: { width: "100%", height: 120, resizeMode: "cover" },
  noImageContainer: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryOverlayText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  typeBadgeOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeLost: { backgroundColor: "#EF4444" },
  typeBadgeFound: { backgroundColor: "#10B981" },
  typeBadgeOverlayText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  cardContent: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: "600", marginBottom: 5 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 3,
  },
  locationText: { fontSize: 11, flex: 1 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateText: { fontSize: 11 },
  cardPlaceholder: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 15 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === "ios" ? 54 : 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  pendingListContainer: { padding: 16, paddingBottom: 60 },
  pendingCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  pendingCardTop: { flexDirection: "row", padding: 12, alignItems: "center" },
  pendingThumb: { width: 72, height: 72, borderRadius: 8, resizeMode: "cover" },
  pendingThumbEmpty: {
    width: 72,
    height: 72,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingCardText: { flex: 1, marginLeft: 12 },
  pendingItemName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  pendingMeta: { fontSize: 12, marginBottom: 3 },
  pendingDate: { fontSize: 11 },
  pendingActionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  pendingActionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 11,
    gap: 6,
  },
  rejectBtn: { backgroundColor: "#EF4444" },
  approveBtn: { backgroundColor: "#10B981" },
  pendingActionText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  tabBar: {
    flexDirection: "row",
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarLabel: { fontSize: 11, marginTop: 2 },
  tabBarFabWrap: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBarFabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});