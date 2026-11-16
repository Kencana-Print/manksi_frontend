<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' Input Kerja Finishing (Pra-LHK)'"
    menu-id="5511"
    :icon="IconNeedle"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- HEADER ACTIONS SLOT -->
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2"
        :loading="isSaving"
        :disabled="formData.details.length === 0"
        @click="showSaveDialog = true"
      >
        <v-icon start size="16">mdi-content-save-edit-outline</v-icon>
        Simpan Pra-LHK
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        class="mr-2"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>

      <v-btn
        size="small"
        variant="tonal"
        color="error"
        @click="showCloseDialog = true"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconX :size="15" :stroke-width="2" />
          </span>
        </template>
        Tutup
      </v-btn>
    </template>

    <!-- KOLOM KIRI (INFORMASI UTAMA & PROSES) -->
    <template #left-column>
      <div class="desktop-form-section header-section pa-3">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          INFORMASI UTAMA PRA-LHK
        </div>

        <v-select
          label="Jenis Proses Finishing"
          v-model="formData.proses"
          :items="daftarProses"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
          color="primary"
        />

        <v-text-field
          label="Tanggal Kerja"
          v-model="formData.tanggal"
          type="date"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
        />

        <v-text-field
          label="Shift"
          v-model.number="formData.shift"
          type="number"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
        />

        <v-divider class="my-3" />

        <div class="bg-grey-lighten-4 pa-3 rounded">
          <div class="text-caption font-weight-bold mb-1 text-grey-darken-3">
            Informasi Operator:
          </div>
          <div class="text-body-2 text-grey-darken-2">
            Operator: <strong>{{ currentUser }}</strong
            ><br />
            Data tersimpan di tabel <strong>Pra-LHK</strong> sebelum dibundel
            admin.
          </div>
        </div>
      </div>
    </template>

    <!-- KOLOM KANAN (TABEL RINCIAN WORK ORDER / SPK) -->
    <template #right-column>
      <div class="d-flex flex-column fill-height pa-1">
        <v-card border flat class="d-flex flex-column table-card">
          <!-- BAR HEADER TABEL -->
          <div
            class="pa-2 bg-blue-grey-lighten-5 d-flex align-center flex-wrap gap-2"
          >
            <span
              class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4"
            >
              Rincian Pekerjaan - {{ formData.proses }}
            </span>
            <v-spacer />

            <!-- SCAN BARCODE SPK -->
            <v-text-field
              v-model="barcodeInput"
              placeholder="Scan Barcode SPK... (ex: 10*SPK)"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 260px"
              class="bg-white"
              :loading="isScanning"
              @keyup.enter="handleBarcodeScan"
            >
              <template #prepend-inner>
                <IconBarcode :size="16" class="text-grey" />
              </template>
            </v-text-field>

            <!-- TOMBOL TARIK POTONG -->
            <v-btn
              v-if="formData.proses !== 'POTONG'"
              color="orange-darken-2"
              size="small"
              variant="tonal"
              class="ml-1"
              :loading="isFetchingPotong"
              @click="fetchPendingPotong"
            >
              <template #prepend>
                <IconRefresh :size="14" />
              </template>
              Tarik Potong
            </v-btn>

            <!-- TOMBOL CARI SPK -->
            <v-btn
              color="primary"
              size="small"
              variant="elevated"
              class="ml-1"
              @click="isSpkModalVisible = true"
            >
              <template #prepend>
                <IconSearch :size="14" />
              </template>
              Pilih SPK
            </v-btn>
          </div>

          <!-- TABEL RINCIAN SPK -->
          <div class="table-container flex-grow-1">
            <v-data-table
              :headers="dynamicHeaders"
              :items="formData.details"
              density="compact"
              no-data-text="Belum ada SPK yang dipilih"
              class="elevation-0"
            >
              <!-- CUSTOM UKURAN (P x L) -->
              <template #[`item.ukuran`]="{ item }">
                <span class="text-caption font-weight-medium">
                  {{ Number(item.panjang || 0).toFixed(2) }} x
                  {{ Number(item.lebar || 0).toFixed(2) }} M
                </span>
              </template>

              <!-- CUSTOM INPUT HASIL -->
              <template #[`item.qty_hasil`]="{ item }">
                <div
                  :class="
                    item.qty_hasil > item.qty_order
                      ? 'bg-red-lighten-5 px-1 rounded error-qty-border'
                      : ''
                  "
                >
                  <v-text-field
                    v-model.number="item.qty_hasil"
                    type="number"
                    density="compact"
                    variant="underlined"
                    hide-details
                    :class="
                      item.qty_hasil > item.qty_order
                        ? 'text-red font-weight-black custom-input-qty'
                        : 'text-end custom-input-qty font-weight-bold'
                    "
                    @input="handleInputCalculation(item)"
                    @wheel="($event.target as HTMLInputElement)?.blur()"
                  />

                  <v-tooltip
                    v-if="item.qty_hasil > item.qty_order"
                    activator="parent"
                    location="top"
                  >
                    Melebihi kuantitas order SPK (Order: {{ item.qty_order }})
                  </v-tooltip>
                </div>
              </template>

              <!-- CUSTOM PROSES MATA AYAM -->
              <template #[`item.pengali_mata_ayam`]="{ item }">
                <v-text-field
                  v-model.number="item.pengali_mata_ayam"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  suffix="pcs"
                  class="text-center"
                  @input="handleInputCalculation(item)"
                />
              </template>
              <template #[`item.jml_mata_ayam`]="{ item }">
                <div class="text-end font-weight-bold text-success">
                  {{ item.jml_mata_ayam }}
                </div>
              </template>

              <!-- CUSTOM PROSES KOLI -->
              <template #[`item.pengali_koli`]="{ item }">
                <v-text-field
                  v-model.number="item.pengali_koli"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  suffix="pcs"
                  @input="handleInputCalculation(item)"
                />
              </template>
              <template #[`item.jml_koli`]="{ item }">
                <div class="text-end font-weight-bold text-purple">
                  {{ item.jml_koli }}
                </div>
              </template>

              <!-- AKSI HAPUS ROW -->
              <template #[`item.actions`]="{ index }">
                <v-btn
                  icon
                  size="x-small"
                  color="error"
                  variant="text"
                  @click="formData.details.splice(index, 1)"
                >
                  <IconTrash :size="15" />
                </v-btn>
              </template>
            </v-data-table>
          </div>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP SPK -->
  <SpkLookupModal
    :isVisible="isSpkModalVisible"
    @select="addFirstTimeSpk"
    @close="isSpkModalVisible = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { format } from "date-fns";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import { useAuthStore } from "@/stores/authStore";
