<template>
  <PageLayout title="LHK Layout MMT" icon="mdi-shape-outline">
    <template #header-actions>
      <v-btn size="x-small" color="success" @click="handleNewEdit('new')">
        <v-icon start>mdi-plus</v-icon> Baru
      </v-btn>
      <v-btn
        size="x-small"
        color="warning"
        :disabled="!isSingleSelected"
        @click="handleEditClick"
      >
        <v-icon start>mdi-pencil</v-icon> Ubah
      </v-btn>
      <v-btn
        size="x-small"
        color="error"
        :disabled="!isSingleSelected"
        @click="handleDelete"
      >
        <v-icon start>mdi-trash-can</v-icon> Hapus
      </v-btn>

      <v-divider vertical class="mx-2" />

      <v-btn
        size="x-small"
        color="info"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
      >
        <v-icon start>mdi-download</v-icon> Export Detail
      </v-btn>
    </template>

    <div class="browse-content">
      <v-card flat class="mb-4">
        <v-card-text>
          <div class="filter-section d-flex align-center flex-wrap ga-4">
            <DateRangeFilter
              v-model:start-date="filters.startDate"
              v-model:end-date="filters.endDate"
            />

            <v-text-field
              v-model="filters.search"
              prepend-inner-icon="mdi-magnify"
              label="Cari Nomor LHK / SPK"
              density="compact"
              hide-details
              variant="outlined"
              clearable
              style="max-width: 300px"
              @keyup.enter="fetchMasterData"
            />

            <v-btn variant="text" size="x-small" @click="fetchMasterData">
              <v-icon>mdi-refresh</v-icon> Refresh
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <div class="table-container">
        <v-data-table
          v-model:selected="selected"
          :headers="masterHeaders"
          :items="masterData || []"
          :loading="loading.headers"
          item-value="Nomor"
          density="compact"
          class="desktop-table elevation-1"
          fixed-header
          return-object
          show-expand
          @click:row="handleRowClick"
          @update:expanded="loadDetails"
          :row-props="getRowProps"
        >
          <template #item.Tanggal="{ item }">
            {{ safeFormatDate(item.Tanggal) }}
          </template>

          <template #item.Nomor="{ item }">
            <span>{{ item.Nomor }}</span>
          </template>

          <template #item.TotalLayout="{ item }">
            <span>{{ num(item.TotalLayout) }} pcs</span>
          </template>

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0">
                <div class="detail-container">
                  <div class="detail-table-wrapper">
                    <div
                      v-if="isLoadingDetails(item.Nomor)"
                      class="text-center pa-4"
                    >
                      <v-progress-circular indeterminate size="20" />
                      <span class="ml-2 text-caption">Memuat data...</span>
                    </div>

                    <v-data-table
                      v-else-if="
                        details[item.Nomor] && details[item.Nomor].length
                      "
                      :headers="detailHeaders"
                      :items="details[item.Nomor]"
                      density="compact"
                      hide-default-footer
                      class="detail-table border"
                    >
                      <template #item.jml_layout="{ value }">
                        <strong class="total-bold">{{ value }}</strong>
                      </template>
                    </v-data-table>

                    <div v-else class="text-center pa-4 text-caption">
                      Data detail tidak ditemukan atau gagal dimuat.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, subDays, parseISO, isValid } from "date-fns";
import PageLayout from "@/components/PageLayout.vue";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
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
  Keterangan?: string;
}

interface LhkLayoutDetail {
  nomor_spk?: string;
  nama_spk?: string;
  jenis_pola?: string;
  panjang?: number;
  lebar?: number;
  jml_pola?: number;
  keterangan?: string;
}

const API_BASE_URL = "/mmt/lhk-layout";
const router = useRouter();
const toast = useToast();

const masterData = ref<LhkLayoutHeader[]>([]);
const details = ref<Record<string, LhkLayoutDetail[]>>({});
const loading = ref({ headers: true, details: false });
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<LhkLayoutHeader[]>([]);

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
});

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedRow = computed(() =>
  isSingleSelected.value ? selected.value[0] : null,
);
const selectedNomor = computed(() => selected.value[0]?.Nomor || null);

const num = (val: any) => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

const handleNewEdit = (mode: "new" | "edit") => {
  if (mode === "new") {
    router.push({ name: 'LhkLayoutCreate' });
  } else if (mode === "edit" && selectedRow.value) {
    router.push({
      name: 'LhkLayoutEdit',
      params: { nomor: selectedRow.value.Nomor },
    });
  }
};

const handleEditClick = () => handleNewEdit("edit");

const handleRowClick = (event: any, { item }: { item: LhkLayoutHeader }) => {
  selected.value = selected.value.some((s) => s.Nomor === item.Nomor)
    ? []
    : [item];
};

const getRowProps = ({ item }: any) => ({
  class: item?.Nomor === selectedNomor.value ? "row-selected" : "",
});

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const parsed = parseISO(dateString);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : "";
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

