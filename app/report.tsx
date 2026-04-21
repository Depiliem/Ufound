import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

  const handleSubmit = async () => {
    if (!itemName || !category || !building || !floor) {
      Alert.alert("Validasi", "Mohon lengkapi semua field yang diwajibkan.");
      return;
    }

    setIsLoading(true);

    try {
      let finalImageUrl = null;

      if (imageUri) {
        const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
        const fileName = `public/${Date.now()}.${fileExt}`;
        const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";

        const file = new File(imageUri);
        const base64 = await file.base64();

        const { data, error } = await supabase.storage
          .from("item-images")
          .upload(fileName, decode(base64), {
            contentType: mimeType,
          });

        if (error) throw new Error(`Gagal unggah foto: ${error.message}`);

        const { data: publicUrlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("items").insert([
        {
          type: reportType,
          name: itemName,
          category: category,
          building: building,
          floor: floor,
          description: description,
          image_url: finalImageUrl,
        },
      ]);

      if (insertError)
        throw new Error(`Gagal simpan data: ${insertError.message}`);

      Alert.alert("Sukses", "Laporan berhasil disimpan ke basis data.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("PROSES GAGAL:", error);
      Alert.alert("Gagal", `Terjadi kesalahan:\n${error.message}`);
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
                isCategoryModalVisible && styles.dropdownSelectorActive,
              ]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  { color: currentTheme.textSecondary },
                  category ? { color: currentTheme.textMain } : null,
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
                    isBuildingModalVisible && styles.dropdownSelectorActive,
                  ]}
                  onPress={() => setBuildingModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      { color: currentTheme.textSecondary },
                      building ? { color: currentTheme.textMain } : null,
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
                    },
                    isFloorModalVisible && styles.dropdownSelectorActive,
                    !building && { opacity: 0.5 },
                  ]}
                  disabled={!building}
                  onPress={() => setFloorModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      { color: currentTheme.textSecondary },
                      floor ? { color: currentTheme.textMain } : null,
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
                { backgroundColor: currentTheme.cardBackground },
                (!building || !floor) && {
                  borderColor: currentTheme.border,
                  opacity: 0.6,
                },
              ]}
              disabled={!building || !floor}
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
                  !building || !floor
                    ? { color: currentTheme.textSecondary }
                    : null,
                ]}
              >
                Tandai di Peta...
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  building && floor
                    ? Colors.primary
                    : currentTheme.textSecondary
                }
              />
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
          }}
          onClose={() => setFloorModalVisible(false)}
        />
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
  dropdownSelectorActive: { borderColor: Colors.primary },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 55,
  },
  mapButtonText: { fontSize: 16, color: Colors.primary, fontWeight: "500" },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
