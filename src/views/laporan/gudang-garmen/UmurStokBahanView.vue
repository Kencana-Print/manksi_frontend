<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { umurStokBahanService as svc } from "@/services/laporan/gudang-garmen/umurStokBahanService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import { IconHourglass, IconFileExport, IconSearch } from "@tabler/icons-vue";

const MENU_ID = "530";
const toast = useToast();

const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Filter — single date, default hari ini ──
const tanggal = ref(todayLocal());
const kodeBahan = ref("");
const namaBahan = ref("");

const filterState = computed(() => ({
  tanggal: tanggal.value,
  kodeBahan: kodeBahan.value,
  namaBahan: namaBahan.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tanggal) tanggal.value = val.tanggal;
  if (val?.kodeBahan !== undefined) kodeBahan.value = val.kodeBahan;
  if (val?.namaBahan !== undefined) namaBahan.value = val.namaBahan;
};

// ── Modal cari bahan ──
const showBahanModal = ref(false);
const onBahanSelected = (item: any) => {
  kodeBahan.value = item.Kode || "";
  namaBahan.value = item.Nama || "";
};
const clearBahanFilter = () => {
  kodeBahan.value = "";
  namaBahan.value = "";
};

// ── Browse ──
const { items, isLoading, canExport, fetchData } = useBrowse<any>({
  menuId: MENU_ID,
  immediate: false,
  fetchApi: async () => {
    const res = await svc.getBrowse({
      tanggal: tanggal.value,
      kodeBahan: kodeBahan.value,
    });
    return res.data.data ?? [];
  },
});

onMounted(fetchData);
watch([tanggal, kodeBahan], fetchData);

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const headers = [
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Satuan", key: "Satuan", width: "80px" },
  { title: "Barcode", key: "Barcode", width: "150px" },
  { title: "Stok", key: "Stok", width: "90px", align: "end" },
  { title: "Tgl Cetak", key: "TanggalCetak", width: "100px" },
  { title: "Umur (hari)", key: "Umur", width: "100px", align: "end" },
  { title: "Status", key: "Status", width: "110px" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.Status === "Slowmoving")
    return {
      style: "color: white !important; background-color: #c62828 !important;",
    };
  if (item?.Status === "Perhatian")
    return {
      style: "color: white !important; background-color: #e65100 !important;",
    };
  return {};
};

const formatTanggal = (val: string) => {
  if (!val) return "-";
  const [y, m, d] = val.substring(0, 10).split("-");
  return `${d}-${m}-${y}`;
};

const isExporting = ref(false);
const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  isExporting.value = true;
  try {
    const cols: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Satuan", key: "Satuan", width: 10 },
      { header: "Barcode", key: "Barcode", width: 20 },
      { header: "Stok", key: "Stok", width: 12, align: "right" },
      { header: "Tgl Cetak", key: "TanggalCetak", width: 14 },
      { header: "Umur (hari)", key: "Umur", width: 14, align: "right" },
      { header: "Status", key: "Status", width: 14 },
    ];
    const rows = items.value.map((r: any) => ({
      ...r,
      TanggalCetak: formatTanggal(r.TanggalCetak),
    }));
    await exportExcelSingle(
      `Umur_Stok_Bahan_${tanggal.value}`,
      "Umur Stok Bahan",
      cols,
      rows,
      `Umur Stok Bahan per ${formatTanggal(tanggal.value)}`,
    );
    toast.success("Berhasil export data.");
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Umur Stok Bahan"
    :menu-id="MENU_ID"
    :icon="IconHourglass"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Barcode"
    :can-export="canExport"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="flbl">Per Tanggal</span>
      <input type="date" v-model="tanggal" class="finp" />
      <span class="flbl ml-3">Bahan</span>
      <div class="bahan-grp">
        <input
          type="text"
          :value="kodeBahan ? `${kodeBahan} - ${namaBahan}` : ''"
          readonly
          class="finp bahan-inp"
          placeholder="Semua bahan..."
          @click="showBahanModal = true"
        />
        <button
          v-if="kodeBahan"
          type="button"
          class="bahan-clear-btn"
          title="Hapus filter"
          @click="clearBahanFilter"
        >
          ✕
        </button>
        <button
          type="button"
          class="bahan-search-btn"
          title="Cari Bahan"
          @click="showBahanModal = true"
        >
          <IconSearch :size="13" />
        </button>
      </div>
    </template>
    <template #filter-right>
      <div class="legend-row">
        <span class="legend-dot dot-orange"></span>
        <span class="legend-lbl">Perhatian (60–90 hari)</span>
        <span class="legend-dot dot-red" style="margin-left: 10px"></span>
        <span class="legend-lbl">Slowmoving (&gt; 90 hari)</span>
      </div>
    </template>
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <IconFileExport :size="14" style="margin-right: 4px" />
        Export
      </v-btn>
    </template>
    <template #item.Stok="{ item }">
      {{ num(item.Stok) }}
    </template>
    <template #item.Umur="{ item }">
      {{ item.Umur !== null ? num(item.Umur) : "-" }}
    </template>
    <template #item.TanggalCetak="{ item }">
      {{ formatTanggal(item.TanggalCetak) }}
    </template>
  </BaseBrowse>
  <BahanSearchModal v-model="showBahanModal" @selected="onBahanSelected" />
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.ml-3 {
  margin-left: 12px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dot-orange {
  background: #e65100;
}
.dot-red {
  background: #c62828;
}
.legend-lbl {
  color: #555;
}
.bahan-grp {
  display: flex;
  align-items: stretch;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.bahan-inp {
  border: none !important;
  border-radius: 0 !important;
  cursor: pointer;
  width: 220px;
}
.bahan-clear-btn,
.bahan-search-btn {
  width: 26px;
  min-width: 26px;
  border: none;
  border-left: 1px solid #e0e0e0;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}
.bahan-clear-btn:hover {
  background: #ffebee;
  color: #c62828;
}
.bahan-search-btn {
  background: #e3f2fd;
  color: #1565c0;
}
.bahan-search-btn:hover {
  background: #bbdefb;
}
</style>
