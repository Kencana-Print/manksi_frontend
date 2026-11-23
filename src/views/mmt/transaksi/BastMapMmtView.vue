<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, parseISO, isValid, subDays } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";
import api from "@/services/api";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const toast = useToast();
const menuId = "5521";
const API_BAST = "/mmt/bast-map";

// --- State Management ---
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const isLoading = ref(false);
const loadingDetails = ref(new Set<string>());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));
const search = ref("");
const onProgress = ref(false);
const cabangFilter = ref(""); // P01/P02/P04/P05
const workshopFilter = ref(""); // MMT
const sublimFilter = ref(""); // Y/Tidak

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedNomor = computed(() =>
  isSingleSelected.value ? selected.value[0].Nomor : null,
);

// --- Headers Master & Detail ---
const headers = computed(() => [
  {
    title: "Detail",
    key: "data-table-expand",
    minWidth: "60px",
    align: "center" as const,
    fixed: true,
  },
  {
    title: "Status BAST",
    key: "CetakBAST",
    minWidth: "110px",
    align: "center" as const,
    fixed: true,
  },
  { title: "Nomor", key: "Nomor", minWidth: "160px", fixed: true },
  { title: "Cabang", key: "Cabang", minWidth: "80px", align: "center" as const },
  { title: "Workshop", key: "Workshop", minWidth: "110px" },
  { title: "Sublim", key: "Sublim", minWidth: "80px", align: "center" as const },
  { title: "Divisi", key: "Divisi", minWidth: "100px" },
  { title: "Tipe", key: "Tipe", minWidth: "80px" },
  { title: "Tanggal", key: "Tanggal", minWidth: "110px" },
  { title: "Nama Pekerjaan", key: "NamaPekerjaan", minWidth: "250px" },
  { title: "Nama Ext", key: "NamaExt", minWidth: "250px" },
  { title: "Ukuran", key: "Ukuran", minWidth: "150px" },
  { title: "Gramasi", key: "Gramasi", minWidth: "130px" },
  { title: "Gramasi Aktual", key: "GramasiSetting_Aktual", minWidth: "150px" },
  { title: "Kain", key: "Kain", minWidth: "180px" },
  { title: "Finishing", key: "Finishing", minWidth: "150px" },
  { title: "Jumlah", key: "Jumlah", minWidth: "80px", align: "end" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Kendala", key: "kendalaProduksi", minWidth: "200px" },
]);

const detailHeaders = [
  { title: "Jenis Rincian", key: "JenisDetail", minWidth: "120px" },
  { title: "Kode Bahan", key: "KodeBahan", minWidth: "130px" },
  { title: "Nama Bahan", key: "NamaBahan", minWidth: "220px" },
  {
    title: "Satuan",
    key: "Satuan",
    minWidth: "80px",
    align: "center" as const,
  },
  { title: "Qty", key: "Qty", minWidth: "100px", align: "end" as const },
];

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) return format(parsedDate, "dd/MM/yyyy");
    return "";
  } catch {
    return "";
  }
};

// --- Data Fetching ---
const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const res = await api.get(`${API_BAST}/`, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        onProgress: onProgress.value,
        search: search.value,
        cabang: cabangFilter.value,
        workshop: workshopFilter.value,
        sublim: sublimFilter.value,
      },
    });
    masterData.value = res.data.data || res.data || [];
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengambil data BAST.");
  } finally {
    isLoading.value = false;
  }
};

// --- Expand Detail Loader ---
const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const nomor = typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!nomor || details.value[nomor]) return;

  loadingDetails.value.add(nomor);
  try {
    const res = await api.get(`${API_BAST}/detail`, {
      params: { nomor },
    });
    details.value[nomor] = res.data.data || res.data || [];
  } catch (error) {
    details.value[nomor] = [];
  } finally {
    loadingDetails.value.delete(nomor);
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

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

const getRowTextColor = (item: any) => {
  const row = item?.raw || item;
  if (row.OnProgres === "N") return "text-error font-weight-medium";
  if (row.OnProgres === "Y") return "text-blue-darken-2";
  return "";
};

// --- Aksi Navigasi ---
const handleNewEdit = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push({ name: "BastMmtNew" });
  } else if (selectedNomor.value) {
    router.push({
      name: "BastMmtEdit",
      params: { nomor: selectedNomor.value },
    });
  }
};

const handleDelete = async () => {
  if (!selectedNomor.value) {
    toast.warning("Pilih BAST MMT yang akan dihapus.");
    return;
  }
  if (!confirm(`Yakin hapus BAST untuk Nomor ${selectedNomor.value}?`)) return;

  isLoading.value = true;
  try {
    await api.delete(`${API_BAST}/${encodeURIComponent(selectedNomor.value)}`);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  } finally {
    isLoading.value = false;
  }
};

const cetak = () => {
  if (!selectedNomor.value) {
    toast.warning("Pilih BAST MMT yang akan dicetak.");
    return;
  }
  // Buka print view frontend (pola SpkView.handlePrint) agar memakai
  // baseURL + token axios — window.open relatif ke API backend rusak.
  const url = router.resolve({
    name: "BastMmtPrint",
    params: { nomor: selectedNomor.value },
  }).href;
  window.open(url, "_blank");
};

