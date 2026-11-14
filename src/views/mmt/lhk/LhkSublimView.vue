<template>
  <BaseBrowse
    title="Browse Hasil Kerja Sublim RTR"
    menu-id="mmt-lhk-sublim"
    icon="mdi-table-clock"
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
    item-value="nomor"
    has-print
    show-expand
    :summary-fields="['total_meter']"
    @refresh="fetchMasterData"
    @add="handleNewEdit('new')"
    @edit="handleEditClick"
    @delete="handleDelete"
    @print="handlePrint"
    @row-click="handleRowClick"
  >
    <!-- Tombol Ekstra (Export Excel) -->
    <template #extra-actions>
      <v-btn
        size="x-small"
        color="success"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
        :loading="loading.headers"
      >
        <v-icon start size="14">mdi-file-excel</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Custom Template Kolom Tabel Utama -->
    <template #item.Tanggal="{ item }">
      {{ item.Tanggal }}
    </template>

    <template #item.total_meter="{ item }">
      <span class="font-weight-bold">
        {{ Number(item.total_meter || 0).toFixed(2) }} m²
      </span>
    </template>

    <!-- Slot Detail Expansion Row -->
    <template #expanded-content="{ item }">
      <div class="detail-container">
        <div class="detail-table-wrapper">
          <div v-if="loadingDetails.has(item.nomor)" class="text-center pa-4">
            <v-progress-circular indeterminate size="20" color="primary" />
            <span class="ml-2 text-caption">Memuat data...</span>
          </div>

          <v-data-table
            v-else-if="details[item.nomor] && details[item.nomor].length"
            :headers="detailHeaders"
            :items="details[item.nomor]"
            density="compact"
            hide-default-footer
            class="detail-table border"
            :items-per-page="-1"
          >
            <template #item.Jumlah_meter="{ value }">
              <span class="font-weight-bold text-blue-darken-2">
                {{ Number(value || 0).toFixed(2) }} m²
              </span>
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
import { format, subDays } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import api from "@/services/api";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();
const API_BASE_URL = "/mmt/lhk-sublim";

const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = ref({ headers: false });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
});

const masterHeaders = [
  { title: "Nomor", key: "nomor", width: "180px", minWidth: "180px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", minWidth: "120px" },
  { title: "Gudang", key: "Gudang", width: "100px", minWidth: "100px" },
  {
    title: "Nama Gudang",
    key: "Nama_Gudang",
    width: "250px",
    minWidth: "250px",
  },
  {
    title: "Total (m²)",
    key: "total_meter",
    align: "end" as const,
    width: "120px",
    minWidth: "120px",
  },
];

const detailHeaders = [
  { title: "No. Urut", key: "No_Urut", width: "80px" },
  { title: "PO Internal", key: "No_PO_Internal", width: "170px" },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "170px" },
  { title: "No. LHK Paperprint", key: "Lhk_Paperprint", width: "170px" },
  { title: "Nama SPK", key: "Nama_SPK", width: "250px" },
  { title: "P", key: "Panjang", align: "end" as const },
  { title: "L", key: "Lebar", align: "end" as const },
  { title: "Jumlah", key: "Jumlah", align: "end" as const },
  { title: "Total (m²)", key: "Jumlah_meter", align: "end" as const },
  { title: "Size", key: "Size", align: "center" as const },
];

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedNomor = computed(() => selected.value[0]?.nomor || null);

