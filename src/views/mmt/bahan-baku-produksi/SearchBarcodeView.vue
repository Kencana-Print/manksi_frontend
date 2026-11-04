<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconBarcode, IconHistory } from "@tabler/icons-vue";
import api from "@/services/api";

const selectedGudang = ref("");
const showHistoryDialog = ref(false);
const historyLoading = ref(false);
const historyData = ref<any>(null);

const headers = [
  { title: "Barcode Rol", key: "Barcode", width: "180px" },
  { title: "Kode Bahan", key: "Kode", width: "140px" },
  { title: "Nama Bahan", key: "Nama_Bahan", minWidth: "220px" },
  { title: "Gudang", key: "Gudang", width: "110px", align: "center" as const },
  { title: "Stok Sistem (m)", key: "Stok_Sistem", width: "130px", align: "end" as const },
];

const {
  items,
  isLoading,
  selected,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5540",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/barcode/search/list", {
      params: { gdg_kode: selectedGudang.value || undefined },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const openHistory = async (barcodeVal?: string) => {
  const targetBarcode = barcodeVal || (selected.value?.[0]?.Barcode || selected.value?.[0]);
  if (!targetBarcode) return;

  showHistoryDialog.value = true;
  historyLoading.value = true;
  historyData.value = null;

  try {
    const res = await api.get("/mmt/bahan-baku-produksi/barcode/search/history", {
      params: { barcode: targetBarcode },
    });
    historyData.value = res.data?.data || null;
  } catch (err: any) {
    console.error("Gagal memuat riwayat barcode:", err);
  } finally {
    historyLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Cari Barcode Rol"
    menu-id="5540"
    item-value="Barcode"
    :icon="IconBarcode"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Daftar_Barcode_Rol')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Gudang</span>
        <select v-model="selectedGudang" class="select-inp" @change="fetchData">
          <option value="">Semua Gudang</option>
          <option value="WH-16">WH-16 (Utama)</option>
          <option value="GPM">GPM (Bahan)</option>
        </select>
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          class="ml-2 text-none"
          :disabled="!selected || selected.length !== 1"
          @click="openHistory()"
        >
          <v-icon :icon="IconHistory" size="16" class="mr-1" />
          Lihat Riwayat Rol
        </v-btn>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Riwayat Pergerakan Barcode -->
  <v-dialog v-model="showHistoryDialog" max-width="850">
    <v-card class="pa-4">
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon :icon="IconBarcode" size="24" class="mr-2 text-primary" />
          <h3 class="text-subtitle-1 font-weight-bold mb-0">
            Riwayat Pergerakan Barcode
          </h3>
        </div>
        <v-btn icon variant="text" size="small" @click="showHistoryDialog = false">
          ✕
        </v-btn>
      </div>

      <div v-if="historyLoading" class="text-center py-6">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-2 text-caption">Memuat riwayat pergerakan...</div>
      </div>

      <div v-else-if="historyData">
        <v-sheet color="grey-lighten-4" rounded class="pa-3 mb-3">
          <v-row dense>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey-darken-1">Barcode</div>
              <div class="font-weight-bold">{{ historyData.info?.Barcode }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey-darken-1">Kode Bahan</div>
              <div class="font-weight-medium">{{ historyData.info?.Kode }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1">Nama Bahan</div>
              <div class="font-weight-medium">{{ historyData.info?.Nama_Bahan }}</div>
            </v-col>
          </v-row>
        </v-sheet>

        <div class="text-subtitle-2 font-weight-bold mb-2">Riwayat Transaksi</div>
        <v-table density="compact" class="border rounded">
          <thead>
            <tr>
              <th class="text-center" style="width: 100px">Tanggal</th>
              <th style="width: 140px">No Referensi</th>
              <th>Keterangan</th>
              <th class="text-end" style="width: 90px">Masuk</th>
              <th class="text-end" style="width: 90px">Keluar</th>
              <th class="text-end" style="width: 90px">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in historyData.moves || []" :key="idx">
              <td class="text-center">{{ m.mst_tanggal ? String(m.mst_tanggal).slice(0, 10) : '-' }}</td>
              <td>{{ m.mst_noreferensi }}</td>
              <td>{{ m.keterangan || '-' }}</td>
              <td class="text-end">{{ m.mst_stok_in || 0 }}</td>
              <td class="text-end">{{ m.mst_stok_out || 0 }}</td>
              <td class="text-end font-weight-bold">{{ m.saldo ?? '-' }}</td>
            </tr>
            <tr v-if="!historyData.moves?.length">
              <td colspan="6" class="text-center py-4 text-grey">Tidak ada riwayat pergerakan.</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div v-else class="text-center py-6 text-grey">
        Data riwayat tidak ditemukan.
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.select-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}
</style>
