<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { VForm } from "vuetify/components";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";

const props = defineProps<{
  modelValue: boolean;
  isNewMode: boolean;
  editData?: any;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);
const toast = useToast();
const authStore = useAuthStore();
const formRef = ref<VForm | null>(null);
const isSaving = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

// --- STATE FORM ---
const formData = ref({
  Kategori: "GARMEN", // Default (G)
  Kode: "",
  Nama: "",
  Satuan: "",
  Supplier: "",
  Harga: 0,
  Buffer: 0,
  Aktif: "Y",
});

// --- OPSI DROPDOWN ---
const satuanOptions = ref<string[]>([]);
const supplierOptions = ref<string[]>([]);

// --- HAK AKSES FIELD (Migrasi dari zLihatBeli dan zBagian Gudang) ---
const canEditKtg = computed(() => props.isNewMode); // Kategori hanya bisa diubah saat Baru
const canViewFinance = computed(() => {
  // Misal: Jika bukan Gudang/Produksi, maka bisa lihat Harga & Supplier
  const b = authStore.user?.bagian || "";
  return !["GUDANG", "PRODUKSI", "POTONG", "JAHIT"].includes(b);
});

const loadOptions = async () => {
  try {
    const [resSatuan, resSup] = await Promise.all([
      api.get("/master/obat/lookups/satuan"),
      api.get("/master/obat/lookups/supplier"),
    ]);
    satuanOptions.value = resSatuan.data.data.map((i: any) => i.Nama);
    supplierOptions.value = resSup.data.data.map((i: any) => i.Nama);
  } catch (e) {
    toast.error("Gagal memuat opsi dropdown");
  }
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      await loadOptions();

      if (props.isNewMode) {
        formData.value = {
          Kategori: "GARMEN",
          Kode: "",
          Nama: "",
          Satuan: satuanOptions.value[0] || "JERIGEN", // Default delphi
          Supplier: "",
          Harga: 0,
          Buffer: 0,
          Aktif: "Y",
        };
      } else {
        const ed = props.editData;
        // Tentukan Kategori dari huruf depan Kode
        let ktg = "DTF";
        if (ed.Kode.startsWith("G")) ktg = "GARMEN";
        else if (ed.Kode.startsWith("M")) ktg = "MMT";

        formData.value = {
          Kategori: ktg,
          Kode: ed.Kode,
          Nama: ed.Nama,
          Satuan: ed.Satuan,
          Supplier: ed.Supplier,
          Harga: Number(ed.Harga) || 0,
          Buffer: Number(ed.Buffer) || 0,
          Aktif: ed.Aktif,
        };
      }
      formRef.value?.resetValidation();
    }
  },
);

const handleSave = async () => {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;

  isSaving.value = true;
  try {
    if (props.isNewMode) {
      const res = await api.post("/master/obat", formData.value);
      toast.success(`Berhasil menyimpan Obat dengan kode ${res.data.kode}`);
    } else {
      await api.put(`/master/obat/${formData.value.Kode}`, formData.value);
      toast.success("Berhasil memperbarui Master Obat");
    }
    dialogVisible.value = false;
    emit("saved");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="600px">
    <v-card class="dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <v-icon start color="white" size="small">mdi-flask-outline</v-icon>
        <span class="text-subtitle-2 font-weight-bold">
          {{ isNewMode ? "TAMBAH" : "UBAH" }} MASTER OBAT
        </span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="dialogVisible = false"
        ></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.Kode"
                label="Kode"
                variant="outlined"
                density="compact"
                readonly
                bg-color="grey-lighten-4"
                :placeholder="isNewMode ? '<- Kosong = Baru' : ''"
                hide-details="auto"
                class="mb-2"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="8">
              <v-radio-group
                v-model="formData.Kategori"
                inline
                density="compact"
                hide-details
                class="border pa-1 rounded"
                :disabled="!canEditKtg"
              >
                <v-radio
                  label="(G) Cetak Garmen"
                  value="GARMEN"
                  color="primary"
                ></v-radio>
                <v-radio
                  label="(M) Cetak MMT"
                  value="MMT"
                  color="primary"
                ></v-radio>
                <v-radio
                  label="(D) DTF dan DTG"
                  value="DTF"
                  color="primary"
                ></v-radio>
              </v-radio-group>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.Nama"
                label="Nama Obat"
                variant="outlined"
                density="compact"
                :rules="[(v) => !!v || 'Nama wajib diisi']"
                autofocus
                hide-details="auto"
                class="mb-2"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="4">
              <v-combobox
                v-model="formData.Satuan"
                :items="satuanOptions"
                label="Satuan"
                variant="outlined"
                density="compact"
                :rules="[(v) => !!v || 'Satuan wajib diisi']"
                hide-details="auto"
              ></v-combobox>
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.Buffer"
                label="Buffer Stok"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="4">
              <v-radio-group
                v-model="formData.Aktif"
                inline
                label="Status"
                density="compact"
                hide-details
              >
                <v-radio label="Aktif" value="Y" color="primary"></v-radio>
                <v-radio label="Pasif" value="N" color="error"></v-radio>
              </v-radio-group>
            </v-col>

            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>

            <template v-if="canViewFinance">
              <v-col cols="12" md="8">
                <v-combobox
                  v-model="formData.Supplier"
                  :items="supplierOptions"
                  label="Supplier"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="formData.Harga"
                  label="Harga / KG"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
            </template>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3 bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="dialogVisible = false"
          :disabled="isSaving"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="handleSave"
          class="px-6"
        >
          Simpan (F10)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card :deep(*) {
  font-size: 11px !important;
}
</style>
