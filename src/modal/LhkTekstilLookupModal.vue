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
          🔍 Pilih LHK Tekstil (Produksi)
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
              v-model="filters.tanggal"
              label="Pilih Tanggal"
              type="date"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="fetchLhkData"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="5">
            <v-select
              v-model="filters.shift"
              :items="['Semua', '1', '2', '3']"
              label="Pilih Shift"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="fetchLhkData"
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
                              {{ truncateString(spk.Nomor_SPK, 12) }}
                            </td>

                            <td>
                              {{ truncateString(spk.Nama_SPK || "-", 40) }}
                            </td>

                            <td class="text-right">
                              {{ spk.Jumlah_SPK || 0 }} Pcs
                            </td>

                            <td class="text-right font-weight-bold">
                              {{ spk.totalcetak || 0 }} Pcs
                            </td>

                            <td class="text-right font-weight-bold">
                              <span
                                :class="
                                  Number(spk.Jumlah_SPK || 0) -
                                    Number(spk.totalcetak || 0) >
                                  0
                                    ? 'text-red'
                                    : 'text-green'
                                "
                              >
                                {{
                                  Number(spk.Jumlah_SPK || 0) -
                                  Number(spk.totalcetak || 0)
                                }}
                                Pcs
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

          <template #[`item.StatusAmbil`]="{ item }">
            <v-chip
              size="x-small"
              :color="item.StatusAmbil === 'OPEN' ? 'success' : 'grey-darken-1'"
              :variant="item.StatusAmbil === 'OPEN' ? 'flat' : 'tonal'"
              class="font-weight-bold"
            >
              {{ item.StatusAmbil === "OPEN" ? "OPEN" : "CLOSE" }}
            </v-chip>
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
            <span class="font-weight-bold text-blue">
              {{ Number(item.KurangCetak || 0).toFixed(2) }} m²
            </span>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="pa-4">
        <span class="text-caption grey--text">
          Terpilih: {{ selectedItems.length }} item
        </span>
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="text"
          size="small"
          @click="selectedItems = []"
        >
          Batal
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          size="small"
          @click="submitSelection"
          :disabled="selectedItems.length === 0"
        >
          Ambil LHK
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import api from "@/services/api";
import { format } from "date-fns";

// Menyesuaikan interface prop ke TypeScript jika menggunakan compiler TS
const props = defineProps<{ isVisible: boolean }>();
const emit = defineEmits(["close", "select"]);

const loading = ref(false);
const lhkList = ref([]);
const selectedItems = ref([]);
const expanded = ref([]);
const lhkDetailsCache = reactive<Record<string, any>>({});

const filters = reactive({
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: "Semua",
});

// Penyesuaian Header Sesuai Request User
const headers = [
  { title: "No", key: "data-table-expand", width: "40px" },
  { title: "No LHK", key: "Nomor", width: "130px" },
  { title: "Status (close/open)", key: "StatusAmbil", width: "130px" },
  { title: "Shift", key: "Shift", width: "70px" },
  { title: "No mesin", key: "Mesin", width: "90px" },
  { title: "No SPK", key: "NomorSPK", width: "140px" },
  { title: "Nama SPK", key: "NamaOrder", width: "200px" },
  { title: "Jumlah order", key: "JumlahOrder", align: "end", width: "100px" },
  { title: "Qty cetak", key: "TotalCetak", align: "end", width: "100px" },
  { title: "qty meter2", key: "KurangCetak", align: "end", width: "110px" }, // Slot m2
];

const truncateString = (str: string, num: number) => {
  if (str?.length > num) return str.slice(0, num) + "...";
  return str;
};

const loadDetail = async (nomor: string) => {
  if (lhkDetailsCache[nomor]) return;
  try {
    // Menghubungi API detail (bisa disesuaikan setelah Anda mengirimkan struktur backend nanti)
    const response = await api.get("/mmt/lhk-tekstil-mmt/details", {
      params: { nomor },
    });
    lhkDetailsCache[nomor] = response.data.details || response.data;
  } catch (error) {
    console.error("Gagal mengambil detail SPK:", error);
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
    // Menggunakan endpoint LHK Tekstil lama namun dengan format parameter LHK Cetak
    const response = await api.get("/mmt/lhk-tekstil-mmt/lookup", {
      params: {
        tanggal: filters.tanggal,
        shift: filters.shift,
      },
    });

    lhkList.value = response.data.data || response.data;
  } catch (error) {
    console.error("Fetch Error:", error);
  } finally {
    loading.value = false;
  }
};

const submitSelection = () => {
  if (selectedItems.value.length === 0) return;

  // Konfirmasi jika ada LHK dengan status CLOSED / SUDAH DIAMBIL
  const hasClosedItem = selectedItems.value.some((nomorLhk) => {
    const originalItem: any = lhkList.value.find(
      (lhk: any) => lhk.Nomor === nomorLhk,
    );
    return (
      originalItem?.StatusAmbil === "CLOSED" ||
      originalItem?.StatusAmbil === "CLOSE"
    );
  });

  if (hasClosedItem) {
    const konfirmasi = window.confirm(
      "Peringatan: Ada Nomor LHK yang sudah pernah diambil (CLOSED).\nApakah Anda yakin ingin tetap mengambil data ini?",
    );
    if (!konfirmasi) return;
  }

  // Filter full object data yang terpilih untuk dikirim ke parent component
  const selectedData = lhkList.value.filter((i: any) =>
    selectedItems.value.includes(i.Nomor),
  );

  emit("select", selectedData);
  emit("close");
};

watch(
  () => props.isVisible,
  (val) => {
    if (val) fetchLhkData();
  },
  { immediate: true },
);
</script>

<style scoped>
/* Standarisasi Font Size 11px agar rapi seperti Mesin Cetak */
:deep(.v-data-table .v-table__wrapper table th),
:deep(.v-data-table .v-table__wrapper table td),
:deep(.detail-table thead th),
:deep(.detail-table tbody td) {
  font-size: 11px !important;
  height: 36px !important;
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
