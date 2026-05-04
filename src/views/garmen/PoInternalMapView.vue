<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const menuId = "138";

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  cabang: authStore.userCabang || "ALL",
  nomorMap: "",
});

const cabangOptions = ref<string[]>(["ALL"]);

// ── STATE EXPANDED UNTUK VUETIFY ──
const expandedItems = ref<any[]>([]);

// State untuk menyimpan data detail (Lazy Loading)
const loadedDetails = ref<Record<string, any[]>>({});
const isDetailLoading = ref<Record<string, boolean>>({});

// State untuk filter Modal MAP
const showMapModal = ref(false);
const namaMapFilter = ref("");

const isExporting = ref(false);

onMounted(async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const branches = res.data.data.map((b: any) => b.Kode);
    cabangOptions.value = ["ALL", ...branches];
  } catch (error) {
    console.error("Gagal memuat opsi cabang", error);
  }
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    // Reset state expand setiap kali data master ditarik ulang (refresh/filter)
    expandedItems.value = [];
    loadedDetails.value = {};

    const res = await api.get("/garmen/po-internal-map", {
      params: filterState.value,
    });
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "SJ", key: "SJ", width: "150px" },
  { title: "Gudang Asal", key: "GudangAsal", width: "120px" },
  { title: "Tujuan", key: "Tujuan", width: "120px" },
  { title: "Qty PO", key: "QtyPO", width: "80px", align: "right" },
  { title: "Qty SJ", key: "QtySJ", width: "80px", align: "right" },
  { title: "Closed", key: "Closed", width: "80px", align: "center" },
];

// ── FIX: EVENT HANDLER EXPAND ──
const onExpandedUpdate = async (newExpandedArray: any[]) => {
  // Sync state expanded ke BaseBrowse
  expandedItems.value = newExpandedArray;

  // Looping baris mana saja yang sedang terbuka
  for (const item of newExpandedArray) {
    const nomorPO = item.Nomor || item.raw?.Nomor; // Tangani struktur item vuetify
    if (!nomorPO) continue;

    if (!loadedDetails.value[nomorPO] && !isDetailLoading.value[nomorPO]) {
      isDetailLoading.value[nomorPO] = true;
      try {
        const res = await api.get(
          `/garmen/po-internal-map/${encodeURIComponent(nomorPO)}/detail`,
        );
        loadedDetails.value[nomorPO] = res.data.data;
      } catch (error) {
        toast.error(`Gagal memuat detail untuk PO ${nomorPO}`);
        loadedDetails.value[nomorPO] = [];
      } finally {
        isDetailLoading.value[nomorPO] = false;
      }
    }
  }
};

const validateMap = async () => {
  if (!filterState.value.nomorMap || filterState.value.nomorMap.trim() === "") {
    namaMapFilter.value = "";
    return;
  }
  try {
    const res = await api.get(
      `/lookups/map-garmen/validate/${encodeURIComponent(filterState.value.nomorMap)}`,
    );
    if (res.data.data) {
      namaMapFilter.value = res.data.data.Nama;
    } else {
      toast.warning("Nomor MAP tsb tidak ada.");
      namaMapFilter.value = "";
      filterState.value.nomorMap = "";
    }
  } catch (error) {
    namaMapFilter.value = "";
    toast.error("Gagal memvalidasi MAP.");
  }
};

