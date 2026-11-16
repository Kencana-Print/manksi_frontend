<template>
  <BaseForm
    title="Rekap & Bundling LHK Finishing"
    menu-id="5511"
    :icon="IconPackageImport"
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
      <!-- Tombol Terbitkan LHK -->
      <v-btn
        size="small"
        color="success"
        variant="elevated"
        class="mr-2"
        :loading="isSaving"
        :disabled="selectedItems.length === 0 || !formData.gdg_kode"
        @click="validateBeforeFinalize"
      >
        <v-icon start size="16">mdi-check-decagram</v-icon>
        Terbitkan Nomor LHK
      </v-btn>

      <!-- Tombol Batal -->
      <v-btn
        size="small"
        variant="outlined"
        class="mr-2"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>

      <!-- Tombol Tutup -->
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

    <!-- KOLOM KIRI (PARAMETER LHK FINAL & SUMMARY) -->
    <template #left-column>
      <div class="desktop-form-section header-section pa-3">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          PARAMETER LHK FINAL
        </div>

        <v-text-field
          label="Tanggal LHK"
          v-model="formData.tanggal"
          type="date"
          density="compact"
          variant="outlined"
          class="mb-2"
          hide-details
          @change="fetchUnassigned"
        />

        <v-select
          label="Shift LHK"
          v-model="formData.shift"
          :items="[1, 2, 3]"
          density="compact"
          variant="outlined"
          class="mb-2"
          hide-details
          @update:model-value="fetchUnassigned"
        />

        <v-select
          label="Filter Jenis Proses"
          v-model="formData.proses"
          :items="listProses"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          class="mb-2"
          hide-details
          clearable
          placeholder="Semua Proses"
          @update:model-value="fetchUnassigned"
        />

        <v-text-field
          label="Gudang Produksi"
          v-model="formData.gdg_nama"
          readonly
          density="compact"
          variant="outlined"
          class="mb-3 cursor-pointer"
          hide-details
          color="primary"
          @click="isGudangModalVisible = true"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              style="cursor: pointer"
              @click="isGudangModalVisible = true"
            />
          </template>
        </v-text-field>

        <v-divider class="my-3" />

        <!-- INFORMASI USER -->
        <div class="bg-grey-lighten-4 pa-2 rounded mb-3 text-caption">
          Pembuat Rekap: <strong>{{ currentUser }}</strong>
        </div>

        <!-- SUMMARY MATERIAL TERPILIH -->
        <div v-if="selectedItems.length > 0">
          <div class="text-caption font-weight-bold mb-2 text-grey-darken-3">
            Total Material Terpilih:
          </div>

          <v-card
            variant="tonal"
            color="teal"
            class="pa-2 mb-2"
            v-if="totalMataAyam > 0"
          >
            <div class="d-flex justify-space-between align-center text-caption">
              <span>Total Mata Ayam:</span>
              <span class="font-weight-bold text-body-2"
                >{{ totalMataAyam }} pcs</span
              >
            </div>
          </v-card>

          <v-card
            variant="tonal"
            color="purple"
            class="pa-2 mb-2"
            v-if="totalKoli > 0"
          >
            <div class="d-flex justify-space-between align-center text-caption">
              <span>Total Koli / Karung:</span>
              <span class="font-weight-bold text-body-2"
                >{{ totalKoli }} Pcs</span
              >
            </div>
          </v-card>

          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="text-caption mt-2"
          >
            {{ selectedItems.length }} baris pekerjaan siap dibundel.
          </v-alert>
        </div>
      </div>
    </template>

    <!-- KOLOM KANAN (TABEL DAFTAR PEKERJAAN PRA-LHK) -->
    <template #right-column>
      <div class="d-flex flex-column fill-height pa-1">
        <v-card border flat class="d-flex flex-column table-card">
          <!-- BAR HEADER TABEL -->
          <div class="pa-2 bg-blue-grey-lighten-5 d-flex align-center">
            <span
              class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4"
            >
              Daftar Pekerjaan Pra-LHK (Belum Dibundel)
            </span>
            <v-spacer />
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              :loading="isLoading"
              @click="fetchUnassigned"
            >
              <template #prepend>
                <IconRefresh :size="14" />
              </template>
              Refresh Data
            </v-btn>
          </div>

          <!-- TABEL UNASSIGNED DATA -->
          <div class="table-container flex-grow-1">
            <v-data-table
              v-model="selectedItems"
              :headers="dynamicHeaders"
              :items="unassignedData"
              :loading="isLoading"
              show-select
              select-strategy="page"
              item-value="id"
              density="compact"
              fixed-header
              class="elevation-0"
            >
              <!-- CUSTOM CHIP BAHAN -->
              <template #[`item.bahan_kode`]="{ item }">
                <v-chip
                  size="small"
                  label
                  variant="outlined"
                  @click="openBahanSearch(item)"
                  class="cursor-pointer font-weight-bold"
                  :color="item.bahan_kode ? 'primary' : 'error'"
                >
                  <IconSearch :size="12" class="mr-1" />
                  {{ item.bahan_kode || "Pilih Bahan" }}
                </v-chip>
              </template>

              <!-- INPUT QTY HASIL -->
              <template #[`item.qty_hasil`]="{ item }">
                <v-text-field
                  v-model.number="item.qty_hasil"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  @input="calculateOtomatisBahan(item)"
                  class="font-weight-bold custom-input-end"
                  @wheel="($event.target as HTMLInputElement)?.blur()"
                />
              </template>

              <!-- INPUT QTY BS -->
              <template #[`item.qty_bs`]="{ item }">
                <v-text-field
                  v-model.number="item.qty_bs"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  placeholder="0"
                  class="font-weight-bold text-error custom-input-end"
                  @wheel="($event.target as HTMLInputElement)?.blur()"
                />
              </template>

              <!-- PROSES MATA AYAM -->
              <template #[`item.pengali_ma`]="{ item }">
                <v-text-field
                  v-model.number="item.pengali_ma"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="custom-input-center"
                  @input="calculateOtomatisBahan(item)"
                />
              </template>

              <template #[`item.jml_mata_ayam`]="{ item }">
                <div class="text-end font-weight-bold text-success">
                  {{ item.jml_mata_ayam }}
                </div>
              </template>

              <!-- PROSES KOLI -->
              <template #[`item.pengali_koli`]="{ item }">
                <v-text-field
                  v-model.number="item.pengali_koli"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="custom-input-center"
                  @input="calculateOtomatisBahan(item)"
                />
              </template>

              <template #[`item.jml_koli`]="{ item }">
                <div class="text-end font-weight-bold text-purple">
                  {{ item.jml_koli }}
                </div>
              </template>

              <!-- CHIP KATEGORI PROSES -->
              <template #[`item.proses_kategori`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="getProsesColor(item.proses_kategori)"
                  variant="flat"
                  class="font-weight-bold text-white"
                >
                  {{ item.proses_kategori }}
                </v-chip>
              </template>

              <template #no-data>
                <div class="pa-8 text-center text-grey">
                  Tidak ada data pekerjaan Pra-LHK yang tersedia untuk
                  tanggal/shift ini.
                </div>
              </template>
            </v-data-table>
          </div>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP GUDANG & BAHAN -->
  <GudangLookupModal
    :isVisible="isGudangModalVisible"
    @close="isGudangModalVisible = false"
    @select="handleGudangSelect"
  />
  <MasterBahanModal
    :isVisible="isBahanModalVisible"
    @close="isBahanModalVisible = false"
    @select="handleBahanSelect"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { format } from "date-fns";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import { useAuthStore } from "@/stores/authStore";