import SpkLookupModal from "@/modal/SpkLookupModal.vue";

import {
  IconNeedle,
  IconSearch,
  IconTrash,
  IconBarcode,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const route = useRoute();
const authStore = useAuthStore();

const isScanning = ref(false);
const isSpkModalVisible = ref(false);
const isFetchingPotong = ref(false);
const barcodeInput = ref("");

// --- 1. DAFTAR PROSES FINISHING (TERMASUK JAHIT) ---
const daftarProses = [
  { title: "POTONG", value: "POTONG" },
  { title: "JAHIT", value: "JAHIT" }, // <-- Ditambahkan
  { title: "SEAMING", value: "SEAMING" },
  { title: "MATA AYAM", value: "MATA_AYAM" },
  { title: "KOLI", value: "KOLI" },
  { title: "X-BANNER", value: "X_BANNER" },
  { title: "ROLL UP BANNER", value: "ROLLUP_BANNER" },
];

// --- 2. INITIAL DATA FORM ---
const initialData = {
  proses: "POTONG",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: 1,
  details: [] as any[],
};

// --- 3. COMPOSABLE USEFORM INTEGRATION ---
const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
  fetchData,
} = useForm({
  menuId: "129",
  initialData,
  fetchApi: async () => {
    const idPra = route.params.id as string;
    const res = await api.get(`/mmt/lhk-finishing/pra/${idPra}`);
    const data = res.data.data;
    return {
      proses: data.proses_kategori || "POTONG",
      tanggal: format(new Date(data.tgl_input || new Date()), "yyyy-MM-dd"),
      shift: data.shift_input || 1,
      details: (data.details || []).map((d: any) => ({
        spk_nomor: d.spk_nomor,
        spk_nama: d.spk_nama,
        panjang: parseFloat(d.panjang || 0),
        lebar: parseFloat(d.lebar || 0),
        qty_order: parseInt(d.qty_order || 0),
        qty_hasil: parseInt(d.qty_hasil || 0),
        qty_bs: parseInt(d.qty_bs || 0),
        pengali_mata_ayam: parseInt(d.pengali_mata_ayam || 4),
        jml_mata_ayam: parseInt(d.jml_mata_ayam || 0),
        pengali_koli: parseInt(d.pengali_koli || 50),
        jml_koli: parseInt(d.jml_koli || 0),
      })),
    };
  },
  submitApi: async () => {
    const user = currentUser.value;
    const payload = {
      details: formData.value.details.map((item) => ({
        ...item,
        proses_kategori: formData.value.proses,
        tgl_input: formData.value.tanggal,
        shift_input: formData.value.shift,
        input_by: user,
        is_bundled: false,
      })),
    };
    return await api.post("/mmt/lhk-finishing/pra", payload);
  },
});

