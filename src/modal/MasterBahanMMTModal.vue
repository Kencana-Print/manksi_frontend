<!-- <template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 80vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold"
          >🔍 Pencarian Master Bahan MMT (WH-16)</v-toolbar-title
        >
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          @click="emit('close')"
          variant="text"
          size="small"
        ></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-text-field
          v-model="searchKeyword"
          label="Cari Kode atau Nama Bahan..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchBahanData"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="filteredBahan"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Kode"
          fixed-header
          :items-per-page="15"
        >
          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectBahan(item as MasterBahan)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Tidak ada data bahan ditemukan.</div>
          </template>

          <template #loading>
            <v-progress-linear
              indeterminate
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="d-flex justify-end">
        <v-btn @click="emit('close')" color="secondary" variant="flat"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, onMounted } from "vue";
import axios, { AxiosError } from "axios";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface MasterBahan {
  Kode: string;
  Nama: string; // Asumsi dari data Anda
  Satuan: string;
  Panjang: number; // Tambahan dari data Penerimaan Bahan
  Lebar: number; // Tambahan dari data Penerimaan Bahan
  // Tambahkan field lain yang dibutuhkan parent, seperti Harga, HPP, dll.
  [key: string]: string | number | undefined;
}

interface ApiResponse {
  message: string;
  data: MasterBahan[];
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  // Mengirim seluruh objek MasterBahan karena parent butuh Satuan, Pjg, Lbr
  (e: "select", bahan: MasterBahan): void;
}>();

const toast = useToast();

// --- State ---
const API_URL = "api/master/bahan/mmt";
const poList = ref<MasterBahan[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

// --- Konfigurasi Header v-data-table ---
const headers = [
  { title: "Kode", key: "Kode", width: "150px" },
  { title: "Nama Bahan", key: "Nama", width: "350px" },
  { title: "Satuan", key: "Satuan", width: "100px" },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "100px",
    align: "center" as const,
  },
];

// --- API & Logic ---

const fetchBahanData = async () => {
  loading.value = true;
  try {
    // Memanggil endpoint GET /api/master/bahan/mmt?q=keyword
    const response = await axios.get<ApiResponse>(API_URL, {
      params: { q: searchKeyword.value },
    });

    // Asumsi data berada di response.data.data
    poList.value = response.data.data || [];
  } catch (error) {
    const err = error as AxiosError;
    toast.error(
      err.response?.data?.message || "Gagal memuat daftar Master Bahan.",
    );
    poList.value = [];
  } finally {
    loading.value = false;
  }
};

const selectBahan = (bahan: MasterBahan) => {
  emit("select", bahan); // Mengirim seluruh objek bahan
  emit("close");
};

// --- Watchers & Lifecycle ---

// Muat data awal saat modal terlihat
watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      searchKeyword.value = "";
      fetchBahanData();
    } else {
      poList.value = [];
    }
  },
  { immediate: true },
);

// Lakukan filtering di sisi klien jika Anda telah memuat semua data awal (atau panggil API jika ingin server-side filtering)
const filteredBahan = poList; // Jika server-side filtering, ini sama dengan poList

onMounted(() => {
  // Dipanggil saat komponen mount, tetapi data hanya dimuat saat isVisible = true
});
</script>

<style scoped>
/* Styling disesuaikan dengan Vuetify 3 */
.dialog-card {
  font-size: 13px;
}
.desktop-table {
  font-size: 12px;
}
.desktop-table :deep(td),
.desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 35px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold;
  color: #333 !important;
}
.flex-grow-1 {
  height: 100%;
}
</style> -->
