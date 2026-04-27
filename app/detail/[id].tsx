import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAppContext } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";

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
  map_x: number | null;
  map_y: number | null;
};

export default function DetailItem() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { currentTheme } = useAppContext();

  useEffect(() => {
    if (!id || id === "undefined") {
      return;
    }
    fetchItemDetail();
  }, [id]);

  const fetchItemDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setItem(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    try {
      const message = `🚨 ${item.type === "lost" ? "BARANG HILANG" : "BARANG DITEMUKAN"} 🚨\n\nNama: ${item.name}\nLokasi: ${item.building} - ${item.floor}\n\nCek detailnya di aplikasi Ufound!`;
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  const getMapImageUrl = () => {
    if (!item) return undefined;
    const formattedBuilding = item.building.toLowerCase().replace(/\s+/g, "-");
    const formattedFloor = item.floor.toLowerCase().replace(/\s+/g, "-");
    const fileName = `${formattedBuilding}-${formattedFloor}.jpg`;
    const { data } = supabase.storage.from("floor-maps").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleShowMap = () => {
    if (item && item.map_x !== null && item.map_y !== null) {
      if (item.map_x > 1 || item.map_y > 1) {
        Alert.alert(
          "Data Kedaluwarsa",
          "Ini adalah laporan versi lama. Posisi peta tidak dapat ditampilkan dengan akurat.",
        );
      } else {
        setIsMapVisible(true);
      }
    } else {
      Alert.alert(
        "Lokasi",
        "Tidak ada data lokasi yang ditandai untuk barang ini.",
      );
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: currentTheme.background }]}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View
        style={[styles.center, { backgroundColor: currentTheme.background }]}
      >
        <Text style={{ color: currentTheme.textMain }}>
          Data tidak ditemukan.
        </Text>
      </View>
    );
  }

  const mapUrl = getMapImageUrl();
  const screenWidth = Dimensions.get("window").width;
  const minWidth = screenWidth;
  const minHeight = screenWidth * (900 / 1250);

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={currentTheme.textMain}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.textMain }]}>
            Detail Informasi
          </Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons
              name="share-social-outline"
              size={24}
              color={currentTheme.textMain}
            />
          </TouchableOpacity>
        </View>

        {item.image_url ? (
          <Image
            source={{ uri: item.image_url as string }}
            style={styles.mainImage}
          />
        ) : (
          <View
            style={[
              styles.noImage,
              { backgroundColor: currentTheme.cardBackground },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={80}
              color={currentTheme.textSecondary}
            />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: currentTheme.textMain }]}>
              {item.name}
            </Text>
            <View
              style={[
                styles.badge,
                item.type === "lost" ? styles.badgeLost : styles.badgeFound,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.type === "lost" ? "Hilang" : "Ditemukan"}
              </Text>
            </View>
          </View>

          <Text style={styles.category}>{item.category}</Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={[styles.infoText, { color: currentTheme.textMain }]}>
                {item.building} - {item.floor}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={[styles.infoText, { color: currentTheme.textMain }]}>
                {new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: currentTheme.textMain }]}>
            Deskripsi
          </Text>
          <Text
            style={[styles.description, { color: currentTheme.textSecondary }]}
          >
            {item.description || "Tidak ada deskripsi tambahan."}
          </Text>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.mapButton]}
              onPress={handleShowMap}
            >
              <Ionicons name="map-outline" size={22} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
                Lihat Lokasi di Peta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={isMapVisible} animationType="slide" transparent={false}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: currentTheme.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: currentTheme.border },
            ]}
          >
            <TouchableOpacity onPress={() => setIsMapVisible(false)}>
              <Ionicons name="close" size={28} color={currentTheme.textMain} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
              Titik Lokasi
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.mapViewContainer}>
            {mapUrl && (
              <>
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={[
                        styles.mapCanvas,
                        {
                          width: isMinimized ? minWidth : 1250,
                          height: isMinimized ? minHeight : 900,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: mapUrl as string }}
                        style={styles.mapImage}
                      />
                      <View
                        pointerEvents="none"
                        style={[
                          styles.pin,
                          {
                            left: `${(item.map_x || 0) * 100}%`,
                            top: `${(item.map_y || 0) * 100}%`,
                            transform: [
                              { translateX: -24 },
                              { translateY: -48 },
                            ],
                          },
                        ]}
                      >
                        <Ionicons name="location" size={48} color="#FF3B30" />
                      </View>
                    </View>
                  </ScrollView>
                </ScrollView>

                <TouchableOpacity
                  style={styles.floatingToggleBtn}
                  onPress={() => setIsMinimized(!isMinimized)}
                >
                  <Ionicons
                    name={isMinimized ? "expand" : "contract"}
                    size={28}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </>
            )}
          </View>

          <View
            style={[
              styles.modalFooter,
              { backgroundColor: currentTheme.cardBackground },
            ]}
          >
            <Text
              style={[styles.locationDetail, { color: currentTheme.textMain }]}
            >
              {item.building} - {item.floor}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsMapVisible(false)}
            >
              <Text style={styles.closeBtnText}>Tutup Peta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  backButton: { padding: 5 },
  mainImage: { width: "100%", height: 300, resizeMode: "cover" },
  noImage: {
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  name: { fontSize: 24, fontWeight: "bold", flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  badgeLost: { backgroundColor: "#FFEFEF" },
  badgeFound: { backgroundColor: "#EFFFF4" },
  badgeText: { fontWeight: "bold", fontSize: 12 },
  category: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: 20,
  },
  infoCard: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 25 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoText: { marginLeft: 10, fontSize: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 30 },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 10,
  },
  mapButton: { backgroundColor: Colors.primary },
  actionButtonText: { marginLeft: 8, fontSize: 16, fontWeight: "bold" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  mapViewContainer: {
    flex: 1,
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mapCanvas: { position: "relative" },
  mapImage: { width: "100%", height: "100%", resizeMode: "cover" },
  pin: { position: "absolute", zIndex: 10 },
  modalFooter: {
    padding: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  locationDetail: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  floatingToggleBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