// User login dari authStore
const currentUser = computed(
  () => authStore.user?.kdUser || authStore.user?.kd_user || "SYSTEM",
);

// --- 4. CALCULATION LOGIC ---
const handleInputCalculation = (item: any) => {
  if (
    item.qty_hasil === "" ||
    item.qty_hasil === null ||
    item.qty_hasil === undefined
  ) {
    item.qty_hasil = 0;
  }

  if (item.qty_hasil > item.qty_order) {
    toast.warning(
      `SPK ${item.spk_nomor} input (${item.qty_hasil}) melebihi kuantitas order (${item.qty_order})`,
    );
  }

  // Hitung Mata Ayam
  item.jml_mata_ayam =
    formData.value.proses === "MATA_AYAM"
      ? (item.qty_hasil || 0) * (item.pengali_mata_ayam || 0)
      : 0;

  // Hitung Koli
  if (formData.value.proses === "KOLI" && item.pengali_koli > 0) {
    item.jml_koli = Math.ceil((item.qty_hasil || 0) / item.pengali_koli);
  } else {
    item.jml_koli = 0;
  }
};

// --- 5. DYNAMIC TABLE HEADERS (TERMASUK PROSES JAHIT) ---
const dynamicHeaders = computed(() => {
  const baseHeaders: any[] = [
    { title: "No SPK", key: "spk_nomor", width: "140px" },
    { title: "Nama Produk", key: "spk_nama" },
    { title: "Ukuran (P x L)", key: "ukuran", width: "130px" },
    { title: "Order", key: "qty_order", width: "80px", align: "end" },
    {
      title: `Hasil ${formData.value.proses}`,
      key: "qty_hasil",
      width: "120px",
      align: "end",
    },
  ];

  if (formData.value.proses === "MATA_AYAM") {
    baseHeaders.push(
      {
        title: "Mata/Pcs",
        key: "pengali_mata_ayam",
        width: "100px",
        align: "center",
      },
      { title: "Total MA", key: "jml_mata_ayam", width: "100px", align: "end" },
    );
  } else if (formData.value.proses === "KOLI") {
    baseHeaders.push(
      {
        title: "Isi/Koli",
        key: "pengali_koli",
        width: "100px",
        align: "center",
      },
      { title: "Jml Koli", key: "jml_koli", width: "100px", align: "end" },
    );
  }

  baseHeaders.push({
    title: "",
    key: "actions",
    width: "50px",
    sortable: false,
    align: "center",
  });

  return baseHeaders;
});

// --- 6. BARCODE & SPK LOGIC ---
const addFirstTimeSpk = (spk: any) => addSpkWithQty(spk, 0);

