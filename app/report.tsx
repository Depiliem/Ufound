import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
      if (i !== 4 && i !== 13) {
        availableFloors.push(`Lantai ${i}`);
      }
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
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    // Validasi input
    if (!itemName || !category || !building || !floor) {
      alert("Mohon lengkapi semua field yang diwajibkan."); // Menggunakan alert() standar web sebagai fallback
      return;
    }

    setIsLoading(true); // Ubah status tombol menjadi loading
    console.log("1. Memulai proses submit...");

    try {
      let finalImageUrl = null;

      // Proses upload gambar jika ada
      if (imageUri) {
        console.log("2. Memproses gambar...");
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileName = `public/${Date.now()}.jpg`;

        console.log("3. Mengunggah gambar ke Supabase Storage...");
        const { data, error } = await supabase.storage
          .from("item-images")
          .upload(fileName, blob);

        if (error) {
          console.error("Error Storage:", error);
          throw new Error(`Gagal unggah foto: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
        console.log("4. URL Gambar didapatkan:", finalImageUrl);
      }

      console.log("5. Menyimpan data ke tabel PostgreSQL...");
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

      if (insertError) {
        console.error("Error Database:", insertError);
        throw new Error(`Gagal simpan data: ${insertError.message}`);
      }

      console.log("6. Berhasil!");
      alert("Laporan berhasil disimpan ke basis data!"); // Fallback alert
      router.back();
    } catch (error: any) {
      console.error("PROSES GAGAL:", error);
      alert(`Terjadi kesalahan:\n${error.message}`);
    } finally {
      setIsLoading(false); // Kembalikan tombol ke keadaan semula
    }
  };

  const DropdownModal = ({
    visible,
    data,
    selectedValue,
    onSelect,
    onClose,
  }: {
    visible: boolean;
    data: string[];
    selectedValue: string;
    onSelect: (item: string) => void;
    onClose: () => void;
  }) => (
    <Modal visible={visible} transparent={true} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: "60%" }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {data.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      selectedValue === item && styles.dropdownItemSelected,
                      index === data.length - 1 && styles.dropdownItemLast,
                    ]}
                    onPress={() => onSelect(item)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedValue === item &&
                          styles.dropdownItemTextSelected,
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
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.toggleContainer}>
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
                reportType === "found" && styles.toggleTextActive,
              ]}
            >
              I Found an Item
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nama Barang</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Kunci Motor, Dompet Hitam"
            placeholderTextColor={Colors.textMuted}
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategori</Text>
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              isCategoryModalVisible && styles.dropdownSelectorActive,
            ]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                category ? { color: Colors.textMain } : null,
              ]}
            >
              {category || "Pilih Kategori..."}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lokasi Terakhir / Ditemukan</Text>

          <View style={styles.locationRow}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  isBuildingModalVisible && styles.dropdownSelectorActive,
                ]}
                onPress={() => setBuildingModalVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    building ? { color: Colors.textMain } : null,
                  ]}
                >
                  {building || "Gedung..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, marginLeft: 5 }}>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  isFloorModalVisible && styles.dropdownSelectorActive,
                  !building && styles.dropdownSelectorDisabled,
                ]}
                disabled={!building}
                onPress={() => setFloorModalVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    floor ? { color: Colors.textMain } : null,
                  ]}
                >
                  {floor || "Lantai..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.mapButtonFull,
              (!building || !floor) && styles.mapButtonDisabled,
            ]}
            disabled={!building || !floor}
            onPress={() => {
              console.log(`Buka peta untuk ${building} - ${floor}`);
            }}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={
                building && floor ? Colors.primary : Colors.iconPlaceholder
              }
              style={{ marginRight: 10 }}
            />
            <Text
              style={[
                styles.mapButtonText,
                !building || !floor ? { color: Colors.textMuted } : null,
              ]}
            >
              Tandai di Peta...
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                building && floor ? Colors.primary : Colors.iconPlaceholder
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deskripsi Tambahan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ciri-ciri khusus, jam kejadian, isi barang, dll."
            placeholderTextColor={Colors.textMuted}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unggah Foto (Opsional)</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={Colors.iconPlaceholder}
                />
                <Text style={styles.uploadText}>
                  Ketuk untuk memilih foto dari galeri
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading} // Tombol tidak bisa di-spam klik saat loading
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
        onSelect={(item) => {
          setCategory(item);
          setCategoryModalVisible(false);
        }}
        onClose={() => setCategoryModalVisible(false)}
      />
      <DropdownModal
        visible={isBuildingModalVisible}
        data={buildings}
        selectedValue={building}
        onSelect={(item) => {
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
        onSelect={(item) => {
          setFloor(item);
          setFloorModalVisible(false);
        }}
        onClose={() => setFloorModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 4,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primaryText,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.textMain,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textMain,
  },
  textArea: {
    minHeight: 100,
  },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 55,
  },
  dropdownSelectorActive: {
    borderColor: Colors.primary,
  },
  dropdownSelectorDisabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textSecondary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.chipActive,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textMain,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mapButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 55,
  },
  mapButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    opacity: 0.6,
  },
  mapButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "500",
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: Colors.primaryText,
    fontSize: 18,
    fontWeight: "bold",
  },
});