const fetchMasterData = async () => {
  loading.value.headers = true;
  try {
    const res = await api.get(API_BASE_URL, { params: filters });
    masterData.value = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (e) {
    toast.error("Gagal memuat data RTR");
    console.error(e);
  } finally {
    loading.value.headers = false;
  }
};

const loadDetails = async (expandedKeys: any[]) => {
  if (expandedKeys.length === 0) return;
  const lastExpanded = expandedKeys[expandedKeys.length - 1];
  const nomor =
    typeof lastExpanded === "object" ? lastExpanded.nomor : lastExpanded;

  if (nomor && !details.value[nomor]) {
    loadingDetails.value.add(nomor);
    try {
      const response = await api.get(`${API_BASE_URL}/detail/${nomor}`);
      details.value[nomor] = response.data?.data || response.data || [];
    } catch (error) {
      toast.error("Gagal memuat detail");
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

const handleRowClick = (_event: any, row: any) => {
  const item = row.item;
  const isSelected = selected.value.some((s) => s.nomor === item.nomor);
  selected.value = isSelected ? [] : [item];
};

const handleNewEdit = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push("/mmt/lhk/sublim/new");
  } else {
    router.push(`/mmt/lhk/sublim/edit/${selectedNomor.value}`);
  }
};

const handleEditClick = () => handleNewEdit("edit");

const handleDelete = async () => {
  const nom = selectedNomor.value;
  if (!nom || !confirm(`Yakin ingin hapus nomor ${nom}?`)) return;
  try {
    await api.delete(`${API_BASE_URL}/${nom}`);
    toast.success("Berhasil dihapus.");
    fetchMasterData();
  } catch (e) {
    toast.error("Gagal menghapus data.");
  }
};

const handlePrint = () => {
  if (!selectedNomor.value) return;
  toast.info(`Mencetak Slip: ${selectedNomor.value}`);
};

// --- Export Logic ---
const exportToExcel = async () => {
  loading.value.headers = true;
  try {
    for (const header of masterData.value) {
      if (
        !details.value[header.nomor] ||
        details.value[header.nomor].length === 0
      ) {
        try {
          const response = await api.get(
            `${API_BASE_URL}/detail/${header.nomor}`,
          );
          details.value[header.nomor] =
            response.data?.data || response.data || [];
        } catch (e) {
          console.error(`Gagal pre-fetch detail RTR nomor ${header.nomor}:`, e);
          details.value[header.nomor] = [];
        }
      }
    }

    const fileName = `LHK_RTR_MMT_${filters.startDate}_to_${filters.endDate}.xlsx`;

    const num = (value: any) => {
      const parsed = Number(value);
      return isNaN(parsed) ? 0 : parsed;
    };

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

    const styleFooter = {
      ...styleDataCell,
      fill: { fgColor: { rgb: "F0F4F8" } },
      font: { bold: true, sz: 10 },
    };

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

    const worksheetData: any[] = [];
    worksheetData.push([
      { v: "LAPORAN HASIL KERJA RTR MMT", s: { font: { bold: true, sz: 14 } } },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${formatTglManual(filters.startDate)} s/d ${formatTglManual(filters.endDate)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headersTable = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "KODE GUDANG", s: styleHeaderMain },
      { v: "NAMA GUDANG", s: styleHeaderMain },
      { v: "TOTAL (M²)", s: styleHeaderMain },
      { v: "NO URUT", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "PANJANG (P)", s: styleHeaderMain },
      { v: "LEBAR (L)", s: styleHeaderMain },
      { v: "JUMLAH", s: styleHeaderMain },
      { v: "TOTAL DETAIL (M²)", s: styleHeaderMain },
      { v: "SIZE", s: styleHeaderMain },
      { v: "PO INTERNAL", s: styleHeaderMain },
    ];
    worksheetData.push(headersTable);

    let grandTotalM2Master = 0;
    let grandTotalJumlahDetail = 0;
    let grandTotalM2Detail = 0;

    masterData.value.forEach((header) => {
      const targetDetails = details.value[header.nomor] || [];
      const tglHeader = formatTglManual(header.Tanggal || "");

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const isFirstRow = index === 0;
          const valJumlah = num(dtl.Jumlah);
          const valM2Detail = num(dtl.Jumlah_meter);

          grandTotalM2Master += isFirstRow ? num(header.total_meter) : 0;
          grandTotalJumlahDetail += valJumlah;
          grandTotalM2Detail += valM2Detail;

          worksheetData.push([
            { v: isFirstRow ? header.nomor : "-", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Gudang || "-" : "-",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.Nama_Gudang || "-" : "-",
              s: styleDataCell,
            },
            isFirstRow
              ? {
                  v: num(header.total_meter),
                  t: "n",
                  z: "#,##0.00",
                  s: styleDataCellRight,
                }
              : { v: "-", s: styleDataCellCenter },
            { v: dtl.No_Urut || index + 1, s: styleDataCellCenter },
            { v: dtl.Nomor_SPK || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || "-", s: styleDataCell },
            {
              v: dtl.Panjang !== undefined ? num(dtl.Panjang) : 0,
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            {
              v: dtl.Lebar !== undefined ? num(dtl.Lebar) : 0,
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            { v: valJumlah, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: valM2Detail, t: "n", z: "#,##0.00", s: styleDataCellRight },
            { v: dtl.Size || "-", s: styleDataCellCenter },
            { v: dtl.No_PO_Internal || "-", s: styleDataCellCenter },
          ]);
        });
      } else {
        grandTotalM2Master += num(header.total_meter);
        worksheetData.push([
          { v: header.nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.Gudang || "-", s: styleDataCellCenter },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          {
            v: num(header.total_meter),
            t: "n",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail pekerjaan", s: styleDataCell },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
        ]);
      }
    });

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
      {
        v: grandTotalM2Master,
        t: "n",
        z: "#,##0.00",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(5).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalJumlahDetail,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      {
        v: grandTotalM2Detail,
        t: "n",
        z: "#,##0.00",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      { v: "", s: styleFooter },
      { v: "", s: styleFooter },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 3 },
      },
    ];

    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 8 },
      { wch: 18 },
      { wch: 35 },
      { wch: 11 },
      { wch: 11 },
      { wch: 11 },
      { wch: 15 },
      { wch: 10 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_RTR");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel RTR berhasil diunduh dan rapi!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.value.headers = false;
  }
};

onMounted(fetchMasterData);
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
  font-size: 0.8rem !important;
  width: auto !important;
}
</style>