import GudangLookupModal from "@/modal/GudangLookupView.vue";
import MasterBahanModal from "@/modal/MasterBahanModal.vue";

import {
  IconPackageImport,
  IconSearch,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();

const isGudangModalVisible = ref(false);
const isBahanModalVisible = ref(false);
const activeRowId = ref<number | null>(null);

const unassignedData = ref<any[]>([]);
const selectedItems = ref<number[]>([]);

// --- 1. DAFTAR PROSES FINISHING (TERMASUK JAHIT) ---
const listProses = [
  { title: "POTONG", value: "POTONG" },
  { title: "JAHIT", value: "JAHIT" }, // <-- Ditambahkan
  { title: "SEAMING", value: "SEAMING" },
  { title: "MATA AYAM", value: "MATA_AYAM" },
  { title: "KOLI", value: "KOLI" },
  { title: "PACKING", value: "PACKING" },
  { title: "X-BANNER", value: "X_BANNER" },
  { title: "ROLL UP BANNER", value: "ROLLUP_BANNER" },
];

// --- 2. INITIAL DATA ---
const initialData = {
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: 1,
  proses: null as string | null,
  gdg_kode: "GPM",
  gdg_nama: "Gudang Produksi MMT",
};

// --- 3. INTEGRASI COMPOSABLE USEFORM ---
const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "130",
  initialData,
  submitApi: async () => {
    const selectedDetails = unassignedData.value
      .filter((item) => selectedItems.value.includes(item.id))
      .map((item) => ({
        id: item.id,
        ids: item.ids || String(item.id),
        spk_nomor: item.spk_nomor,
        proses_kategori: item.proses_kategori,
        qty_hasil: item.qty_hasil,
        qty_bs: item.qty_bs || 0,
        jml_mata_ayam: item.jml_mata_ayam,
        jml_koli: item.jml_koli,
        pengali_ma: item.pengali_ma,
        pengali_koli: item.pengali_koli,
        material_kode: item.bahan_kode,
      }));

    const payload = {
      headerData: {
        lfh_nomor: "AUTO",
        lfh_tanggal: formData.value.tanggal,
        lfh_shift: formData.value.shift,
        lfh_gdg_prod: formData.value.gdg_kode,
        lfh_user_create: currentUser.value,
        lfh_total_ma: totalMataAyam.value,
        lfh_total_koli: totalKoli.value,
      },
      details: selectedDetails,
    };

    const res = await api.post("/mmt/lhk-finishing/finalize", payload);
    if (res.data.success) {
      toast.success(`LHK Berhasil diterbitkan: ${res.data.nomor || "Sukses"}`);
      fetchUnassigned();
    }
    return res;
  },
});

