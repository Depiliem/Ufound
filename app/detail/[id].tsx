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
  StatusBar,
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
  status: string;
  map_x: number | null;
  map_y: number | null;
};

export default function ItemDetail() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const { currentTheme } = useAppContext();

  const screenWidth = Dimensions.get("window").width;
  const mapCanvasWidth = screenWidth - 80;
  const mapCanvasHeight = mapCanvasWidth * (900 / 1250);

  useEffect(() => {
    const fetchItemDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setItem(data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItemDetail();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMapImageUrl = (building: string, floor: string) => {
    if (!building || !floor)
      return "https://placehold.co/800x1200/png?text=Peta+Tidak+Tersedia";
    const formattedBuilding = building.toLowerCase().replace(/\s+/g, "-");
    const formattedFloor = floor.toLowerCase().replace(/\s+/g, "-");
    const fileName = `${formattedBuilding}-${formattedFloor}.jpg`;
    const { data } = supabase.storage.from("floor-maps").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleContactAction = () => {
    if (Platform.OS === "web") {
      window.alert(
        "Fitur kontak akan diaktifkan setelah sistem autentikasi selesai.",
      );
    } else {
      Alert.alert(
        "Informasi",
        "Fitur kontak akan diaktifkan setelah sistem autentikasi selesai.",
      );
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={60}
          color={currentTheme.textSecondary}
        />
        <Text style={[styles.errorText, { color: currentTheme.textMain }]}>
          Barang tidak ditemukan.
        </Text>
        <TouchableOpacity
          style={styles.backBtnError}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnErrorText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsFullScreen(true)}
            >
              <Image
                source={{ uri: item.image_url }}
                style={[styles.mainImage, { width: screenWidth }]}
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.noImagePlaceholder, { width: screenWidth }]}>
              <Ionicons name="image-outline" size={60} color="#999999" />
              <Text style={styles.noImageText}>
                Tidak ada foto yang dilampirkan
              </Text>
            </View>
          )}

          <View style={styles.headerFloatingNav}>
            <TouchableOpacity
              style={styles.floatingBackBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View
              style={[
                styles.floatingBadge,
                item.type === "lost" ? styles.badgeLost : styles.badgeFound,
              ]}
            >
              <Text style={styles.floatingBadgeText}>
                {item.type === "lost" ? "HILANG" : "DITEMUKAN"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.contentContainer,
            { backgroundColor: currentTheme.background },
          ]}
        >
          <View style={styles.titleSection}>
            <Text style={[styles.itemTitle, { color: currentTheme.textMain }]}>
              {item.name}
            </Text>
            <Text style={[styles.itemCategory, { color: Colors.primary }]}>
              {item.category}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: currentTheme.border },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(88, 86, 214, 0.1)" },
                ]}
              >
                <Ionicons name="location" size={22} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Lokasi
                </Text>
                <Text
                  style={[styles.infoValue, { color: currentTheme.textMain }]}
                >
                  {item.building} - {item.floor}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.noBorderBottom]}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(88, 86, 214, 0.1)" },
                ]}
              >
                <Ionicons name="time" size={22} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Waktu Pelaporan
                </Text>
                <Text
                  style={[styles.infoValue, { color: currentTheme.textMain }]}
                >
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
          </View>

          {item.building && item.floor && (
            <TouchableOpacity
              style={[
                styles.viewMapBtn,
                {
                  borderColor: currentTheme.border,
                  backgroundColor: currentTheme.cardBackground,
                },
              ]}
              onPress={() => setIsMapModalVisible(true)}
            >
              <Ionicons
                name="map-outline"
                size={20}
                color={Colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.viewMapBtnText, { color: Colors.primary }]}>
                Cek Denah Lokasi
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons
                name="chevron-forward"
                size={20}
                color={currentTheme.textSecondary}
              />
            </TouchableOpacity>
          )}

          <View style={styles.descriptionSection}>
            <Text
              style={[styles.sectionTitle, { color: currentTheme.textMain }]}
            >
              Deskripsi Tambahan
            </Text>
            <Text
              style={[
                styles.descriptionText,
                { color: currentTheme.textSecondary },
              ]}
            >
              {item.description
                ? item.description
                : "Pelapor tidak memberikan deskripsi tambahan untuk barang ini."}
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionFooter,
          {
            backgroundColor: currentTheme.cardBackground,
            borderTopColor: currentTheme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={handleContactAction}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color="#FFFFFF"
            style={styles.actionIcon}
          />
          <Text style={styles.primaryActionText}>
            {item.type === "lost" ? "Saya Menemukan Ini" : "Ini Barang Saya"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullScreen(false)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeFullScreenBtn}
            onPress={() => setIsFullScreen(false)}
          >
            <Ionicons name="close" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {item?.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={styles.fullScreenImage}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={isMapModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View
            style={[
              styles.mapModalCard,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <View
              style={[
                styles.mapModalHeaderCard,
                { borderBottomColor: currentTheme.border },
              ]}
            >
              <Text
                style={[
                  styles.mapModalTitleCard,
                  { color: currentTheme.textMain },
                ]}
              >
                Denah Lokasi
              </Text>
              <TouchableOpacity onPress={() => setIsMapModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={currentTheme.textMain}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.mapCanvasContainer}>
              <View
                style={[
                  styles.mapPressableCanvas,
                  { width: mapCanvasWidth, height: mapCanvasHeight },
                ]}
              >
                {item && (
                  <Image
                    source={{ uri: getMapImageUrl(item.building, item.floor) }}
                    style={styles.mapImage}
                  />
                )}

                {item?.map_x !== null && item?.map_y !== null && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.pinContainer,
                      {
                        left: `${item.map_x * 100}%`,
                        top: `${item.map_y * 100}%`,
                        transform: [{ translateX: -16 }, { translateY: -32 }],
                      },
                    ]}
                  >
                    <Ionicons name="location" size={32} color="#FF3B30" />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { fontSize: 16, marginTop: 15, fontWeight: "500" },
  backBtnError: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backBtnErrorText: { color: "#FFFFFF", fontWeight: "bold" },
  imageContainer: { position: "relative", backgroundColor: "#EAEAEA" },
  mainImage: { height: 350, resizeMode: "cover" },
  noImagePlaceholder: {
    height: 350,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
  },
  noImageText: { color: "#999999", marginTop: 10, fontSize: 14 },
  headerFloatingNav: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  floatingBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeLost: { backgroundColor: "#FF3B30" },
  badgeFound: { backgroundColor: "#34C759" },
  floatingBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  contentContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 25,
    minHeight: 500,
  },
  titleSection: { marginBottom: 25 },
  itemTitle: { fontSize: 26, fontWeight: "bold", marginBottom: 5 },
  itemCategory: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 15,
    marginBottom: 15,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  noBorderBottom: { borderBottomWidth: 0 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: "600" },
  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 25,
  },
  viewMapBtnText: { fontSize: 15, fontWeight: "bold" },
  descriptionSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  descriptionText: { fontSize: 15, lineHeight: 24 },
  bottomSpacing: { height: 80 },
  actionFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 35 : 20,
    borderTopWidth: 1,
    elevation: 10,
  },
  primaryActionBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: { marginRight: 10 },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullScreenBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    zIndex: 999,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
  },
  fullScreenImage: { width: "100%", height: "100%", resizeMode: "contain" },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mapModalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  mapModalHeaderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  mapModalTitleCard: { fontSize: 18, fontWeight: "bold" },
  mapCanvasContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPressableCanvas: { position: "relative" },
  mapImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 8,
  },
  pinContainer: { position: "absolute", zIndex: 10 },
});
