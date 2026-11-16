<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, subDays } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useAuthStore } from "@/stores/authStore";
import GudangLookup from "@/modal/GudangLookupView.vue";
import * as XLSX from "xlsx";

// --- State ---
const authStore = useAuthStore();
const user = authStore.user;

const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = ref<boolean>(false);
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);
const isLookupVisible = ref(false);

// Dropdown Options State
const gudangOptions = ref<any[]>([]);
const loadingGudang = ref(false);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  gdgKode: user?.divisi == 1 ? "WH-010" : user?.GDG_KODE || "",
});

const gdgNamaDisplay = ref(
  user?.divisi == 1 ? "GUDANG JADI MMT" : user?.GDG_NAMA || "",
);
const toast = useToast();
const router = useRouter();
const API_STBJ = "/mmt/stbj";

// --- Table Headers Config ---
const headers = computed(() => [
  {
    title: "Detail",
    key: "data-table-expand",
    minWidth: "60px",
    align: "center" as const,
    fixed: true,
  },
  { title: "Nomor STBJ", key: "Nomor", minWidth: "160px", fixed: true },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "GudangKode", key: "GudangKode", minWidth: "100px" },
  { title: "Gudang", key: "Gudang", minWidth: "180px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "User", key: "Usr", minWidth: "100px" },
]);

const detailHeaders = [
  { title: "Nomor SPK", key: "Spk_Nomor", minWidth: "140px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", minWidth: "180px" },
  { title: "Size", key: "Size", align: "center" as const, minWidth: "80px" },
  { title: "Jumlah", key: "Jumlah", align: "end" as const, minWidth: "90px" },
  { title: "Koli", key: "Koli", align: "end" as const, minWidth: "80px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
] as any[];

// --- Fetch Daftar Gudang untuk Dropdown ---
const fetchGudangOptions = async () => {
  loadingGudang.value = true;
  const currentDivisi = user?.divisi;

  try {
    const response = await api.get("/mmt/lookup/gudang", {
      params: {
        mode: "jadi",
        divisi: currentDivisi,
      },
    });

    gudangOptions.value = (response.data.data || []).map((g: any) => ({
      title: `${g.Kode} - ${g.Nama}`,
      value: g.Kode,
    }));
  } catch (err) {
    console.error("Gagal load opsi gudang", err);
  } finally {
    loadingGudang.value = false;
  }
};

const fetchData = async () => {
  if (loading.value) return;
  loading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const response = await api.get(API_STBJ, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        gdgKode: filters.gdgKode,
      },
    });
    masterData.value = response.data || [];
  } catch (err) {
    toast.error("Gagal mengambil data STBJ.");
  } finally {
    loading.value = false;
  }
};

// --- Lookup Logic ---
const openLookup = () => (isLookupVisible.value = true);

const onGudangSelected = (gudang: { Kode: string; Nama: string }) => {
  const exists = gudangOptions.value.some((opt) => opt.value === gudang.Kode);
  if (!exists) {
    gudangOptions.value.push({
      title: `${gudang.Kode} - ${gudang.Nama}`,
      value: gudang.Kode,
    });
  }
  filters.gdgKode = gudang.Kode;
  gdgNamaDisplay.value = gudang.Nama;
  isLookupVisible.value = false;
};

// --- Computed ---
const isSingleSelected = computed(() => selected.value.length === 1);
const selectedItem = computed(() =>
  isSingleSelected.value ? selected.value[0] : null,
);

// --- Action Handlers ---
const handleNewEdit = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push({ name: 'StbjMmtNew' });
    return;
  }
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  if (user?.CABANG && user.CABANG !== "" && item.Usr !== user.kdUser) {
    toast.warning(`Data milik ${item.Usr}. Anda tidak boleh mengubah.`);
    return;
  }
  if (item.NomorTerima) {
    toast.error("STBJ ini sudah ada penerimaan.");
    return;
  }
  router.push({ name: 'StbjMmtEdit', params: { nomor: item.Nomor } });
};

const handleDelete = async () => {
  if (!selectedItem.value) return;
  const item = selectedItem.value;

  if (user?.CABANG && user.CABANG !== "" && item.Usr !== user.kdUser) {
    toast.warning(`Data milik ${item.Usr}. Anda tidak boleh hapus.`);
    return;
  }
  if (item.NomorTerima) {
    toast.error("STBJ ini sudah ada penerimaan.");
    return;
  }

  if (confirm(`Yakin ingin hapus STBJ Nomor: ${item.Nomor}?`)) {
    try {
      await api.delete(`${API_STBJ}/${item.Nomor}`, {
        params: { gdgKode: item.GudangKode },
        data: { userLogin: user.kdUser, userCabang: user.CABANG },
      });
      toast.success("Data berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus data.");
    }
  }
};

// --- Row Click & Selection Style ---
const handleRowClick = (_event: any, row: any) => {
  selected.value = selected.value.some((s) => s.Nomor === row.item.Nomor)
    ? []
    : [row.item];
};

