<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kartuStokGarmenService } from "@/services/laporan/gudang-garmen/kartuStokGarmenService";
import {
  IconFileSpreadsheet,
  IconTableOptions,
  IconSearch,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

const toast = useToast();
const menuId = "503";

const getStartOfLastMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1); // Mundur 1 bulan
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getStartOfLastMonth(),
  endDate: getLocalDate(),
  cabang: "HO", // Default cabang
  jenis: "ACCESORIES",
  barang: "", // Kosong = semua barang
});

const cabangList = ["HO", "P01", "P02", "P03", "P04", "P05"];
const jenisList = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];

// State untuk Modal & Tampilan Input
const showBarangModal = ref(false);
const selectedBarangNama = ref("");

const expanded = ref<any[]>([]);
const loadingDetails = ref(new Set<string>());
const detailData = ref<Record<string, any[]>>({});

// Headers untuk Master Summary
const headers = [
  { title: "Kode", key: "Kode", width: "120px" },
  { title: "Nama Barang", key: "Nama", minWidth: "250px" },
  { title: "Satuan", key: "Satuan", width: "80px", align: "center" },
  { title: "Stok Awal", key: "StokAwal", width: "100px", align: "right" },
  { title: "BPB Bahan", key: "BPBbahan", width: "100px", align: "right" },
  { title: "BPB", key: "BPB", width: "90px", align: "right" },
  { title: "Retur", key: "Retur", width: "90px", align: "right" },
  { title: "Koreksi", key: "Koreksi", width: "90px", align: "right" },
  { title: "Mutasi In", key: "MSI", width: "100px", align: "right" },
  {
    title: "Realisasi",
    key: "RealisasiPermintaan",
    width: "100px",
    align: "right",
  },
  { title: "Mutasi Out", key: "MSO", width: "100px", align: "right" },
  { title: "Stok Akhir", key: "StokAkhir", width: "110px", align: "right" },
];

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await kartuStokGarmenService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

const loadDetailData = async (kode: string) => {
  loadingDetails.value.add(kode);
  try {
    const res = await kartuStokGarmenService.getBrowseDetail(
      kode,
      filterState.value,
    );
    // Menggunakan spread operator untuk reaktivitas Vue 3
    detailData.value = { ...detailData.value, [kode]: res.data.data };
  } catch {
    toast.error("Gagal memuat detail kartu stok.");
  } finally {
    loadingDetails.value.delete(kode);
  }
};

const handleExpanded = (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const val of newExpanded) {
    const kode = typeof val === "object" && val !== null ? val.Kode : val;
    if (kode && !detailData.value[kode]) {
      loadDetailData(kode);
    }
  }
};

const onRowClick = (item: any) => {
  const kode = item.Kode;
  let newExpanded = [...expanded.value];
  const index = newExpanded.indexOf(kode);

  if (index === -1) newExpanded.push(kode);
  else newExpanded.splice(index, 1);

  handleExpanded(newExpanded);
};

// --- HANDLER MODAL BARANG ---
const openModalBarang = () => {
  showBarangModal.value = true;
};

const onBarangSelected = (item: any) => {
  filterState.value.barang = item.Kode;
  selectedBarangNama.value = item.Nama;
  fetchData(); // Langsung refresh data setelah pilih
};

const clearBarang = () => {
  filterState.value.barang = "";
  selectedBarangNama.value = "";
  fetchData(); // Langsung refresh data setelah clear
};

// Fungsi pewarnaan teks baris (khusus jika stok minus menjadi merah)
const getRowTextColor = (item: any) => {
  if (Number(item.StokAkhir) < 0) return "#c62828"; // Merah
  return "";
};

const getRowProps = (data: any) => {
  const color = getRowTextColor(data.item?.raw || data.item);
  if (color) return { style: `color: ${color}; font-weight: bold;` };
  return {};
};

const fmtNum = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Watch khusus untuk filter yang membutuhkan refresh otomatis
watch(
  [() => filterState.value.cabang, () => filterState.value.jenis],
  fetchData,
);
</script>