// User login dari authStore
const currentUser = computed(
  () => authStore.user?.kdUser || authStore.user?.kd_user || "SYSTEM",
);

// --- 4. FETCH DATA PRA-LHK (UNASSIGNED) ---
const fetchUnassigned = async () => {
  isLoading.value = true;
  selectedItems.value = [];
  try {
    const res = await api.get("/mmt/lhk-finishing/pra/unassigned", {
      params: {
        tanggal: formData.value.tanggal,
        shift: formData.value.shift,
        proses: formData.value.proses,
      },
    });

    unassignedData.value = (res.data.data || []).map((d: any) => {
      let defaultBahan = d.bahan_kode || null;
      if (d.proses_kategori === "MATA_AYAM") defaultBahan = "Ma_v24";
      else if (d.proses_kategori === "KOLI") defaultBahan = "KR_KCL";

      const row = {
        ...d,
        qty_hasil: d.qty_hasil || 0,
        pengali_ma: d.pengali_ma || 4,
        pengali_koli: d.pengali_koli || 50,
        bahan_kode: defaultBahan,
        jml_mata_ayam: d.jml_mata_ayam || 0,
        jml_koli: d.jml_koli || 0,
      };
      calculateOtomatisBahan(row);
      return row;
    });
  } catch (e: any) {
    toast.error("Gagal mengambil data Pra-LHK");
  } finally {
    isLoading.value = false;
  }
};

// --- 5. CALCULATION LOGIC ---
const calculateOtomatisBahan = (item: any) => {
  if (
    formData.value.proses === "MATA_AYAM" ||
    item.proses_kategori === "MATA_AYAM"
  ) {
    const pengali = item.pengali_ma || 0;
    item.jml_mata_ayam = (item.qty_hasil || 0) * pengali;
  }

  if (formData.value.proses === "KOLI" || item.proses_kategori === "KOLI") {
    const isiPerKoli = item.pengali_koli || 1;
    item.jml_koli = Math.ceil((item.qty_hasil || 0) / isiPerKoli);
  }
};

