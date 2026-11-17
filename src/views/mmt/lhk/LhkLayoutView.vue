<template>
  <BaseBrowse
    title="LHK Layout MMT"
    menu-id="5515"
    icon="mdi-shape-outline"
    :headers="masterHeaders"
    :items="masterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :is-loading="loading.headers"
    :loading="loading.headers"
    v-model:selected="selected"
    v-model:expanded="expanded"
    v-model:startDate="filters.startDate"
    v-model:endDate="filters.endDate"
    item-value="Nomor"
    show-expand
    :summary-columns="summaryColumns"
    :summary-formatters="summaryFormatters"
    @refresh="fetchMasterData"
    @add="handleNewEdit('new')"
    @edit="handleEditClick"
    @delete="handleDelete"
    @row-click="handleRowClick"
  >
    <!-- Filter Tambahan di Toolbar -->
    <template #filter-fields>
      <v-text-field
        v-model="filters.search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Cari Nomor LHK / SPK..."
        density="compact"
        hide-details
        variant="outlined"
        clearable
        style="width: 220px"
        @keyup.enter="fetchMasterData"
      />
    </template>

    <!-- Tombol Ekstra (Export Excel) -->
    <template #extra-actions>
      <v-btn
        size="x-small"
        color="success"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
        :loading="loading.headers"
      >
        <v-icon start size="14">mdi-file-excel</v-icon> Export Detail
      </v-btn>
    </template>

    <!-- Custom Template Kolom Tabel Utama -->
    <template #item.Tanggal="{ item }">
      {{ safeFormatDate(item.Tanggal) }}
    </template>

    <template #item.TotalPola="{ item }">
      <span class="font-weight-bold">
        {{ num(item.TotalPola ?? item.TotalLayout) }} pcs
      </span>
    </template>

    <!-- Slot Detail Expansion Row -->
    <template #expanded-content="{ item }">
      <div class="detail-container">
        <div class="detail-table-wrapper">
          <div
            v-if="isLoadingDetails(item.Nomor)"
            class="text-center pa-4"
          >
            <v-progress-circular indeterminate size="20" color="primary" />
            <span class="ml-2 text-caption">Memuat data...</span>
          </div>

          <v-data-table
            v-else-if="details[item.Nomor] && details[item.Nomor].length"
            :headers="detailHeaders"
            :items="details[item.Nomor]"
            density="compact"
            hide-default-footer
            class="detail-table border"
            :items-per-page="-1"
          >
            <template #item.panjang="{ value }">
              {{ num(value).toFixed(2) }} m
            </template>
            <template #item.lebar="{ value }">
              {{ num(value).toFixed(2) }} m
            </template>
            <template #item.jml_pola="{ item }">
              <strong class="total-bold">
                {{ num(item.jml_pola ?? item.jml_layout) }}
              </strong>
            </template>
          </v-data-table>

          <div v-else class="text-center pa-4 text-caption text-grey">
            Data detail tidak ditemukan atau gagal dimuat.
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, subDays, parseISO, isValid } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import api from "@/services/api";
import * as XLSX from "xlsx";

interface LhkLayoutHeader {
  Nomor: string;
  Tanggal?: string;
  Shift?: string;
  Operator?: string;
  NomorSPK?: string;
  NamaOrder?: string;
  TotalPola?: number;
  TotalLayout?: number;
  Keterangan?: string;
}

interface LhkLayoutDetail {
  nomor_spk?: string;
  nama_spk?: string;
  jenis_pola?: string;
  panjang?: number;
  lebar?: number;
  jml_pola?: number;
  jml_layout?: number;
  keterangan?: string;
}

const API_BASE_URL = "/mmt/lhk-layout";
const router = useRouter();
const toast = useToast();

const masterData = ref<LhkLayoutHeader[]>([]);
const details = ref<Record<string, LhkLayoutDetail[]>>({});
const loading = ref({ headers: false, details: false });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<LhkLayoutHeader[]>([]);
const expanded = ref<any[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
});

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedRow = computed(() =>
  isSingleSelected.value ? selected.value[0] : null,
);

const num = (val: any) => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

const handleNewEdit = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push({ name: "LhkLayoutCreate" });
  } else if (mode === "edit" && selectedRow.value) {
    router.push({
      name: "LhkLayoutEdit",
      params: { nomor: selectedRow.value.Nomor },
    });
  }
};