<template>
  <BaseBrowse
    title="Laporan Kartu Stok Barang"
    :menu-id="menuId"
    :icon="IconFileSpreadsheet"
    :headers="headers"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    show-expand
    :expanded="expanded"
    @update:expanded="handleExpanded"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @row-click="onRowClick"
    @refresh="fetchData"
    @export="exportToExcel('Kartu_Stok_Barang')"
  >
    <template #filter-left>
      <div
        style="
          flex-basis: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        "
      >
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />

        <div class="f-divider" />

        <v-radio-group
          v-model="filterState.jenis"
          inline
          hide-details
          class="f-radio-group"
        >
          <v-radio
            v-for="jns in jenisList"
            :key="jns"
            :label="jns"
            :value="jns"
            color="primary"
            class="mr-2"
          />
        </v-radio-group>

        <div class="f-divider" />

        <span class="f-label">Barang</span>
        <v-text-field
          :model-value="
            filterState.barang
              ? `[${filterState.barang}] ${selectedBarangNama}`
              : ''
          "
          placeholder="F1 atau klik icon..."
          variant="outlined"
          density="compact"
          hide-details
          readonly
          clearable
          class="f-search-barang"
          @keydown.f1.prevent="openModalBarang"
          @click:clear="clearBarang"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              color="#1565c0"
              style="cursor: pointer; align-self: center"
              @click="openModalBarang"
            />
          </template>
        </v-text-field>
      </div>

      <div
        style="display: flex; align-items: center; gap: 8px; margin-right: 4px"
      >
        <span class="f-label">Cabang</span>
        <v-select
          v-model="filterState.cabang"
          :items="cabangList"
          variant="outlined"
          density="compact"
          hide-details
          class="f-select"
        />
        <div class="f-divider" />
      </div>
    </template>

    <template #item.StokAwal="{ item }">{{ fmtNum(item.StokAwal) }}</template>
    <template #item.BPBbahan="{ item }">{{ fmtNum(item.BPBbahan) }}</template>
    <template #item.BPB="{ item }">{{ fmtNum(item.BPB) }}</template>
    <template #item.Retur="{ item }">{{ fmtNum(item.Retur) }}</template>
    <template #item.Koreksi="{ item }">{{ fmtNum(item.Koreksi) }}</template>
    <template #item.MSI="{ item }">{{ fmtNum(item.MSI) }}</template>
    <template #item.RealisasiPermintaan="{ item }">{{
      fmtNum(item.RealisasiPermintaan)
    }}</template>
    <template #item.MSO="{ item }">{{ fmtNum(item.MSO) }}</template>
    <template #item.StokAkhir="{ item }">
      <span
        :class="
          Number(item.StokAkhir) < 0
            ? 'text-error font-weight-bold'
            : 'font-weight-bold'
        "
      >
        {{ fmtNum(item.StokAkhir) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="loadingDetails.has(item.Kode)" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2 text-caption text-grey"
            >Menghitung buku stok...</span
          >
        </div>

        <div v-else class="detail-panel">
          <div class="panel-head">
            <IconTableOptions :size="14" class="mr-1" />
            Kartu Stok:
            <span class="text-warning ml-1"
              >[{{ item.Kode }}] {{ item.Nama }}</span
            >
          </div>
          <div class="panel-body">
            <table class="dtl-table">
              <thead>
                <tr>
                  <th style="width: 180px">Transaksi</th>
                  <th style="width: 150px">Nomor Ref</th>
                  <th style="width: 100px" class="tc">Tanggal</th>
                  <th class="tr">Stok In</th>
                  <th class="tr">Stok Out</th>
                  <th class="tr">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(d, i) in detailData[item.Kode]"
                  :key="i"
                  :class="{ 'row-awal': d.Transaksi === 'Stok Awal' }"
                >
                  <td class="fw">{{ d.Transaksi }}</td>
                  <td>{{ d.Nomor }}</td>
                  <td class="tc">
                    {{ formatTanggal(d.Tanggal) }}
                  </td>
                  <td class="tr text-success fw">
                    {{ d.StokIn !== 0 ? fmtNum(d.StokIn) : "-" }}
                  </td>
                  <td class="tr text-error fw">
                    {{ d.StokOut !== 0 ? fmtNum(d.StokOut) : "-" }}
                  </td>
                  <td
                    class="tr fw"
                    :class="d.Saldo < 0 ? 'text-error' : 'text-primary'"
                  >
                    {{ fmtNum(d.Saldo) }}
                  </td>
                </tr>
                <tr v-if="!detailData[item.Kode]?.length">
                  <td colspan="6" class="empty-row">
                    Tidak ada riwayat pergerakan stok.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    :jenis="filterState.jenis"
    :cabang="filterState.cabang"
    @selected="onBarangSelected"
  />
</template>

<style scoped>
/* ── Filter ── */
.gap-2 {
  gap: 8px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #888;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}

.f-select {
  width: 85px;
  background: white;
  border-radius: 4px;
}
.f-select :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
}
.f-select :deep(.v-field__append-inner) {
  padding-top: 0 !important;
  align-items: center;
}

.f-radio-group :deep(.v-label) {
  font-size: 11px !important;
  font-weight: 600;
  color: #444;
}

/* Menyesuaikan lebar input barang karena tampilannya bisa panjang (KODE + NAMA) */
.f-search-barang {
  width: 300px;
  background: white;
  border-radius: 4px;
}
.f-search-barang :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.f-search-barang :deep(.v-field__clearable) {
  align-items: center;
  align-self: center;
  padding-top: 0;
}

/* ── Detail Wrapper ── */
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f0f4f8;
  border-top: 2px solid #e3e8ef;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 16px;
  color: #555;
}
.ml-2 {
  margin-left: 8px;
}
.ml-1 {
  margin-left: 4px;
}

/* ── Panels ── */
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  max-width: 800px;
}
.panel-head {
  display: flex;
  align-items: center;
  background: #263238;
  color: white;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.panel-body {
  overflow-x: auto;
}

/* ── Detail Table ── */
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
}
.dtl-table tbody tr:hover td {
  background: #f5f9ff;
}
.row-awal td {
  background-color: #fffde7 !important;
  border-bottom: 1px solid #ffcc80 !important;
}

/* ── Cell Helpers ── */
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