const masterHeaders = [
  { title: "Nomor LHK", key: "Nomor", minWidth: "200px", fixed: true },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "Shift", key: "Shift", minWidth: "80px" },
  { title: "Operator Pola", key: "Operator", minWidth: "150px" },
  { title: "Nomor SPK", key: "NomorSPK", minWidth: "180px" },
  { title: "Nama Order", key: "NamaOrder", minWidth: "250px" },
  { title: "Total Pola", key: "TotalPola", align: "end", minWidth: "120px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const detailHeaders = [
  { title: "Nomor SPK", key: "nomor_spk", minWidth: "150px" },
  { title: "Nama SPK / Komponen", key: "nama_spk", minWidth: "250px" },
  { title: "Jenis Pola", key: "jenis_pola", minWidth: "150px" },
  { title: "Pjg (m)", key: "panjang", align: "end", minWidth: "100px" },
  { title: "Lbr (m)", key: "lebar", align: "end", minWidth: "100px" },
  { title: "Jml Pola (Pcs)", key: "jml_pola", align: "end", minWidth: "120px" },
  { title: "Keterangan Detail", key: "keterangan", minWidth: "200px" },
];

const fetchMasterData = async () => {
  loading.value.headers = true;
  try {
    const res = await api.get<LhkLayoutHeader[]>(API_BASE_URL, {
      params: filters,
    });
    masterData.value = res.data || [];
    selected.value = [];
    await nextTick();
    resizeTable(".desktop-table");
  } catch {
    toast.error("Gagal mengambil data LHK Layout.");
  } finally {
    loading.value.headers = false;
  }
};

const loadDetails = async (newlyExpandedItems: LhkLayoutHeader[]) => {
  const itemToLoad = newlyExpandedItems?.find(
    (it) =>
      it && !details.value[it.Nomor] && !loadingDetails.value.has(it.Nomor),
  );
  if (!itemToLoad) return;

  loadingDetails.value.add(itemToLoad.Nomor);
  try {
    const res = await api.get(`${API_BASE_URL}/details`, {
      params: { nomor: itemToLoad.Nomor },
    });
    details.value[itemToLoad.Nomor] = res.data.details || res.data || [];
  } catch {
    toast.error(`Gagal memuat detail ${itemToLoad.Nomor}`);
    details.value[itemToLoad.Nomor] = [];
  } finally {
    loadingDetails.value.delete(itemToLoad.Nomor);
  }
};

const handleDelete = async () => {
  if (
    !selectedRow.value ||
    !confirm(`Hapus LHK Pola nomor ${selectedRow.value.Nomor}?`)
  )
    return;
  try {
    await api.delete(`${API_BASE_URL}/${selectedRow.value.Nomor}`);
    toast.success("Data berhasil dihapus.");
    fetchMasterData();
  } catch {
    toast.error("Gagal menghapus data.");
  }
};

const resizeTable = (tableSelector: string) => {
  const wrapper = document.querySelector(tableSelector);
  if (!wrapper) return;
  const thead = wrapper.querySelector("thead");
  const tbody = wrapper.querySelector("tbody");
  if (!thead || !tbody) return;

  thead.querySelectorAll("th").forEach((header, index) => {
    if (header.querySelector(".resizer"))
      header.querySelector(".resizer")?.remove();
    if (
      header.classList.contains("v-data-table__th--select") ||
      header.classList.contains("v-data-table__th--group")
    )
      return;

    const resizer = document.createElement("div");
    resizer.className = "resizer";
    header.style.position = "relative";

    resizer.addEventListener("mousedown", (e: MouseEvent) => {
      e.stopPropagation();
      let startX = e.clientX;
      let startWidth = header.offsetWidth;
      const columnCells = Array.from(
        tbody.querySelectorAll(`tr td:nth-child(${index + 1})`),
      ) as HTMLElement[];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        header.style.width = `${newWidth}px`;
        header.style.minWidth = `${newWidth}px`;
        columnCells.forEach((cell) => {
          cell.style.width = `${newWidth}px`;
          cell.style.minWidth = `${newWidth}px`;
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove("col-resize-active");
      };
      document.body.classList.add("col-resize-active");
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
    header.appendChild(resizer);
  });
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
      fill: { fgColor: { rgb: "C8E6C9" } }, // Hijau Muda Pastel khusus Pola
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
          const qLayout = num(dtl.jml_layout);
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

onMounted(() => fetchMasterData());
watch(filters, fetchMasterData, { deep: true });
</script>

<style scoped>
/* Sinkronisasi warna baris master terpilih */
.desktop-table :deep(.v-data-table__tr.row-selected) {
  background-color: rgb(216, 239, 255) !important;
}
.desktop-table :deep(.v-data-table__tr.row-selected td) {
  background-color: transparent !important;
  color: #0d47a1 !important;
}
.desktop-table :deep(.v-data-table__tr.row-selected:hover) {
  background-color: rgb(200, 230, 255) !important;
}

/* Penanganan Drag Resizer Batas Kolom */
.resizer {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 8px;
  transform: translateX(50%);
  background-color: transparent;
  cursor: col-resize;
  z-index: 10;
  transition: background-color 0.1s;
}
.resizer:hover,
body.col-resize-active .resizer {
  background-color: rgba(0, 0, 0, 0.2);
}

/* Detail Expanded Container */
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
:deep(.detail-table .v-data-table__td) {
  white-space: nowrap;
  padding: 0 8px !important;
}
.total-bold {
  font-weight: 700;
  color: #1976d2;
}

/* Master Layout */
.desktop-table :deep(.v-data-table-header__th),
.desktop-table :deep(tbody tr td) {
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}
:deep(.v-data-table tbody tr:hover) {
  background-color: #f1f8ff !important;
  cursor: pointer;
}
.table-container {
  height: 100%;
}
</style>
