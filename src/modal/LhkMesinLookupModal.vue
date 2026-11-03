<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="1400px"
    width="95vw"
    persistent
  >
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1">
          🔍 Pilih LHK Mesin (Produksi)
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          v-if="selectedItems.length > 0"
          color="white"
          variant="elevated"
          size="small"
          class="text-primary mr-2 font-weight-bold"
          @click="submitSelection"
        >
          Ambil ({{ selectedItems.length }})
        </v-btn>
        <v-btn icon="mdi-close" @click="emit('close')" variant="text"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-row dense class="mb-2 align-center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="filters.date"
              label="Pilih Tanggal"
              type="date"
              density="compact"
              variant="outlined"
              hide-details
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="5">
            <v-select
              v-model="filters.shift"
              :items="['1', '2', '3']"
              label="Pilih Shift"
              density="compact"
              variant="outlined"
              hide-details
            ></v-select>
          </v-col>

          <v-col cols="12" md="2">
            <v-btn
              color="primary"
              block
              @click="fetchLhkData"
              :loading="loading"
              prepend-icon="mdi-magnify"
            >
              Cari
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="mb-4"></v-divider>

        <v-data-table
          v-model="selectedItems"
          v-model:expanded="expanded"
          :headers="headers"
          :items="lhkList"
          :loading="loading"
          item-value="Nomor"
          show-expand
          show-select
          density="compact"
          hover
          fixed-header
          height="450px"
          class="custom-table"
        >
          <template v-slot:expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="bg-grey-lighten-5 pa-0">
                <v-expand-transition>
                  <div v-if="expanded.includes(item.Nomor)">
                    <v-linear-progress
                      v-if="!lhkDetailsCache[item.Nomor]"
                      indeterminate
                      color="primary"
                    ></v-linear-progress>

                    <v-card v-else variant="flat" class="ma-3 border">
                      <v-table
                        density="compact"
                        class="bg-transparent detail-table"
                      >
                        <thead>
                          <tr class="bg-grey-lighten-3">
                            <th>Nomor SPK</th>
                            <th>Nama Pekerjaan</th>
                            <th class="text-right">Qty Order</th>
                            <th class="text-right">Qty Produksi LHK</th>
                            <th class="text-right">Kurang Cetak</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="spk in lhkDetailsCache[item.Nomor]"
                            :key="spk.urut"
                          >
                            <td class="font-weight-bold text-primary">
                              {{ truncateString(spk.nomor_spk, 12) }}
                            </td>
                            <td>
                              {{ truncateString(spk.nama_spk || "-", 40) }}
                            </td>
                            <td class="text-right">{{ spk.qty_order }} Pcs</td>
                            <td class="text-right font-weight-bold">
                              {{ spk.totalcetak }} Pcs
                            </td>
                            <td class="text-right font-weight-bold">
                              <span
                                :class="
                                  spk.kurang_cetak > 0
                                    ? 'text-red'
                                    : 'text-green'
                                "
                              >
                                {{ spk.kurang_cetak }} Pcs
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card>
                  </div>
                </v-expand-transition>
              </td>
            </tr>
          </template>
          <template #[`item.Status`]="{ item }">
            <v-chip
              size="x-small"
              :color="item.Status === 'POSTED' ? 'primary' : 'grey-darken-1'"
              :variant="item.Status === 'POSTED' ? 'flat' : 'tonal'"
              class="font-weight-bold"
            >
              {{ item.Status }}
            </v-chip>
          </template>

          <!-- Template untuk Kolom Status Close (OPEN / CLOSED) -->
          <template #[`item.StatusClose`]="{ item }">
            <v-chip
              size="x-small"
              :color="item.StatusClose === 'OPEN' ? 'success' : 'warning'"
              :variant="item.StatusClose === 'OPEN' ? 'flat' : 'tonal'"
              class="font-weight-bold"
            >
              {{ item.StatusClose }}
            </v-chip>
          </template>

          <template #[`item.Tanggal`]="{ item }">
            {{
              item.Tanggal ? format(new Date(item.Tanggal), "dd/MM/yyyy") : "-"
            }}
          </template>

          <template #[`item.NomorSPK`]="{ item }">
            <div class="d-flex align-center">
              <template v-if="item.JumlahSPK > 1">
                <v-chip
                  size="x-small"
                  color="orange-darken-3"
                  variant="flat"
                  class="font-weight-bold"
                >
                  RETAIL ({{ item.JumlahSPK }})
                </v-chip>
              </template>
              <span v-else class="font-weight-medium">
                {{ truncateString(item.NomorSPK, 12) }}
              </span>
            </div>
          </template>

          <template #[`item.NamaOrder`]="{ item }">
            <span :title="item.NamaOrder">
              {{ truncateString(item.NamaOrder || "-", 30) }}
            </span>
          </template>

          <template #[`item.TotalCetak`]="{ item }">
            <v-chip
              size="x-small"
              color="blue-darken-1"
              label
              class="font-weight-bold"
            >
              {{ item.TotalCetak }} Pcs
            </v-chip>
          </template>

          <template #[`item.KurangCetak`]="{ item }">
            <v-chip
              size="x-small"
              :color="item.KurangCetak > 0 ? 'error' : 'success'"
              variant="tonal"
              class="font-weight-bold"
            >
              {{ item.KurangCetak }} Pcs
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="pa-4">
        <span class="text-caption grey--text"
          >Terpilih: {{ selectedItems.length }} item</span
        >
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="text"
          size="small"
          @click="selectedItems = []"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          size="small"
          @click="submitSelection"
          :disabled="selectedItems.length === 0"
          >Ambil LHK</v-btn
        >
      </v-card-actions>

      <!-- Dialog alert konfirmasi: muncul di atas modal ini sebelum LHK CLOSED diambil -->
      <v-dialog v-model="confirmVisible" max-width="560" persistent>
        <v-card>
          <v-card-title class="text-warning d-flex align-center">
            <v-icon start color="warning">mdi-alert</v-icon>
            LHK Sudah CLOSED
          </v-card-title>
          <v-card-text>
            Ada <b>{{ closedNomors.length }}</b> LHK yang status close-nya sudah
            <b>CLOSED</b> (sudah pernah diambil ke Approve Cetak):
            <div class="text-error font-weight-bold mt-2">
              {{ closedNomors.join(", ") }}
            </div>
            <div class="mt-3">
              Apakah Anda yakin ingin tetap mengambil data ini?
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="grey-darken-1"
              variant="text"
              @click="confirmVisible = false"
            >
              Batal
            </v-btn>
            <v-btn color="primary" variant="elevated" @click="confirmTake">
              Ya, tetap ambil
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import api from "@/services/api";
import { format, subDays } from "date-fns";
import { useToast } from "vue-toastification";