// --- Export Header & Detail ---
const isExportingHeader = ref(false);
const onExportHeader = async () => {
  if (!masterData.value.length)
    return toast.warning("Tidak ada data untuk diexport.");
  isExportingHeader.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Tipe", key: "Tipe", width: 10, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Status BAST", key: "CetakBAST", width: 14, align: "center" },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 30 },
      { header: "Nama Ext", key: "NamaExt", width: 30 },
      { header: "Ukuran", key: "Ukuran", width: 16 },
      { header: "Gramasi", key: "Gramasi", width: 14 },
      { header: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: 16 },
      { header: "Kain", key: "Kain", width: 22 },
      { header: "Finishing", key: "Finishing", width: 20 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 24 },
      { header: "Kendala", key: "kendalaProduksi", width: 24 },
    ];

    const formattedData = masterData.value.map((item) => ({
      ...item,
      Tanggal: safeFormatDate(item.Tanggal),
    }));

    await exportExcelSingle(
      `BAST_Header_${startDate.value}_to_${endDate.value}.xlsx`,
      "Data BAST",
      columns,
      formattedData,
      `LAPORAN BAST MMT (HEADER) | Periode: ${safeFormatDate(startDate.value)} s.d ${safeFormatDate(endDate.value)}`,
    );
    toast.success("Berhasil export header BAST.");
  } catch {
    toast.error("Gagal export header.");
  } finally {
    isExportingHeader.value = false;
  }
};