const handleEditClick = () => handleNewEdit("edit");

const handleRowClick = (_event: any, row: any) => {
  const item = row.item || row;
  selected.value = [item];
};

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const parsed = parseISO(dateString);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : dateString;
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

const masterHeaders = [
  { title: "Nomor LHK", key: "Nomor", width: "200px", minWidth: "200px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", minWidth: "120px" },
  { title: "Shift", key: "Shift", width: "80px", minWidth: "80px" },
  { title: "Operator Pola", key: "Operator", width: "160px", minWidth: "160px" },
  { title: "Nomor SPK", key: "NomorSPK", width: "180px", minWidth: "180px" },
  { title: "Nama Order", key: "NamaOrder", width: "250px", minWidth: "250px" },
  {
    title: "Total Pola",
    key: "TotalPola",
    align: "end" as const,
    width: "120px",
    minWidth: "120px",
  },
  { title: "Keterangan", key: "Keterangan", width: "200px", minWidth: "200px" },
];

const summaryColumns = ["TotalPola"];

const summaryFormatters = {
  Nomor: () => "TOTAL :",
  TotalPola: (items: any[]) =>
    `${num(
      items.reduce(
        (sum, item) =>
          sum + (Number(item.TotalPola ?? item.TotalLayout) || 0),
        0,
      ),
    )} pcs`,
};

const detailHeaders = [
  { title: "Nomor SPK", key: "nomor_spk", width: "150px" },
  { title: "Nama SPK / Komponen", key: "nama_spk", width: "250px" },
  { title: "Jenis Pola", key: "jenis_pola", width: "140px" },
  { title: "Pjg (m)", key: "panjang", align: "end" as const, width: "90px" },
  { title: "Lbr (m)", key: "lebar", align: "end" as const, width: "90px" },
  {
    title: "Jml Pola (Pcs)",
    key: "jml_pola",
    align: "end" as const,
    width: "120px",
  },
  { title: "Keterangan Detail", key: "keterangan", width: "200px" },
];

const fetchMasterData = async () => {
  loading.value.headers = true;
  try {
    const res = await api.get(API_BASE_URL, {
      params: filters,
    });
    masterData.value = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];
    selected.value = [];
    expanded.value = [];
  } catch {
    toast.error("Gagal mengambil data LHK Layout.");
  } finally {
    loading.value.headers = false;
  }
};