const props = defineProps<{ isVisible: boolean }>();
const emit = defineEmits(["close", "select"]);
const toast = useToast();

const loading = ref(false);
const lhkList = ref<any[]>([]);
const selectedItems = ref<any[]>([]);
const expanded = ref<any[]>([]);
const lhkDetailsCache = reactive<Record<string, any>>({});
// Dialog konfirmasi untuk LHK yang sudah CLOSED.
const confirmVisible = ref(false);
const closedNomors = ref<string[]>([]);

const filters = reactive({
  date: format(new Date(), "yyyy-MM-dd"), // Default hari ini
  shift: "1", // Default shift 1
  search: "",
});

const headers: any[] = [
  { title: "", key: "data-table-expand", width: "40px" },
  { title: "Nomor LHK", key: "Nomor", width: "130px" },
  { title: "Status", key: "Status", width: "90px" }, // <-- Kolom Status (POSTED / DRAFT)
  { title: "Status Close", key: "StatusClose", width: "90px" }, // <-- Kolom Status Close (OPEN / CLOSED)
  { title: "Shift", key: "Shift", width: "70px" },
  { title: "Mesin", key: "Mesin", width: "80px" },
  { title: "Nomor SPK", key: "NomorSPK", width: "150px" },
  { title: "Nama SPK / Pekerjaan", key: "NamaOrder", width: "220px" },
  { title: "Jml. Order", key: "JumlahOrder", width: "80px" },
  { title: "Qty", key: "TotalCetak", align: "end", width: "90px" },
  { title: "Sisa SPK", key: "KurangCetak", align: "end", width: "90px" },
  { title: "Operator", key: "Operator", width: "100px" },
];