const getRowProps = ({ item }: any) => ({
  class: selected.value.some((s) => s.Nomor === item?.Nomor)
    ? "row-selected"
    : "",
});

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    WAIT: "blue",
    TOLAK: "red",
    ACC: "success",
  };
  return colors[status] || "grey";
};

// --- Expand Detail Loader ---
const loadDetails = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const nomor = typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!nomor || details.value[nomor] || loadingDetails.value.has(nomor)) return;

  loadingDetails.value.add(nomor);
  try {
    const res = await api.get(`${API_STBJ}/browse/detail`, {
      params: { nomor },
    });
    details.value[nomor] = res.data?.data || res.data || [];
  } catch (err) {
    toast.error(`Gagal memuat detail ${nomor}`);
    details.value[nomor] = [];
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

// Format Tanggal Manual Lokal Anti-Crash
const formatTglManual = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

// --- Fungsi Export Excel yang Sinkron dengan Gambar Nyata ---
const exportToExcel = async () => {
  if (masterData.value.length === 0) {
    toast.warning("Tidak ada data untuk diekspor");
    return;
  }

  loading.value = true;
  try {
    // 1. Pre-fetch detail data otomatis dari server jika belum ter-cache
    for (const header of masterData.value) {
      if (
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0
      ) {
        try {
          const res = await api.get(`${API_STBJ}/browse/detail`, {
            params: { nomor: header.Nomor },
          });
          details.value[header.Nomor] = res.data?.data || res.data || [];
        } catch (e) {
          console.error(
            `Gagal pre-fetch detail STBJ nomor ${header.Nomor}:`,
            e,
          );
          details.value[header.Nomor] = [];
        }
      }
    }

    const fileName = `Laporan_STBJ_${filters.startDate}_to_${filters.endDate}.xlsx`;

    // Style Definition
    const styleHeaderMain = {
      fill: { fgColor: { rgb: "B3E5FC" } },
      font: { bold: true, color: { rgb: "000000" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    const styleDataCell = {
      font: { sz: 10 },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
      alignment: { vertical: "center" },
    };

    const styleDataCellCenter = {
      ...styleDataCell,
      alignment: { horizontal: "center", vertical: "center" },
    };

    const styleDataCellRight = {
      ...styleDataCell,
      alignment: { horizontal: "right", vertical: "center" },
    };

    const worksheetData = [];
    worksheetData.push([
      {
        v: "LAPORAN SURAT TANDA BARANG JADI (STBJ)",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${formatTglManual(filters.startDate)} s/d ${formatTglManual(filters.endDate)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    // Headers Kolom Excel (Disesuaikan Nyata)
    const headersTable = [
      { v: "NOMOR STBJ", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "GUDANG KODE", s: styleHeaderMain },
      { v: "GUDANG NAMA", s: styleHeaderMain },
      { v: "KETERANGAN HEADER", s: styleHeaderMain },
      { v: "USER CREATED", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "UKURAN", s: styleHeaderMain },
      { v: "SIZE", s: styleHeaderMain },
      { v: "JUMLAH", s: styleHeaderMain },
      { v: "KOLI", s: styleHeaderMain },
      { v: "KETERANGAN DETAIL", s: styleHeaderMain },
    ];
    worksheetData.push(headersTable);

    masterData.value.forEach((header) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = header.Tanggal ? formatTglManual(header.Tanggal) : "";

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          worksheetData.push([
            { v: index === 0 ? header.Nomor : "", s: styleDataCellCenter },
            { v: index === 0 ? tglHeader : "", s: styleDataCellCenter },
            {
              v:
                index === 0
                  ? header.GudangKode || header.GudangAsal || "-"
                  : "",
              s: styleDataCellCenter,
            },
            {
              v: index === 0 ? header.Gudang || header.Nama_Gudang || "-" : "",
              s: styleDataCell,
            },
            { v: index === 0 ? header.Keterangan || "" : "", s: styleDataCell },
            { v: index === 0 ? header.Usr || "-" : "", s: styleDataCellCenter },

            // Kolom Detail Nyata (Dengan Fallback Robust Camelcase/Snakecase)
            {
              v: dtl.Spk_Nomor || dtl.Nomor_SPK || "-",
              s: styleDataCellCenter,
            },
            { v: dtl.Nama || dtl.Nama_SPK || "-", s: styleDataCell },
            { v: dtl.Ukuran || "-", s: styleDataCellCenter },
            { v: dtl.Size || "-", s: styleDataCellCenter },
            {
              v: dtl.Jumlah !== undefined ? Number(dtl.Jumlah) : 0,
              s: styleDataCellRight,
            },
            {
              v: dtl.Koli !== undefined ? Number(dtl.Koli) : 0,
              s: styleDataCellRight,
            },
            { v: dtl.Keterangan || "", s: styleDataCell },
          ]);
        });
      } else {
        worksheetData.push([
          { v: header.Nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          {
            v: header.GudangKode || header.GudangAsal || "-",
            s: styleDataCellCenter,
          },
          { v: header.Gudang || header.Nama_Gudang || "-", s: styleDataCell },
          { v: header.Keterangan || "", s: styleDataCell },
          { v: header.Usr || "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data rincian pekerjaan", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: 0, s: styleDataCellRight },
          { v: 0, s: styleDataCellRight },
          { v: "", s: styleDataCell },
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 12 },
      { wch: 18 },
      { wch: 35 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "STBJ");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel STBJ berhasil diunduh");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.value = false;
  }
};

// --- Lifecycle & Watchers ---
onMounted(() => {
  fetchGudangOptions();
  fetchData();
});

watch(
  [() => filters.startDate, () => filters.endDate, () => filters.gdgKode],
  fetchData,
);
</script>

<template>
  <div class="stbj-browse-wrapper">
    <BaseBrowse
      title="Browse STBJ"
      menu-id="mmt-stbj"
      icon="mdi-archive-search"
      :headers="headers"
      :items="masterData"
      item-value="Nomor"
      :can-insert="true"
      :can-edit="true"
      :can-delete="true"
      :can-export="true"
      :is-loading="loading"
      :loading="loading"
      height="500px"
      fixed-header
      v-model:selected="selected"
      v-model:startDate="filters.startDate"
      v-model:endDate="filters.endDate"
      v-model:expanded="expanded"
      @refresh="fetchData"
      @add="handleNewEdit('new')"
      @edit="handleNewEdit('edit')"
      @delete="handleDelete"
      @export="exportExcel"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
      @update:expanded="loadDetails"
    >
      <!-- Keterangan Warna Status di atas tabel -->
      <template #prepend-content>
        <div
          class="d-flex align-center px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption"
        >
          <span class="font-weight-bold mr-4">Keterangan Status:</span>
          <span class="d-flex align-center mr-4">
            <span class="color-indicator bg-blue rounded-circle mr-1"></span>
            Biru = Menunggu (WAIT)
          </span>
          <span class="d-flex align-center mr-4">
            <span class="color-indicator bg-error rounded-circle mr-1"></span>
            Merah = Ditolak (TOLAK)
          </span>
          <span class="d-flex align-center">
            <span class="color-indicator bg-success rounded-circle mr-1"></span>
            Hijau = Disetujui (ACC)
          </span>
        </div>
      </template>

      <!-- Filter Gudang di Toolbar -->
      <template #filter-fields>
        <v-autocomplete
          v-model="filters.gdgKode"
          :items="gudangOptions"
          :loading="loadingGudang"
          label="Gudang"
          placeholder="Pilih Gudang..."
          density="compact"
          hide-details
          variant="outlined"
          style="max-width: 350px"
          clearable
          append-inner-icon="mdi-magnify"
          @click:append-inner="openLookup"
        >
          <template #no-data>
            <v-list-item title="Gudang tidak ditemukan"></v-list-item>
          </template>
        </v-autocomplete>
      </template>

      <!-- Tombol Export Excel -->
      <template #extra-actions>
        <v-btn
          size="small"
          variant="flat"
          color="green-darken-1"
          :disabled="masterData.length === 0"
          :loading="loading"
          @click="exportToExcel"
        >
          <template #prepend>
            <v-icon size="small">mdi-file-excel</v-icon>
          </template>
          Export Excel
        </v-btn>
      </template>

      <!-- Custom Column Formatters -->
      <template #item.Nomor="{ item }">
        <v-chip
          :color="getStatusColor(item.Ngedit)"
          size="x-small"
          label
          class="font-weight-bold"
        >
          {{ item.Nomor }}
        </v-chip>
      </template>

      <template #item.Tanggal="{ item }">
        {{ formatTglManual(item.Tanggal) }}
      </template>

      <!-- Sub-Grid Expanded Row Details -->
      <template #expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="pa-3 bg-grey-lighten-4">
            <div
              v-if="loadingDetails.has(item.Nomor)"
              class="text-center pa-2"
            >
              <v-progress-circular
                indeterminate
                size="20"
                color="primary"
                class="mr-2"
              />
              <span class="text-caption">Memuat detail...</span>
            </div>

            <div
              v-else-if="
                !details[item.Nomor] || details[item.Nomor].length === 0
              "
              class="text-center pa-2 text-caption text-grey"
            >
              Tidak ada detail rincian untuk STBJ Nomor {{ item.Nomor }}
            </div>

            <v-data-table
              v-else
              :headers="detailHeaders"
              :items="details[item.Nomor]"
              density="compact"
              class="bg-white border rounded"
              :items-per-page="-1"
              hide-default-footer
            >
              <template #[`item.Jumlah`]="{ item: d }">
                <div class="text-right">
                  {{ Number(d.Jumlah || 0).toLocaleString() }}
                </div>
              </template>
            </v-data-table>
          </td>
        </tr>
      </template>
    </BaseBrowse>

    <GudangLookup
      :is-visible="isLookupVisible"
      mode="jadi"
      @close="isLookupVisible = false"
      @select="onGudangSelected"
    />
  </div>
</template>

<style scoped>
.stbj-browse-wrapper {
  width: 100%;
}
.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
.color-indicator {
  width: 10px;
  height: 10px;
  display: inline-block;
}
.bg-error {
  background-color: #ff5252 !important;
}
</style>
