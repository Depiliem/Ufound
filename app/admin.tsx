import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

export default function AdminPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("Semua");

  const { currentTheme } = useAppContext();

  const filterBuildings = [
    "Semua",
    "Gedung A",
    "Gedung B",
    "Gedung C",
    "Gedung D",
  ];

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", activeTab)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchItems();
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // Fungsi ngirim notifikasi beserta URL Tujuan (Deep Link)
  const sendPushNotification = async (expoPushToken: string, statusLaporan: string, itemName: string, itemId: string) => {
    const title = statusLaporan === "approved" ? "Laporan Disetujui! 🎉" : "Laporan Ditolak ❌";
    const body = statusLaporan === "approved" 
      ? `Laporan lu tentang ${itemName} udah diverifikasi dan diposting ya!` 
      : `Cek lagi laporan ${itemName} lu, ada yang kurang sesuai.`;

    const message = {
      to: expoPushToken,
      sound: "default", // Server bilang ke HP: "Woy, bunyi dan geter ya!"
      title: title,
      body: body,
      data: { url: `/detail/${itemId}` }, // Selipin data buat loncat halaman
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
      console.error("Gagal ngirim notifikasi push:", error);
    }
  };

  const handleUpdateStatus = async (item: Item, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("items")
        .update({ status: newStatus })
        .eq("id", item.id);

      if (error) throw error;

      // Eksekusi tembak notif ke token pelapor
      if (item.push_token) {
        await sendPushNotification(item.push_token, newStatus, item.name, item.id);
      }

      fetchItems();
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert("Gagal: Tidak dapat memperbarui status laporan.");
      } else {
        Alert.alert("Gagal", "Tidak dapat memperbarui status laporan.");
      }
      setLoading(false);
    }
  };

  const confirmAction = (item: Item, newStatus: string) => {
    const actionText = newStatus === "approved" ? "Setujui" : "Tolak";

    if (Platform.OS === "web") {
      const isConfirmed = window.confirm(
        `Apakah Anda yakin ingin ${actionText.toLowerCase()} laporan ini?`,
      );
      if (isConfirmed) {
        handleUpdateStatus(item, newStatus);
      }
    } else {
      Alert.alert(
        `${actionText} Laporan`,
        `Apakah Anda yakin ingin ${actionText.toLowerCase()} laporan ini?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: `Ya, ${actionText}`,
            style: newStatus === "rejected" ? "destructive" : "default",
            onPress: () => handleUpdateStatus(item, newStatus),
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

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchBuilding =
      selectedBuilding === "Semua" || item.building === selectedBuilding;
    return matchSearch && matchBuilding;
  });

  const renderItem = ({ item }: { item: Item }) => {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: currentTheme.cardBackground,
            borderColor: currentTheme.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.push(`/detail/${item.id}`)}>
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

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text
                style={[styles.itemName, { color: currentTheme.textMain }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View
                style={[
                  styles.badge,
                  activeTab === "lost" ? styles.badgeLost : styles.badgeFound,
                ]}
              >
                <Text style={styles.badgeText}>
                  {activeTab === "lost" ? "Hilang" : "Ditemukan"}
                </Text>
              </View>
            </View>

            <Text style={styles.itemCategory}>{item.category}</Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={currentTheme.textSecondary}
              />
              <Text
                style={[
                  styles.locationText,
                  { color: currentTheme.textSecondary },
                ]}
              >
                {item.building} - {item.floor}
              </Text>
            </View>

            <View style={styles.dateRow}>
              <Ionicons
                name="time-outline"
                size={14}
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

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => confirmAction(item, "rejected")}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => confirmAction(item, "approved")}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.actionButtonText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <View
        style={[styles.container, { backgroundColor: currentTheme.background }]}
      >
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>ADMIN PANEL</Text>
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.backButton}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
              activeTab === "lost" && { borderBottomColor: Colors.primary },
            ]}
            onPress={() => setActiveTab("lost")}
          >
            <Text
              style={[
                styles.tabText,
                { color: currentTheme.textSecondary },
                activeTab === "lost" && { color: Colors.primary },
              ]}
            >
              Moderasi Lost
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
              activeTab === "found" && { borderBottomColor: Colors.primary },
            ]}
            onPress={() => setActiveTab("found")}
          >
            <Text
              style={[
                styles.tabText,
                { color: currentTheme.textSecondary },
                activeTab === "found" && { color: Colors.primary },
              ]}
            >
              Moderasi Found
            </Text>
          </TouchableOpacity>
        </View>

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
              placeholder="Cari data laporan..."
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

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons
              name="shield-checkmark-outline"
              size={60}
              color={currentTheme.iconEmpty}
            />
            <Text
              style={[styles.emptyText, { color: currentTheme.textSecondary }]}
            >
              Tidak ada laporan yang menunggu moderasi.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#1A1A1A",
  },
  backButton: { padding: 5 },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  searchSection: { paddingHorizontal: 20, marginBottom: 10 },
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
  filterSection: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 15 },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
  },
  cardImage: { width: "100%", height: 150, resizeMode: "cover" },
  noImageContainer: {
    width: "100%",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { padding: 15 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  itemName: { fontSize: 18, fontWeight: "bold", flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeLost: { backgroundColor: "#FFEFEF" },
  badgeFound: { backgroundColor: "#EFFFF4" },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#000000" },
  itemCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 10,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  locationText: { fontSize: 14, marginLeft: 5 },
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  dateText: { fontSize: 12, marginLeft: 5 },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: { backgroundColor: "#FF3B30" },
  approveButton: { backgroundColor: "#34C759" },
  actionButtonText: { color: "#FFFFFF", fontWeight: "bold", marginLeft: 8 },
});