const truncateString = (str: string, num: number) => {
  if (str?.length > num) return str.slice(0, num) + "...";
  return str;
};

const loadDetail = async (nomor: string) => {
  if (lhkDetailsCache[nomor]) return;
  try {
    const response = await api.get("/mmt/lhk-cetak/details", {
      params: { nomor },
    });
    lhkDetailsCache[nomor] = response.data.details || [];
  } catch (error) {
    toast.error("Gagal mengambil detail SPK");
  }
};

watch(expanded, (newVal) => {
  if (newVal.length > 0) {
    loadDetail(newVal[newVal.length - 1]);
  }
});

const fetchLhkData = async () => {
  loading.value = true;
  selectedItems.value = [];

  try {
    // Kirim tanggal yang sama ke startDate dan endDate agar filter jadi "per hari"
    const response = await api.get("/mmt/lhk-cetak/lookup", {
      params: {
        startDate: filters.date,
        endDate: filters.date,
        shift: filters.shift, // Harus 'shift' sesuai destrukturisasi di backend
        search: filters.search, // Jika ada
      },
    });

    lhkList.value = response.data.data || response.data;
  } catch (error) {
    console.error("Fetch Error:", error);
    toast.error("Gagal memuat daftar LHK");
  } finally {
    loading.value = false;
  }
};

const submitSelection = () => {
  if (selectedItems.value.length === 0) return;

  // 1. Cek apakah ada item terpilih yang statusnya masih DRAFT (belum POSTED)
  const hasDraftItem = selectedItems.value.some((nomorLhk) => {
    const originalItem = lhkList.value.find(
      (lhk: any) => lhk.Nomor === nomorLhk,
    );
    return originalItem?.Status !== "POSTED";
  });

  // Jika ada yang masih DRAFT, hentikan proses dan tampilkan peringatan
  if (hasDraftItem) {
    toast.error(
      "Peringatan: Ada LHK yang dipilih belum berstatus POSTED dan tidak dapat diambil!",
    );
    return; // Proses dibatalkan, data tidak dikirim
  }

  // 2. LHK yang status close-nya sudah CLOSED (pernah diambil ke Approve Cetak).
  //    TETAP boleh diambil, tetapi wajib konfirmasi lewat dialog alert yang
  //    tampil LANGSUNG di atas modal ini (bukan setelah modal tertutup).
  const closed = selectedItems.value.filter((nomorLhk) => {
    const originalItem = lhkList.value.find(
      (lhk: any) => lhk.Nomor === nomorLhk,
    );
    return originalItem?.StatusClose === "CLOSED";
  });

  if (closed.length > 0) {
    closedNomors.value = closed;
    confirmVisible.value = true;
    return; // tunggu konfirmasi user
  }

  // 3. Jika lolos semua validasi, kirim data ke komponen utama
  emit("select", selectedItems.value);
  emit("close");
};

// Dilanjutkan setelah user menekan "Ya, tetap ambil" pada dialog alert.
const confirmTake = () => {
  confirmVisible.value = false;
  emit("select", selectedItems.value);
  emit("close");
};

watch(
  () => props.isVisible,
  (val) => {
    if (val) fetchLhkData();
  },
);
</script>

<style scoped>
/* Standarisasi Font Size 11px untuk semua elemen tabel */
:deep(.v-data-table .v-table__wrapper table th),
:deep(.v-data-table .v-table__wrapper table td),
:deep(.detail-table thead th),
:deep(.detail-table tbody td) {
  font-size: 11px !important;
  height: 36px !important; /* Baris lebih padat */
  white-space: nowrap;
}

/* Header styling */
:deep(.v-data-table-header th) {
  background-color: #f5f5f5 !important;
  font-weight: 700 !important;
  color: #333 !important;
}

/* Header detail styling */
:deep(.detail-table thead tr) {
  background-color: #eeeeee !important;
}

:deep(.detail-table thead th) {
  font-weight: 700 !important;
  color: #555 !important;
}

/* Chip Font Size */
:deep(.v-chip) {
  font-size: 10px !important;
  height: 20px !important;
}
</style>