// --- 6. DYNAMIC HEADERS ---
const dynamicHeaders = computed(() => {
  const base: any[] = [
    { title: "No. SPK", key: "spk_nomor", width: "130px" },
    { title: "Produk", key: "spk_nama" },
    { title: "Hasil (Pcs)", key: "qty_hasil", align: "end", width: "110px" },
    { title: "BS (Pcs)", key: "qty_bs", align: "end", width: "100px" },
  ];

  if (
    formData.value.proses === "MATA_AYAM" ||
    formData.value.proses === "KOLI"
  ) {
    base.push({ title: "Bahan", key: "bahan_kode", width: "140px" });
  }

  if (formData.value.proses === "MATA_AYAM") {
    base.push(
      { title: "MA / Pcs", key: "pengali_ma", width: "100px", align: "center" },
      { title: "Total MA", key: "jml_mata_ayam", width: "120px", align: "end" },
    );
  }

  if (formData.value.proses === "KOLI") {
    base.push(
      {
        title: "Isi / Koli",
        key: "pengali_koli",
        width: "100px",
        align: "center",
      },
      { title: "Total Koli", key: "jml_koli", width: "110px", align: "end" },
    );
  }

  if (!formData.value.proses) {
    base.unshift({ title: "Proses", key: "proses_kategori", width: "110px" });
  }

  return base;
});

// --- 7. COMPUTED SUMMARIES ---
const totalMataAyam = computed(() => {
  return unassignedData.value
    .filter((item) => selectedItems.value.includes(item.id))
    .reduce((sum, item) => sum + (Number(item.jml_mata_ayam) || 0), 0);
});

const totalKoli = computed(() => {
  return unassignedData.value
    .filter((item) => selectedItems.value.includes(item.id))
    .reduce((sum, item) => sum + (Number(item.jml_koli) || 0), 0);
});

// --- 8. HANDLERS & MODALS ---
const openBahanSearch = (item: any) => {
  activeRowId.value = item.id;
  isBahanModalVisible.value = true;
};

const handleBahanSelect = (bahan: any) => {
  const index = unassignedData.value.findIndex(
    (row) => row.id === activeRowId.value,
  );
  if (index !== -1) {
    unassignedData.value[index].bahan_kode = bahan.Kode || bahan.kode_barang;
    toast.info(`Bahan diperbarui: ${unassignedData.value[index].bahan_kode}`);
  }
  isBahanModalVisible.value = false;
  activeRowId.value = null;
};

const handleGudangSelect = (g: any) => {
  formData.value.gdg_kode = g.Kode || g.kode;
  formData.value.gdg_nama = g.Nama || g.nama;
  isGudangModalVisible.value = false;
};

const validateBeforeFinalize = () => {
  if (selectedItems.value.length === 0) {
    return toast.error("Pilih minimal satu pekerjaan untuk dibundel!");
  }
  if (!formData.value.gdg_kode) {
    return toast.error("Silakan pilih Gudang Produksi terlebih dahulu!");
  }
  showSaveDialog.value = true;
};

const getProsesColor = (proses: string) => {
  const colors: Record<string, string> = {
    POTONG: "orange",
    JAHIT: "pink",
    SEAMING: "blue",
    MATA_AYAM: "teal",
    KOLI: "purple",
    PACKING: "green",
    X_BANNER: "indigo",
    ROLLUP_BANNER: "deep-purple",
  };
  return colors[proses] || "grey";
};

onMounted(() => {
  fetchUnassigned();
});
</script>

<style scoped>
.table-container {
  overflow-y: auto;
  max-height: calc(100vh - 250px);
}
.cursor-pointer {
  cursor: pointer;
}
.custom-input-center :deep(input) {
  text-align: center;
  font-weight: 500;
}
.custom-input-end :deep(input) {
  text-align: right;
}
</style>