const addSpkWithQty = (spk: any, initialQty: number) => {
  const nomorSpk =
    spk.SPK || spk.Spk || spk.spk_nomor || spk.NoSpk || spk.No_Pesanan;
  const namaSpk = spk.Nama || spk.spk_nama || spk.NamaBarang || spk.Nama_Barang;
  const qtyOrder =
    spk.Jumlah || spk.Qty || spk.qty_order || spk.Jumlah_Order || 0;
  const p = spk.Panjang || spk.panjang || 0;
  const l = spk.Lebar || spk.lebar || 0;

  if (!nomorSpk) return toast.error("Data SPK tidak valid");

  const newItem = {
    spk_nomor: nomorSpk,
    spk_nama: namaSpk,
    panjang: p,
    lebar: l,
    qty_order: qtyOrder,
    qty_hasil: initialQty,
    qty_bs: 0,
    pengali_mata_ayam: 4,
    jml_mata_ayam: 0,
    pengali_koli: 50,
    jml_koli: 0,
  };

  handleInputCalculation(newItem);
  formData.value.details.push(newItem);
  isSpkModalVisible.value = false;
};

const handleBarcodeScan = async () => {
  if (!barcodeInput.value) return;
  isScanning.value = true;

  try {
    let quantityToAdd = 1;
    let finalBarcode = barcodeInput.value.trim();

    if (finalBarcode.includes("*")) {
      const parts = finalBarcode.split("*");
      if (parts.length === 2) {
        quantityToAdd = parseFloat(parts[0]) || 1;
        finalBarcode = parts[1].trim();
      }
    }

    const existingIndex = formData.value.details.findIndex(
      (d) => d.spk_nomor === finalBarcode,
    );

    if (existingIndex !== -1) {
      formData.value.details[existingIndex].qty_hasil += quantityToAdd;
      handleInputCalculation(formData.value.details[existingIndex]);

      if (
        formData.value.details[existingIndex].qty_hasil <=
        formData.value.details[existingIndex].qty_order
      ) {
        toast.info(`SPK ${finalBarcode} bertambah ${quantityToAdd}`);
      }
    } else {
      const response = await api.get(`/mmt/spk/${finalBarcode}`);
      let spkData = response.data?.data || response.data;
      if (Array.isArray(spkData)) spkData = spkData[0];

      if (spkData) {
        addSpkWithQty(spkData, quantityToAdd);
        const lastIdx = formData.value.details.length - 1;
        if (
          formData.value.details[lastIdx].qty_hasil >
          formData.value.details[lastIdx].qty_order
        ) {
          toast.warning(`SPK ${finalBarcode} yang dimasukkan melebihi order!`);
        }
      } else {
        toast.error("SPK tidak ditemukan");
      }
    }
  } catch (e) {
    toast.error("Gagal memproses barcode SPK");
  } finally {
    isScanning.value = false;
    barcodeInput.value = "";
  }
};

const fetchPendingPotong = async () => {
  isFetchingPotong.value = true;
  try {
    const res = await api.get("/mmt/lhk-finishing/pra/pending-potong", {
      params: { targetProses: formData.value.proses },
    });
    if (res.data.success && res.data.data.length > 0) {
      res.data.data.forEach((item: any) => {
        if (
          !formData.value.details.some((d) => d.spk_nomor === item.spk_nomor)
        ) {
          const newItem = {
            spk_nomor: item.spk_nomor,
            spk_nama: item.spk_nama,
            panjang: item.panjang || 0,
            lebar: item.lebar || 0,
            qty_order: item.qty_order || 0,
            qty_hasil: item.qty_hasil || 0,
            qty_bs: 0,
            pengali_mata_ayam: 4,
            jml_mata_ayam: 0,
            pengali_koli: 50,
            jml_koli: 0,
          };
          handleInputCalculation(newItem);
          formData.value.details.push(newItem);
        }
      });
      toast.success(`${res.data.data.length} data berhasil ditarik.`);
    } else {
      toast.info("Tidak ada pending potong untuk proses ini.");
    }
  } catch (e) {
    toast.error("Gagal menarik data pending potong");
  } finally {
    isFetchingPotong.value = false;
  }
};

// Pemicu ulang kalkulasi saat proses diubah
watch(
  () => formData.value.proses,
  () => {
    formData.value.details.forEach((d) => handleInputCalculation(d));
  },
);

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
  }
});
</script>

<style scoped>
.table-container {
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}
.custom-input-qty :deep(input) {
  font-weight: bold;
  color: #1976d2 !important;
}
.error-qty-border {
  border: 1px solid #ff5252;
}
</style>