const loadDetails = async (expandedKeys: any[]) => {
  if (!expandedKeys || expandedKeys.length === 0) return;
  const lastExpanded = expandedKeys[expandedKeys.length - 1];
  const nomor =
    typeof lastExpanded === "object" ? lastExpanded.Nomor : lastExpanded;

  if (nomor && !details.value[nomor] && !loadingDetails.value.has(nomor)) {
    loadingDetails.value.add(nomor);
    try {
      const res = await api.get(`${API_BASE_URL}/details`, {
        params: { nomor },
      });
      details.value[nomor] = res.data.details || res.data || [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
      details.value[nomor] = [];
    } finally {
      loadingDetails.value.delete(nomor);
    }
  }
};

watch(
  expanded,
  (newVal) => {
    loadDetails(newVal);
  },
  { deep: true },
);

const handleDelete = async (row?: any) => {
  const item = row || selectedRow.value;
  if (
    !item ||
    !confirm(`Hapus LHK Pola nomor ${item.Nomor}?`)
  )
    return;
  try {
    await api.delete(`${API_BASE_URL}/${item.Nomor}`);
    toast.success("Data berhasil dihapus.");
    fetchMasterData();
  } catch {
    toast.error("Gagal menghapus data.");
  }
};

const exportToExcel = async () => {
  loading.value.headers = true;
  try {
    for (const h of masterData.value) {
      if (!details.value[h.Nomor] || details.value[h.Nomor].length === 0) {
        const res = await api.get(`${API_BASE_URL}/details`, {
          params: { nomor: h.Nomor },
        });
        details.value[h.Nomor] = res.data.details || res.data || [];
      }
    }

    const styleHeaderMain = {
      fill: { fgColor: { rgb: "C8E6C9" } },
      font: { bold: true, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const styleData = {
      font: { sz: 10 },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
      alignment: { vertical: "center" },
    };

    const styleDataCenter = {
      ...styleData,
      alignment: { horizontal: "center", vertical: "center" },
    };
    const styleDataRight = {
      ...styleData,
      alignment: { horizontal: "right", vertical: "center" },
    };
    const styleFooter = {
      ...styleData,
      fill: { fgColor: { rgb: "F5F5F5" } },
      font: { bold: true, sz: 10 },
    };

    const worksheetData: any[] = [
      [
        {
          v: "LAPORAN HASIL KERJA (LHK) LAYOUT MMT",
          s: { font: { bold: true, sz: 14 } },
        },
      ],
      [
        {
          v: `Periode: ${filters.startDate} s.d ${filters.endDate}`,
          s: { font: { sz: 10 } },
        },
      ],
      [],
      [
        { v: "NOMOR LHK", s: styleHeaderMain },
        { v: "TANGGAL", s: styleHeaderMain },
        { v: "SHIFT", s: styleHeaderMain },
        { v: "OPERATOR", s: styleHeaderMain },
        { v: "NOMOR SPK", s: styleHeaderMain },
        { v: "NAMA SPK / ITEM", s: styleHeaderMain },
        { v: "JENIS LAYOUT", s: styleHeaderMain },
        { v: "PANJANG", s: styleHeaderMain },
        { v: "LEBAR", s: styleHeaderMain },
        { v: "QTY LAYOUT", s: styleHeaderMain },
      ],
    ];

    let grandTotalLayout = 0;

    masterData.value.forEach((h) => {
      const targetDetails = details.value[h.Nomor] || [];
      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, idx) => {
          const isFirst = idx === 0;
          const qLayout = num(dtl.jml_pola ?? dtl.jml_layout);
          grandTotalLayout += qLayout;

          worksheetData.push([
            { v: isFirst ? h.Nomor : "-", s: styleDataCenter },
            {
              v: isFirst ? safeFormatDate(h.Tanggal) : "-",
              s: styleDataCenter,
            },
            { v: isFirst ? h.Shift || "-" : "-", s: styleDataCenter },
            { v: isFirst ? h.Operator || "-" : "-", s: styleData },
            { v: dtl.nomor_spk || h.NomorSPK || "-", s: styleDataCenter },
            { v: dtl.nama_spk || h.NamaOrder || "-", s: styleData },
            { v: dtl.jenis_pola || "-", s: styleDataCenter },
            { v: num(dtl.panjang), t: "n", z: "#,##0.00", s: styleDataRight },
            { v: num(dtl.lebar), t: "n", z: "#,##0.00", s: styleDataRight },
            { v: qLayout, t: "n", z: "#,##0", s: styleDataRight },
          ]);
        });
      }
    });

    const totalRow = [
      {
        v: "GRAND TOTAL",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(8).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalLayout,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
    ];
    worksheetData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 8 },
      },
    ];
    ws["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Layout");
    XLSX.writeFile(
      wb,
      `LHK_Layout_${filters.startDate}_to_${filters.endDate}.xlsx`,
    );
    toast.success("Excel Berhasil Diexport!");
  } catch {
    toast.error("Gagal export excel.");
  } finally {
    loading.value.headers = false;
  }
};

onMounted(fetchMasterData);
watch([() => filters.startDate, () => filters.endDate], fetchMasterData);
</script>

<style scoped>
:deep(.detail-container),
.detail-container {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  padding: 6px 0 !important;
  background-color: transparent !important;
  border-top: none !important;
  width: 100% !important;
}
:deep(.detail-table-wrapper),
.detail-table-wrapper {
  padding: 0 !important;
  width: auto !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}
:deep(.detail-table),
.detail-table {
  background-color: white !important;
  font-size: 11px !important;
  width: auto !important;
}
:deep(.detail-table th),
:deep(.detail-table td) {
  font-size: 11px !important;
  white-space: nowrap;
  padding: 0 8px !important;
}
:deep(.detail-table thead tr) {
  background-color: #f5f5f5 !important;
}
:deep(.detail-table thead th) {
  font-weight: 700 !important;
  color: #333 !important;
}
.total-bold {
  font-weight: 700;
}
</style>
