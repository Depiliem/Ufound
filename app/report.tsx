import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

export default function Report() {
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [building, setBuilding] = useState("");
  const [isBuildingModalVisible, setBuildingModalVisible] = useState(false);
  const [floor, setFloor] = useState("");
  const [isFloorModalVisible, setFloorModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [mapCoordinate, setMapCoordinate] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const { currentTheme } = useAppContext();

  const categories = [
    "Elektronik",
    "Alat Makan",
    "Pakaian",
    "Accesories",
    "Lainnya",
  ];
  const buildings = ["Gedung A", "Gedung B", "Gedung C", "Gedung D"];

  const getDynamicFloors = (selectedBuilding: string) => {
    let maxFloors = 0;
    switch (selectedBuilding) {
      case "Gedung A":
        maxFloors = 9;
        break;
      case "Gedung B":
        maxFloors = 6;
        break;
      case "Gedung C":
        maxFloors = 12;
        break;
      case "Gedung D":
        maxFloors = 23;
        break;
      default:
        return [];
    }
    const availableFloors = [];
    for (let i = 1; i <= maxFloors; i++) {
      if (i !== 4 && i !== 13) availableFloors.push(`Lantai ${i}`);
    }
    return availableFloors;
  };

  const floors = getDynamicFloors(building);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleMapPress = (event: any) => {
    const rawX = event.nativeEvent.offsetX ?? event.nativeEvent.locationX;
    const rawY = event.nativeEvent.offsetY ?? event.nativeEvent.locationY;

    if (mapSize.width > 0 && mapSize.height > 0) {
      const percentX = Math.max(0, Math.min(1, rawX / mapSize.width));
      const percentY = Math.max(0, Math.min(1, rawY / mapSize.height));
      setMapCoordinate({ x: percentX, y: percentY });
    }
  };

  const getMapImageUrl = () => {
    if (!building || !floor)
      return "https://placehold.co/800x1200/png?text=Peta+Tidak+Tersedia";
    const formattedBuilding = building.toLowerCase().replace(/\s+/g, "-");
    const formattedFloor = floor.toLowerCase().replace(/\s+/g, "-");
    const fileName = `${formattedBuilding}-${formattedFloor}.jpg`;
    const { data } = supabase.storage.from("floor-maps").getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Generator UUID Client-Side Absolut
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  };

  const handleSubmit = async () => {
    if (!itemName || !category || !building || !floor) {
      Alert.alert("Validasi", "Mohon lengkapi semua field yang diwajibkan.");
      return;
    }
    setIsLoading(true);
    try {
      const newItemId = generateUUID(); // Buat ID secara mandiri
      let finalImageUrl = null;

      if (imageUri) {
        const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
        const fileName = `public/${Date.now()}.${fileExt}`;
        const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";
        let fileData;
        if (Platform.OS === "web") {
          const response = await fetch(imageUri);
          fileData = await response.blob();
        } else {
          const file = new File(imageUri);
          const base64 = await file.base64();
          fileData = decode(base64);
        }
        const { error } = await supabase.storage
          .from("item-images")
          .upload(fileName, fileData, { contentType: mimeType });
        if (error) throw new Error(`Gagal unggah foto: ${error.message}`);
        finalImageUrl = supabase.storage
          .from("item-images")
          .getPublicUrl(fileName).data.publicUrl;
      }

      const { error: insertError } = await supabase.from("items").insert([
        {
          id: newItemId, // Pasang ID buatan sendiri ke Supabase
          type: reportType,
          name: itemName,
          category: category,
          building: building,
          floor: floor,
          description: description,
          image_url: finalImageUrl,
          map_x: mapCoordinate?.x || null,
          map_y: mapCoordinate?.y || null,
        },
      ]); // Tidak perlu .select() lagi!

      if (insertError)
        throw new Error(`Gagal simpan data: ${insertError.message}`);

      // Eksekusi mutlak penyimpanan lokal jika tipe = lost
      if (reportType === "lost") {
        const storedIds = await AsyncStorage.getItem("my_reports");
        let idsArray: string[] = [];
        try {
          idsArray = storedIds ? JSON.parse(storedIds) : [];
          if (!Array.isArray(idsArray)) idsArray = [];
        } catch (e) {
          idsArray = [];
        }
        idsArray.push(newItemId);
        await AsyncStorage.setItem("my_reports", JSON.stringify(idsArray));
        console.log("ID TERSIMPAN DI LOKAL:", newItemId); // Untuk cek di Terminal
      }

      Alert.alert("Sukses", "Laporan berhasil disimpan.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("GAGAL:", error);
      Alert.alert("Gagal", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const DropdownModal = ({
    visible,
    data,
    selectedValue,
    onSelect,
    onClose,
  }: any) => (
    <Modal visible={visible} transparent={true} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currentTheme.cardBackground },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {data.map((item: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: currentTheme.border },
                      selectedValue === item && {
                        backgroundColor: currentTheme.chipActive,
                      },
                      index === data.length - 1 && styles.dropdownItemLast,
                    ]}
                    onPress={() => onSelect(item)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: currentTheme.textMain },
                        selectedValue === item && {
                          color: Colors.primary,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedValue === item && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const screenWidth = Dimensions.get("window").width;
  const minWidth = screenWidth;
  const minHeight = screenWidth * (900 / 1250);

  return (
    <View
      style={[styles.safeArea, { backgroundColor: currentTheme.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.toggleContainer,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                reportType === "lost" && styles.toggleBtnActive,
              ]}
              onPress={() => setReportType("lost")}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: currentTheme.textSecondary },
                  reportType === "lost" && styles.toggleTextActive,
                ]}
              >
                I Lost an Item
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                reportType === "found" && styles.toggleBtnActive,
              ]}
              onPress={() => setReportType("found")}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: currentTheme.textSecondary },
                  reportType === "found" && styles.toggleTextActive,
                ]}
              >
                I Found an Item
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Nama Barang
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: currentTheme.border,
                  color: currentTheme.textMain,
                },
              ]}
              placeholder="Contoh: Kunci Motor, Dompet Hitam"
              placeholderTextColor={currentTheme.textSecondary}
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Kategori
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                {
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: currentTheme.border,
                },
              ]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  {
                    color: category
                      ? currentTheme.textMain
                      : currentTheme.textSecondary,
                  },
                ]}
              >
                {category || "Pilih Kategori..."}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={currentTheme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Lokasi Terakhir / Ditemukan
            </Text>
            <View style={styles.locationRow}>
              <View style={{ flex: 1, marginRight: 5 }}>
                <TouchableOpacity
                  style={[
                    styles.dropdownSelector,
                    {
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  onPress={() => setBuildingModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      {
                        color: building
                          ? currentTheme.textMain
                          : currentTheme.textSecondary,
                      },
                    ]}
                  >
                    {building || "Gedung..."}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={currentTheme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, marginLeft: 5 }}>
                <TouchableOpacity
                  style={[
                    styles.dropdownSelector,
                    {
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: currentTheme.border,
                      opacity: building ? 1 : 0.5,
                    },
                  ]}
                  disabled={!building}
                  onPress={() => {
                    setFloorModalVisible(true);
                    setMapCoordinate(null);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      {
                        color: floor
                          ? currentTheme.textMain
                          : currentTheme.textSecondary,
                      },
                    ]}
                  >
                    {floor || "Lantai..."}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={currentTheme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.mapButtonFull,
                {
                  backgroundColor: currentTheme.cardBackground,
                  opacity: building && floor ? 1 : 0.6,
                  borderColor: currentTheme.border,
                },
              ]}
              disabled={!building || !floor}
              onPress={() => setIsMapModalVisible(true)}
            >
              <Ionicons
                name="map-outline"
                size={20}
                color={
                  building && floor
                    ? Colors.primary
                    : currentTheme.textSecondary
                }
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.mapButtonText,
                  {
                    color:
                      building && floor
                        ? Colors.primary
                        : currentTheme.textSecondary,
                  },
                ]}
              >
                {mapCoordinate ? "Ubah Titik Lokasi..." : "Tandai di Peta..."}
              </Text>
              <View style={{ flex: 1 }} />
              {mapCoordinate ? (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.primary}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    building && floor
                      ? Colors.primary
                      : currentTheme.textSecondary
                  }
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Deskripsi Tambahan
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: currentTheme.border,
                  color: currentTheme.textMain,
                },
              ]}
              placeholder="Ciri-ciri khusus, jam kejadian, dll."
              placeholderTextColor={currentTheme.textSecondary}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Unggah Foto (Opsional)
            </Text>
            <TouchableOpacity
              style={[
                styles.uploadBox,
                {
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: currentTheme.border,
                },
              ]}
              onPress={pickImage}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={32}
                    color={currentTheme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.uploadText,
                      { color: currentTheme.textSecondary },
                    ]}
                  >
                    Ketuk untuk memilih foto dari galeri
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitBtnText}>
              {isLoading ? "Mengirim Data..." : "Submit Laporan"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <DropdownModal
          visible={isCategoryModalVisible}
          data={categories}
          selectedValue={category}
          onSelect={(item: string) => {
            setCategory(item);
            setCategoryModalVisible(false);
          }}
          onClose={() => setCategoryModalVisible(false)}
        />
        <DropdownModal
          visible={isBuildingModalVisible}
          data={buildings}
          selectedValue={building}
          onSelect={(item: string) => {
            setBuilding(item);
            setBuildingModalVisible(false);
            setFloor("");
            setMapCoordinate(null);
          }}
          onClose={() => setBuildingModalVisible(false)}
        />
        <DropdownModal
          visible={isFloorModalVisible}
          data={floors}
          selectedValue={floor}
          onSelect={(item: string) => {
            setFloor(item);
            setFloorModalVisible(false);
            setMapCoordinate(null);
          }}
          onClose={() => setFloorModalVisible(false)}
        />

        <Modal visible={isMapModalVisible} animationType="slide">
          <View
            style={[
              styles.mapModalContainer,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <View
              style={[
                styles.mapModalHeader,
                { borderBottomColor: currentTheme.border },
              ]}
            >
              <TouchableOpacity onPress={() => setIsMapModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={currentTheme.textMain}
                />
              </TouchableOpacity>
              <Text
                style={[styles.mapModalTitle, { color: currentTheme.textMain }]}
              >
                Titik Lokasi
              </Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.mapViewContainer}>
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
                  <Pressable
                    style={[
                      styles.mapPressableCanvas,
                      {
                        width: isMinimized ? minWidth : 1250,
                        height: isMinimized ? minHeight : 900,
                      },
                    ]}
                    onLayout={(e) =>
                      setMapSize({
                        width: e.nativeEvent.layout.width,
                        height: e.nativeEvent.layout.height,
                      })
                    }
                    onPress={handleMapPress}
                  >
                    <Image
                      source={{ uri: getMapImageUrl() }}
                      style={styles.mapImage}
                    />
                    {mapCoordinate && (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.pinContainer,
                          {
                            left: `${mapCoordinate.x * 100}%`,
                            top: `${mapCoordinate.y * 100}%`,
                            transform: [
                              { translateX: -24 },
                              { translateY: -48 },
                            ],
                          },
                        ]}
                      >
                        <Ionicons name="location" size={48} color="#FF3B30" />
                      </View>
                    )}
                  </Pressable>
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
            </View>

            <View
              style={[
                styles.mapModalFooter,
                {
                  borderTopColor: currentTheme.border,
                  backgroundColor: currentTheme.cardBackground,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.mapSaveBtn, !mapCoordinate && { opacity: 0.5 }]}
                disabled={!mapCoordinate}
                onPress={() => setIsMapModalVisible(false)}
              >
                <Text style={styles.mapSaveBtnText}>Simpan Titik</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    marginBottom: 25,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 16, fontWeight: "600" },
  toggleTextActive: { color: "#FFFFFF" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 100 },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 55,
  },
  dropdownText: { fontSize: 16, flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    maxHeight: "60%",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemText: { fontSize: 16 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  mapButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 55,
  },
  mapButtonText: { fontSize: 16, fontWeight: "500", marginLeft: 10 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadText: { marginTop: 10, fontSize: 14, textAlign: "center" },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  mapModalContainer: { flex: 1 },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    borderBottomWidth: 1,
  },
  mapModalTitle: { fontSize: 18, fontWeight: "bold" },
  mapViewContainer: {
    flex: 1,
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mapPressableCanvas: { position: "relative" },
  mapImage: { width: "100%", height: "100%", resizeMode: "cover" },
  pinContainer: { position: "absolute", zIndex: 10 },
  mapModalFooter: { padding: 20, borderTopWidth: 1 },
  mapSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  mapSaveBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  floatingToggleBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
});