const selectMapFromModal = (item: any) => {
  filterState.value.nomorMap = item.Nomor;
  namaMapFilter.value = item.Nama;
  fetchData();
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtNum = (val: number | string | null) => {
  if (!val) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  const qtyPO = Number(row.QtyPO) || 0;
  const qtySJ = Number(row.QtySJ) || 0;

  if (qtySJ >= qtyPO || row.Closed === "YA") return { class: "row-close" };
  if (!row.Closed && !row.SJ) return { class: "row-open text-red-darken-2" };
  if (!row.Closed && row.SJ)
    return { class: "row-progress text-blue-darken-2" };

  return {};
};

const goAdd = () =>
  router.push({ name: "PoInternalMapFormCreate", query: { mode: "new" } });

const goEdit = (item: any) => {
  if (
    authStore.userCabang !== "HO-" &&
    item.GudangAsal !== authStore.userCabang
  ) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  if (item.Closed === "YA") {
    toast.warning("PO tsb sudah close.\nTidah bisa di ubah.");
    return;
  }
  if (item.SJ) {
    toast.warning("PO tsb sudah Jadi SJ.\nTidah bisa di ubah.");
    return;
  }

  router.push({
    name: "PoInternalMapFormEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
  });
};

const goDelete = async (item: any) => {
  if (
    authStore.userCabang !== "HO-" &&
    item.GudangAsal !== authStore.userCabang
  ) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  if (item.Closed === "YA") {
    toast.warning("PO tsb sudah close.\nTidah bisa di hapus.");
    return;
  }
  if (item.SJ) {
    toast.warning("PO tsb sudah Jadi SJ.\nTidah bisa di hapus.");
    return;
  }

  isLoading.value = true;
  try {
    await api.delete(
      `/garmen/po-internal-map/${encodeURIComponent(item.Nomor)}`,
    );
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

const cetak = () => {
  if (selected.value.length === 0) return;
  // Buka tab baru menuju URL print dengan nomor PO yang dipilih
  window.open(
    `/garmen/po-internal-map/print/${encodeURIComponent(selected.value[0].Nomor)}`,
    "_blank",
  );
};

const exportDetail = async () => {
  isExporting.value = true;
  toast.info("Sedang menyiapkan data Excel (Master-Detail)...");

  try {
    // Panggil endpoint export-detail yang baru saja kita buat
    const res = await api.get("/garmen/po-internal-map/export-detail", {
      params: filterState.value,
    });

    const exportData = res.data.data;

    if (!exportData || exportData.length === 0) {
      toast.warning("Tidak ada data untuk diekspor pada rentang filter ini.");
      isExporting.value = false;
      return;
    }

    // Mengkonversi JSON ke worksheet Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Menyesuaikan lebar kolom secara otomatis (opsional, tapi membuat rapi)
    const colWidths = [
      { wch: 18 }, // Nomor PO
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Gudang
      { wch: 10 }, // Tujuan
      { wch: 8 }, // Closed
      { wch: 18 }, // Kode MAP
      { wch: 35 }, // Nama MAP
      { wch: 20 }, // Bahan
      { wch: 15 }, // Ukuran
      { wch: 8 }, // Qty PO
      { wch: 8 }, // Qty SJ
      { wch: 12 }, // Dateline
      { wch: 30 }, // Keterangan
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PO_MAP_Detail");

    // Generate nama file dengan tanggal
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `po_internal_map_detail_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, fileName);
    toast.success("Berhasil mengunduh dokumen Excel.");
  } catch (error: any) {
    console.error("Export detail error:", error);
    toast.error(
      "Gagal mengekspor data: " + (error.message || "Terjadi kesalahan."),
    );
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="PO Internal MAP"
    :menu-id="menuId"
    icon="mdi-cart-arrow-down"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    v-model:expanded="expandedItems"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    show-expand
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @update:expanded="onExpandedUpdate"
    @export="exportToExcel('PO_INTERNAL_MAP')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Filter Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Cabang</span>
        <select
          v-model="filterState.cabang"
          class="date-inp"
          style="width: 80px"
          @change="fetchData"
        >
          <option v-for="cab in cabangOptions" :key="cab" :value="cab">
            {{ cab }}
          </option>
        </select>
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Filter MAP</span>
        <div class="inp-grp-custom">
          <input
            type="text"
            v-model="filterState.nomorMap"
            class="f-inp-kode"
            placeholder="Kode MAP"
            @blur="validateMap"
            @keyup.enter="fetchData"
          />
          <input
            type="text"
            v-model="namaMapFilter"
            class="f-inp-nama"
            placeholder="Nama MAP"
            readonly
            disabled
          />
          <button class="f-btn-lookup" @click="showMapModal = true">
            <v-icon size="12">mdi-magnify</v-icon>
          </button>
        </div>
      </div>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= Open</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-blue"></div>
          <span>= On Progress</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-black"></div>
          <span>= Close</span>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        prepend-icon="mdi-printer"
        :disabled="selected.length === 0"
        @click="cetak"
        >Cetak</v-btn
      >
      <v-btn
        size="small"
        variant="flat"
        color="green-darken-1"
        prepend-icon="mdi-file-excel"
        :loading="isExporting"
        @click="exportDetail"
        >Export Detail</v-btn
      >
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.QtyPO="{ item }">{{ fmtNum(item.QtyPO) }}</template>
    <template #item.QtySJ="{ item }">{{ fmtNum(item.QtySJ) }}</template>

    <template #detail="{ item }">
      <div class="detail-container">
        <div class="detail-header">
          Detail Barang PO: <strong>{{ item.Nomor }}</strong>
        </div>

        <div
          v-if="isDetailLoading[item.Nomor]"
          class="text-center py-2 text-grey"
        >
          <v-progress-circular
            indeterminate
            size="24"
            width="2"
            color="primary"
          ></v-progress-circular>
        </div>

        <table v-else class="detail-table">
          <thead>
            <tr>
              <th style="width: 140px">MAP</th>
              <th style="text-align: left">Nama MAP</th>
              <th style="text-align: left; width: 200px">Bahan</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 70px; text-align: right">Qty PO</th>
              <th style="width: 70px; text-align: right">Qty SJ</th>
              <th style="width: 90px">Dateline</th>
              <th style="text-align: left; width: 250px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in loadedDetails[item.Nomor] || []" :key="d.MAP">
              <td class="text-center font-weight-bold">{{ d.MAP }}</td>
              <td>{{ d.Nama_MAP }}</td>
              <td>{{ d.Bahan }}</td>
              <td class="text-center">{{ d.Ukuran }}</td>
              <td class="text-right font-weight-bold">{{ fmtNum(d.QtyPO) }}</td>
              <td class="text-right text-blue-darken-2 font-weight-bold">
                {{ fmtNum(d.QtySJ) }}
              </td>
              <td class="text-center">{{ fmtDate(d.Dateline) }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
            <tr v-if="(loadedDetails[item.Nomor] || []).length === 0">
              <td colspan="8" class="text-center text-grey">
                Belum ada detail barang.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <MapSearchModal v-model="showMapModal" @selected="selectMapFromModal" />
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}

/* Filter Custom Input MAP */
.inp-grp-custom {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.f-inp-kode {
  width: 130px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: #fff9c4;
}
.f-inp-nama {
  width: 150px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: #f5f5f5;
  border-left: 1px solid #e0e0e0;
}
.f-btn-lookup {
  width: 28px;
  height: 100%;
  background: #eeeeee;
  border-left: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.f-btn-lookup:hover {
  background: #e0e0e0;
}

.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}

/* Legend Styles */
.legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.bg-red {
  background-color: #d32f2f;
}
.bg-blue {
  background-color: #1976d2;
}
.bg-black {
  background-color: #212121;
}

/* ── STYLE UNTUK TABEL DETAIL ── */
.detail-container {
  padding: 8px 12px 12px 48px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.detail-header {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  overflow: hidden;
  font-size: 11px;
}
.detail-table th {
  background-color: #eceff1;
  color: #37474f;
  padding: 6px 8px;
  font-weight: 700;
  border-bottom: 1px solid #cfd8dc;
  border-right: 1px solid #eceff1;
}
.detail-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eceff1;
  border-right: 1px solid #eceff1;
  vertical-align: middle;
}
.detail-table tr:last-child td {
  border-bottom: none;
}
.detail-table tr:hover td {
  background-color: #f1f8e9;
}

/* Pewarnaan Tembus */
:deep(.row-open td) {
  font-weight: 600 !important;
}
:deep(.row-progress td) {
  font-weight: 600 !important;
}
</style>