const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await api.get(`${API_BAST}/export-detail`, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        onProgress: onProgress.value,
        search: search.value,
      },
    });

    const allData: any[] = res.data.data || res.data || [];
    if (!allData.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }

    const combinedRows: any[] = [];
    allData.forEach((master) => {
      const masterCells = {
        Nomor: master.Nomor,
        Divisi: master.Divisi,
        Tipe: master.Tipe,
        Tanggal: safeFormatDate(master.Tanggal),
        CetakBAST: master.CetakBAST,
        NamaPekerjaan: master.NamaPekerjaan,
        NamaExt: master.NamaExt,
        Ukuran: master.Ukuran,
        Gramasi: master.Gramasi,
        GramasiSetting_Aktual: master.GramasiSetting_Aktual,
        Kain: master.Kain,
        Finishing: master.Finishing,
        Jumlah: Number(master.Jumlah) || 0,
        Keterangan: master.Keterangan,
        kendalaProduksi: master.kendalaProduksi,
      };

      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (master.details && master.details.length > 0) {
        master.details.forEach((dtl: any, idx: number) => {
          combinedRows.push({
            ...(idx === 0 ? masterCells : blankMaster),
            JenisDetail: dtl.Jenis,
            KodeBahan: dtl.Kode,
            NamaBahan: dtl.Nama,
            Satuan: dtl.Satuan,
            Qty: Number(dtl.Qty) || 0,
          });
        });
      } else {
        combinedRows.push({
          ...masterCells,
          JenisDetail: "",
          KodeBahan: "",
          NamaBahan: "",
          Satuan: "",
          Qty: "",
        });
      }
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Tipe", key: "Tipe", width: 10, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Status BAST", key: "CetakBAST", width: 12, align: "center" },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 26 },
      { header: "Nama Ext", key: "NamaExt", width: 26 },
      { header: "Ukuran", key: "Ukuran", width: 14 },
      { header: "Gramasi", key: "Gramasi", width: 12 },
      { header: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: 14 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Finishing", key: "Finishing", width: 18 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jenis Rincian",
        key: "JenisDetail",
        width: 14,
        align: "center",
      },
      { header: "Kode Bahan", key: "KodeBahan", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 26 },
      { header: "Sat", key: "Satuan", width: 8, align: "center" },
      {
        header: "Qty",
        key: "Qty",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];

    await exportExcelSingle(
      `BAST_Detail_${startDate.value}_to_${endDate.value}.xlsx`,
      "Detail BAST",
      columns,
      combinedRows,
      `RINCIAN BAST MMT | Periode: ${safeFormatDate(startDate.value)} s.d ${safeFormatDate(endDate.value)}`,
    );
    toast.success("Berhasil export detail BAST.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// --- Watcher reaktif otomatis untuk filter ---
watch(
  [startDate, endDate, onProgress, search, cabangFilter, workshopFilter, sublimFilter],
  fetchData,
);

onMounted(fetchData);
</script>

<template>
  <div class="bast-browse-wrapper">
    <BaseBrowse
      title="Cetak BAST MMT"
      :menu-id="menuId"
      :icon="IconPrinter"
      :headers="headers"
      :items="masterData"
      item-value="Nomor"
      :can-insert="true"
      :can-edit="true"
      :can-delete="true"
      :is-loading="isLoading"
      height="500px"
      fixed-header
      v-model:selected="selected"
      v-model:startDate="startDate"
      v-model:endDate="endDate"
      v-model:expanded="expanded"
      has-print
      @refresh="fetchData"
      @add="handleNewEdit('new')"
      @edit="handleNewEdit('edit')"
      @delete="handleDelete"
      @print="cetak"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
      @update:expanded="handleExpandUpdate(expanded)"
    >
      <!-- Keterangan Warna Status di atas tabel -->
      <template #prepend-content>
        <div
          class="d-flex align-center px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption"
        >
          <span class="font-weight-bold mr-4">Keterangan Status:</span>
          <span class="d-flex align-center mr-4">
            <span class="color-indicator bg-error rounded-circle mr-1"></span>
            Merah = On Progress
          </span>
          <span class="d-flex align-center">
            <span
              class="color-indicator bg-blue-darken-2 rounded-circle mr-1"
            ></span>
            Biru = Sudah Approval
          </span>
          <span class="d-flex align-center ml-4">
            <span class="font-weight-bold mr-1">Filter otomatis (spt SO SPK):</span>
            login P05 = Cabang P05 / Workshop MMT / Sublim Y; login divisi 5
            (MMT) = Divisi MMT / Sublim Y
          </span>
        </div>
      </template>

      <!-- Filter Fields di Toolbar (Pencarian & Checkbox OnProgress) -->
      <template #filter-fields>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Cari Nomor / Pekerjaan"
          density="compact"
          hide-details
          variant="outlined"
          clearable
          style="max-width: 250px"
          @keyup.enter="fetchData"
        />
        <v-select
          v-model="cabangFilter"
          :items="['ALL', 'P01', 'P02', 'P04', 'P05']"
          label="Cabang"
          density="compact"
          hide-details
          variant="outlined"
          class="mx-1"
          style="max-width: 130px"
        />
        <v-select
          v-model="workshopFilter"
          :items="['ALL', 'MMT']"
          label="Workshop"
          density="compact"
          hide-details
          variant="outlined"
          class="mx-1"
          style="max-width: 130px"
        />
        <v-select
          v-model="sublimFilter"
          :items="['ALL', 'Y', 'TIDAK']"
          label="Sublim"
          density="compact"
          hide-details
          variant="outlined"
          class="mx-1"
          style="max-width: 130px"
        />
      </template>

      <template #filter-left>
        <v-checkbox
          v-model="onProgress"
          label="Tampilkan saja BAST MMT On Progress"
          density="compact"
          hide-details
          class="cust-cb"
        ></v-checkbox>
      </template>

      <!-- Tombol Aksi Tambahan -->
      <template #extra-actions="{ isSingleSelected }">
        <v-btn
          size="small"
          variant="flat"
          color="blue-grey"
          class="mr-2"
          :disabled="!isSingleSelected"
          @click="cetak"
        >
          <template #prepend>
            <IconPrinter :size="15" :stroke-width="1.7" />
          </template>
          Cetak
        </v-btn>
        <v-btn
          size="small"
          variant="flat"
          color="green-darken-1"
          :loading="isExportingDetail"
          @click="onExportDetail"
        >
          <template #prepend>
            <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
          </template>
          Export Detail
        </v-btn>
      </template>

      <!-- Custom Column Formatters -->
      <template #item.Nomor="{ item }">
        <span :class="getRowTextColor(item)">{{ item.Nomor }}</span>
      </template>

      <template #item.Tanggal="{ item }">
        {{ safeFormatDate(item.Tanggal) }}
      </template>

      <template #item.CetakBAST="{ item }">
        <v-chip
          v-if="item.CetakBAST"
          color="success"
          size="x-small"
          label
          class="font-weight-bold"
        >
          SUDAH
        </v-chip>
      </template>

      <!-- Sub-Grid Expanded Row Details -->
      <template #expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="pa-3 bg-grey-lighten-4">
            <div v-if="isLoadingDetails(item.Nomor)" class="text-center pa-2">
              <v-progress-circular
                indeterminate
                size="20"
                color="primary"
                class="mr-2"
              />
              <span class="text-caption">Memuat detail komponen & obat...</span>
            </div>

            <div
              v-else-if="
                !details[item.Nomor] || details[item.Nomor].length === 0
              "
              class="text-center pa-2 text-caption text-grey"
            >
              Tidak ada detail rincian untuk BAST Nomor {{ item.Nomor }}
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
              <template #item.Qty="{ item: d }">
                <div class="text-right">
                  {{ Number(d.Qty || 0).toLocaleString() }}
                </div>
              </template>
            </v-data-table>
          </td>
        </tr>
      </template>
    </BaseBrowse>
  </div>
</template>

<style scoped>
.bast-browse-wrapper {
  width: 100%;
}
.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.filter-sep {
  font-size: 12px;
  color: #666;
}
.color-indicator {
  width: 10px;
  height: 10px;
  display: inline-block;
}
.bg-error {
  background-color: #ff5252 !important;
}
.text-error {
  color: #ff5252 !important;
}
.cust-cb :deep(.v-label) {
  font-size: 11px !important;
  font-weight: 600;
  opacity: 1;
  color: #333;
}
.cust-cb :deep(.v-selection-control) {
  min-height: unset;
}
</style>
