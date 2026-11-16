<template>
  <div class="po-paper-browse-wrapper">
    <BaseBrowse
      title="PO Internal Out Browse"
      menu-id="mmt-po-internal-paperprint"
      icon="mdi-file-document-outline"
      :headers="masterHeaders"
      :items="filteredMasterData"
      :can-insert="true"
      :can-edit="true"
      :can-delete="true"
      :can-export="true"
      :is-loading="loading"
      :loading="loading"
      v-model:startDate="startDate"
      v-model:endDate="endDate"
      v-model:selected="selected"
      v-model:expanded="expanded"
      has-print
      has-export
      fixed-header
      height="550px"
      @refresh="fetchData"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @print="handlePrint"
      @export="exportToExcel"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
      @update:expanded="handleExpandUpdate"
    >
      <!-- HEADER ACTION BUTTONS (TOOLBAR KANAN ATAS) -->
      <template #header-actions>
        <v-btn size="x-small" color="success" @click="handleAdd" class="mr-1">
          <v-icon start>mdi-plus</v-icon> Baru
        </v-btn>
        <v-btn
          size="x-small"
          color="warning"
          :disabled="!isSingleSelected"
          @click="handleEdit"
          class="mr-1"
        >
          <v-icon start>mdi-pencil</v-icon> Ubah
        </v-btn>
        <v-btn
          size="x-small"
          color="error"
          :disabled="!isSingleSelected"
          @click="handleDelete"
          class="mr-1"
        >
          <v-icon start>mdi-trash-can</v-icon> Hapus
        </v-btn>
        <v-btn
          size="x-small"
          color="info"
          :disabled="!isSingleSelected"
          @click="handlePrint"
          class="mr-1"
        >
          <v-icon start>mdi-printer</v-icon> Cetak
        </v-btn>
        <v-btn
          size="x-small"
          color="success"
          :disabled="filteredMasterData.length === 0"
          @click="exportToExcel"
          :loading="loadingExport"
        >
          <v-icon start>mdi-file-excel</v-icon> Export Excel
        </v-btn>
      </template>

      <!-- EXTRA FILTER (PENCARIAN SPK & RESET FILTER PER KOLOM) -->
      <template #extra-filters>
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-text-field
            v-model="edtspk"
            placeholder="Cari No. SPK..."
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            style="min-width: 180px; max-width: 220px"
            @keyup.enter="fetchData"
          />

          <v-btn
            v-if="activeFiltersCount > 0"
            color="warning"
            variant="tonal"
            size="small"
            prepend-icon="mdi-filter-off"
            @click="resetAllColumnFilters"
          >
            Reset Filter ({{ activeFiltersCount }})
          </v-btn>
        </div>
      </template>

      <!-- DYNAMIC EXCEL FILTER PER KOLOM HEADER -->
      <template
        v-for="header in filterableHeaders"
        :key="header.key"
        #[`header.${header.key}`]="{ column }"
      >
        <div class="d-flex align-center justify-space-between w-100">
          <span class="font-weight-bold text-truncate mr-1">{{
            column.title
          }}</span>

          <v-menu
            v-model="menuStates[header.key]"
            :close-on-content-click="false"
            location="bottom start"
          >
            <template #activator="{ props }">
              <v-btn
                icon
                variant="text"
                density="compact"
                size="x-small"
                v-bind="props"
                :color="
                  isColumnFilterActive(header.key) ? 'primary' : 'grey-darken-1'
                "
              >
                <v-icon size="16">
                  {{
                    isColumnFilterActive(header.key)
                      ? "mdi-filter"
                      : "mdi-filter-variant"
                  }}
                </v-icon>
              </v-btn>
            </template>

            <v-card
              min-width="280"
              max-width="320"
              class="pa-2 border shadow-2 rounded-lg"
            >
              <v-text-field
                v-model="columnSearch[header.key]"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                autofocus
                placeholder="Cari..."
                class="mb-1"
              />

              <div class="text-caption text-grey-darken-1 my-1 px-1">
                {{ getFilteredPopupOptions(header.key).length }} dari
                {{ (uniqueValuesMap[header.key] || []).length }} nilai
                ditampilkan
              </div>

              <div
                class="d-flex ga-2 px-1 mb-2 text-caption font-weight-medium"
              >
                <a
                  href="#"
                  class="text-primary text-decoration-none"
                  @click.prevent="selectAllFiltered(header.key)"
                >
                  Tampilkan Semua
                </a>
                <span class="text-grey-lighten-1">|</span>
                <a
                  href="#"
                  class="text-error text-decoration-none"
                  @click.prevent="deselectAllFiltered(header.key)"
                >
                  Sembunyikan Semua
                </a>
              </div>

              <v-divider />

              <div
                style="max-height: 220px; overflow-y: auto"
                class="my-1 px-1"
              >
                <v-checkbox
                  v-for="opt in getFilteredPopupOptions(header.key)"
                  :key="opt"
                  :label="opt"
                  :model-value="isOptionSelected(header.key, opt)"
                  density="compact"
                  hide-details
                  color="primary"
                  @update:model-value="toggleOption(header.key, opt)"
                />
                <div
                  v-if="getFilteredPopupOptions(header.key).length === 0"
                  class="text-caption text-grey text-center py-4"
                >
                  Tidak ada data
                </div>
              </div>

              <v-divider class="mb-2" />

              <div class="d-flex justify-space-between align-center">
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  @click="resetColumnFilter(header.key)"
                >
                  Reset
                </v-btn>
                <v-btn
                  size="small"
                  color="primary"
                  variant="flat"
                  class="px-4 font-weight-bold"
                  @click="menuStates[header.key] = false"
                >
                  OK
                </v-btn>
              </div>
            </v-card>
          </v-menu>
        </div>
      </template>

      <!-- FORMAT TANGGAL PADA DATA TABEL -->
      <template #item.Tanggal="{ value }">
        <span>{{ formatDateDisplay(value) }}</span>
      </template>

      <!-- TOMBOL AKSI PER BARIS TABEL -->
      <template #item.actions="{ item }">
        <div class="d-flex justify-center ga-1">
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            color="warning"
            variant="tonal"
            title="Ubah PO"
            @click.stop="handleEdit(item)"
          />
          <v-btn
            icon="mdi-printer"
            size="x-small"
            color="info"
            variant="tonal"
            title="Cetak PO"
            @click.stop="handlePrint(item)"
          />
          <v-btn
            icon="mdi-delete"
            size="x-small"
            color="error"
            variant="tonal"
            title="Hapus PO"
            @click.stop="handleDelete(item)"
          />
        </div>
      </template>

      <!-- EXPAND DETAIL CONTENT -->
      <template #expanded-content="{ item }">
        <div v-if="isLoadingDetails(item.Nomor)" class="text-center pa-4">
          <v-progress-circular
            indeterminate
            size="20"
            color="primary"
            class="mr-2"
          />
          <span class="text-caption">Memuat detail item SPK Kertas...</span>
        </div>

        <div
          v-else-if="!details[item.Nomor] || details[item.Nomor].length === 0"
          class="text-center pa-4 text-caption text-grey"
        >
          Tidak ada data detail item untuk Nomor PO {{ item.Nomor }}
        </div>

        <v-card
          v-else
          variant="outlined"
          density="compact"
          class="ma-2 border rounded"
        >
          <v-data-table
            :headers="detailHeaders"
            :items="details[item.Nomor]"
            density="compact"
            class="bg-white"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #[`item.Qty`]="{ item: d }">
              <div class="text-right font-weight-bold">
                {{ formatCurrency(d.Qty) }}
              </div>
            </template>
            <template #[`item.Harga`]="{ item: d }">
              <div class="text-right">Rp {{ formatCurrency(d.Harga) }}</div>
            </template>
          </v-data-table>
        </v-card>
      </template>
    </BaseBrowse>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { format, subDays, parseISO, isValid } from "date-fns";
import * as XLSX from "xlsx";
import BaseBrowse from "@/components/BaseBrowse.vue";

const toast = useToast();
const router = useRouter();
const API_PO_PAPER = "mmt/po-paperprint";

// --- State Management ---
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = ref(true);
const loadingExport = ref(false);
const loadingDetails = ref(new Set<string>());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

// Filter Tanggal & SPK
const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));
const edtspk = ref<string>("");

// --- EXCEL FILTER STATES ---
const columnSearch = ref<Record<string, string>>({});
const selectedValues = ref<Record<string, string[]>>({});
const menuStates = ref<Record<string, boolean>>({});

// --- User Config & Session Storage ---
const getSessionUser = () => {
  try {
    const userSession = localStorage.getItem("userData");
    return userSession ? JSON.parse(userSession) : null;
  } catch (e) {
    console.error("Gagal membaca userData", e);
    return null;
  }
};

const userConfig = reactive({
  kdUser: getSessionUser()?.kdUser || getSessionUser()?.username || "",
  cab: getSessionUser()?.cab || "",
});

// --- Headers ---
const masterHeaders = [
  {
    title: "Detail",
    key: "data-table-expand",
    minWidth: "60px",
    align: "center" as const,
    fixed: true,
  },
  { title: "Nomor PO", key: "Nomor", minWidth: "160px", fixed: true },
  { title: "Cab", key: "Cab", minWidth: "90px" },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "Kode Sup", key: "KodeSup", minWidth: "120px" },
  { title: "Nama Supplier", key: "Supplier", minWidth: "220px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "250px" },
  {
    title: "Aksi",
    key: "actions",
    minWidth: "140px",
    align: "center" as const,
    fixed: true,
  },
];

const detailHeaders = [
  { title: "Nomor PO", key: "Nomor", minWidth: "140px" },
  { title: "No. SPK", key: "Spk", minWidth: "150px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", minWidth: "120px" },
  { title: "Bahan", key: "Bahan", minWidth: "150px" },
  { title: "Qty", key: "Qty", minWidth: "100px", align: "end" as const },
  { title: "Harga", key: "Harga", minWidth: "120px", align: "end" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const isSingleSelected = computed(() => selected.value.length === 1);

// --- EXCEL FILTER CORE LOGIC ---
const filterableHeaders = computed(() => {
  return masterHeaders.filter(
    (h) => h.key !== "data-table-expand" && h.key !== "actions",
  );
});

const getCellValue = (item: any, key: string): string => {
  let val = item[key];

  if (key === "Tanggal" && val) {
    return formatDateDisplay(val);
  }
  if (key === "Supplier" && (!val || val === "")) {
    val = item.Nama;
  }

  if (val === null || val === undefined || val === "") {
    return "(Blank)";
  }

  return String(val);
};

const uniqueValuesMap = computed(() => {
  const map: Record<string, string[]> = {};
  filterableHeaders.value.forEach((h) => {
    const key = h.key;
    const set = new Set<string>();
    (masterData.value || []).forEach((item) => {
      set.add(getCellValue(item, key));
    });
    map[key] = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  });
  return map;
});

const getFilteredPopupOptions = (key: string) => {
  const options = uniqueValuesMap.value[key] || [];
  const search = columnSearch.value[key]?.trim().toLowerCase();
  if (!search) return options;
  return options.filter((opt) => opt.toLowerCase().includes(search));
};

const isOptionSelected = (key: string, option: string) => {
  const selectedOpts = selectedValues.value[key];
  if (!selectedOpts) return true;
  return selectedOpts.includes(option);
};

const toggleOption = (key: string, option: string) => {
  if (!selectedValues.value[key]) {
    selectedValues.value[key] = [...(uniqueValuesMap.value[key] || [])];
  }
  const index = selectedValues.value[key].indexOf(option);
  if (index > -1) {
    selectedValues.value[key].splice(index, 1);
  } else {
    selectedValues.value[key].push(option);
  }
};

const selectAllFiltered = (key: string) => {
  const visibleOptions = getFilteredPopupOptions(key);
  const currentSelected = selectedValues.value[key] || [
    ...(uniqueValuesMap.value[key] || []),
  ];
  const newSet = new Set([...currentSelected, ...visibleOptions]);
  selectedValues.value[key] = Array.from(newSet);
};

const deselectAllFiltered = (key: string) => {
  const visibleOptions = getFilteredPopupOptions(key);
  const currentSelected = selectedValues.value[key] || [
    ...(uniqueValuesMap.value[key] || []),
  ];
  selectedValues.value[key] = currentSelected.filter(
    (opt) => !visibleOptions.includes(opt),
  );
};

const isColumnFilterActive = (key: string) => {
  const search = columnSearch.value[key]?.trim();
  if (search) return true;

  const selectedOpts = selectedValues.value[key];
  if (!selectedOpts) return false;
  const all = uniqueValuesMap.value[key] || [];
  return selectedOpts.length < all.length;
};

const activeFiltersCount = computed(() => {
  return (
    Object.keys(columnSearch.value).filter(
      (k) => !!columnSearch.value[k]?.trim(),
    ).length +
    Object.keys(selectedValues.value).filter((key) => isColumnFilterActive(key))
      .length
  );
});

const resetColumnFilter = (key: string) => {
  delete selectedValues.value[key];
  columnSearch.value[key] = "";
};

const resetAllColumnFilters = () => {
  selectedValues.value = {};
  columnSearch.value = {};
};

const filteredMasterData = computed(() => {
  return (masterData.value || []).filter((item) => {
    return filterableHeaders.value.every((h) => {
      const key = h.key;
      const cellValue = getCellValue(item, key);

      const searchText = columnSearch.value[key]?.trim().toLowerCase();
      if (searchText && !cellValue.toLowerCase().includes(searchText)) {
        return false;
      }

      const selectedArr = selectedValues.value[key];
      if (selectedArr) {
        return selectedArr.includes(cellValue);
      }

      return true;
    });
  });
});

// --- Formatters ---
const formatDateDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const d =
      typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, "dd/MM/yyyy") : String(dateStr);
  } catch (e) {
    return String(dateStr);
  }
};

const formatCurrency = (val: number | string | null) => {
  if (val === null || val === undefined || val === "") return "0.00";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// --- Data Fetching ---
const fetchData = async () => {
  loading.value = true;
  selected.value = [];
  expanded.value = [];
  try {
    const res = await api.get(`${API_PO_PAPER}/`, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        cab: userConfig.cab,
        edtspk: edtspk.value.trim(),
      },
    });

    const rawData = res.data;
    masterData.value = Array.isArray(rawData) ? rawData : rawData.data || [];
  } catch (error) {
    console.error("Gagal mengambil data PO Paper:", error);
    toast.error("Gagal mengambil data PO Paper");
    masterData.value = [];
  } finally {
    loading.value = false;
  }
};

// Expand Detail Data Handler
const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const lastExpandedNomor =
    typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!lastExpandedNomor || details.value[lastExpandedNomor]) return;

  loadingDetails.value.add(lastExpandedNomor);
  try {
    const response = await api.get(
      `${API_PO_PAPER}/detail/${encodeURIComponent(lastExpandedNomor)}`,
    );
    details.value[lastExpandedNomor] =
      response.data?.data ?? response.data ?? [];
  } catch (error) {
    console.error("Gagal mengambil detail PO Paper:", error);
    details.value[lastExpandedNomor] = [];
  } finally {
    loadingDetails.value.delete(lastExpandedNomor);
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

// --- Permission Check ---
const checkPermission = async (action: "insert" | "edit" | "delete") => {
  try {
    const res = await api.post(`${API_PO_PAPER}/check-permission`, {
      kdUser: userConfig.kdUser,
      formName: "ufrmBrowsePoPaper",
      action: action,
    });
    return res.data?.allowed ?? true;
  } catch (e) {
    return true;
  }
};

// --- Action Handlers (Baru, Ubah, Cetak, Hapus) ---
const handleAdd = async () => {
  const isAllowed = await checkPermission("insert");
  if (!isAllowed) {
    toast.warning("Anda tidak berhak Menambah data di Modul ini");
    return;
  }
  router.push({ name: 'PoPaperprintNew' });
};

const handleEdit = async (row?: any) => {
  const targetRow = row && row.Nomor ? row : selected.value[0];

  if (!targetRow || !targetRow.Nomor) {
    toast.warning(
      "Silakan pilih/centang satu data terlebih dahulu untuk diubah.",
    );
    return;
  }

  const isAllowed = await checkPermission("edit");
  if (!isAllowed) {
    toast.warning("Anda tidak berhak mengubah data di Modul ini.");
    return;
  }

  router.push({
    name: 'PoPaperprintEdit',
    params: { nomor: targetRow.Nomor },
  });
};

const handlePrint = (row?: any) => {
  const targetRow = row && row.Nomor ? row : selected.value[0];
  if (!targetRow || !targetRow.Nomor) {
    toast.warning("Silakan pilih/centang data yang ingin dicetak.");
    return;
  }

  router.push({
    name: 'PoPaperprintPrint',
    query: { nomor: targetRow.Nomor },
  });
};

const handleDelete = async (row?: any) => {
  const targetRow = row && row.Nomor ? row : selected.value[0];

  if (!targetRow || !targetRow.Nomor) {
    toast.warning("Silakan pilih/centang data yang ingin dihapus.");
    return;
  }

  const isAllowed = await checkPermission("delete");
  if (!isAllowed) {
    toast.warning("Anda tidak berhak Menghapus di Modul ini");
    return;
  }

  if (!confirm(`Yakin ingin hapus PO Paper No: ${targetRow.Nomor} ?`)) return;

  loading.value = true;
  try {
    await api.delete(`${API_PO_PAPER}/${encodeURIComponent(targetRow.Nomor)}`);
    toast.success("Sukses menghapus data");

    masterData.value = masterData.value.filter(
      (item) => item.Nomor !== targetRow.Nomor,
    );
    selected.value = selected.value.filter(
      (item) => item.Nomor !== targetRow.Nomor,
    );
  } catch (error: any) {
    console.error("Gagal Hapus PO Paper:", error);
    toast.error(error.response?.data?.message || "Gagal Hapus");
  } finally {
    loading.value = false;
  }
};

// --- EXPORT TO EXCEL (HEADER & DETAIL NUMERIK MURNI) ---
const exportToExcel = async () => {
  const listToProcess = filteredMasterData.value;
  if (listToProcess.length === 0) {
    toast.warning("Tidak ada data untuk diekspor");
    return;
  }

  loadingExport.value = true;
  try {
    // Parallel fetching detail yang belum terbuka
    const fetchPromises = listToProcess.map(async (header) => {
      if (
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0
      ) {
        try {
          const res = await api.get(
            `${API_PO_PAPER}/detail/${encodeURIComponent(header.Nomor)}`,
          );
          details.value[header.Nomor] = res.data?.data ?? res.data ?? [];
        } catch (e) {
          console.error(`Gagal sync detail PO ${header.Nomor}:`, e);
          details.value[header.Nomor] = [];
        }
      }
    });

    await Promise.all(fetchPromises);

    const fileName = `PO_Paper_Print_${startDate.value}_to_${endDate.value}.xlsx`;

    const parseNum = (val: any): number => {
      if (val === null || val === undefined || val === "") return 0;
      const parsed = Number(val);
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

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN PURCHASE ORDER (PO) PAPER PRINT",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${formatDateDisplay(startDate.value)} s/d ${formatDateDisplay(endDate.value)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headers = [
      { v: "NOMOR PO", s: styleHeaderMain },
      { v: "CAB", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "KODE SUP", s: styleHeaderMain },
      { v: "NAMA SUPPLIER", s: styleHeaderMain },
      { v: "KETERANGAN PO", s: styleHeaderMain },
      { v: "NO. SPK", s: styleHeaderMain },
      { v: "NAMA SPK", s: styleHeaderMain },
      { v: "UKURAN", s: styleHeaderMain },
      { v: "BAHAN", s: styleHeaderMain },
      { v: "QTY", s: styleHeaderMain },
      { v: "HARGA", s: styleHeaderMain },
      { v: "TOTAL", s: styleHeaderMain },
    ];
    worksheetData.push(headers);

    let grandTotalQty = 0;
    let grandTotalSubtotal = 0;

    listToProcess.forEach((header) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = formatDateDisplay(header.Tanggal);
      const supplierName = header.Supplier || header.Nama || "-";

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl, index) => {
          const isFirstRow = index === 0;
          const qtyVal = parseNum(dtl.Qty);
          const hargaVal = parseNum(dtl.Harga);
          const totalVal = qtyVal * hargaVal;

          grandTotalQty += qtyVal;
          grandTotalSubtotal += totalVal;

          worksheetData.push([
            { v: isFirstRow ? header.Nomor : "-", s: styleDataCellCenter },
            { v: isFirstRow ? header.Cab || "-" : "-", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "-", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.KodeSup || "-" : "-",
              s: styleDataCellCenter,
            },
            { v: isFirstRow ? supplierName : "-", s: styleDataCell },
            {
              v: isFirstRow ? header.Keterangan || "-" : "-",
              s: styleDataCell,
            },
            { v: dtl.Spk || dtl.Nomor_SPK || "-", s: styleDataCellCenter },
            { v: dtl.NamaSpk || dtl.Nama_SPK || "-", s: styleDataCell },
            { v: dtl.Ukuran || "-", s: styleDataCellCenter },
            { v: dtl.Bahan || "-", s: styleDataCell },
            { v: qtyVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
            { v: hargaVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
            { v: totalVal, t: "n", z: "#,##0.00", s: styleDataCellRight },
          ]);
        });
      } else {
        worksheetData.push([
          { v: header.Nomor, s: styleDataCellCenter },
          { v: header.Cab || "-", s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: header.KodeSup || "-", s: styleDataCellCenter },
          { v: supplierName, s: styleDataCell },
          { v: header.Keterangan || "-", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada detail item", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCell },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
        ]);
      }
    });

    // Grand Total Row
    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      ...Array(9).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalQty,
        t: "n",
        z: "#,##0.00",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      { v: "", s: styleFooter },
      {
        v: grandTotalSubtotal,
        t: "n",
        z: "#,##0.00",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 9 },
      },
    ];

    ws["!cols"] = [
      { wch: 18 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PO_Paper");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel PO Paper Print berhasil diunduh!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loadingExport.value = false;
  }
};

// --- Row Interaction ---
const handleRowClick = (_event: any, row: any) => {
  const item = row.item || row;
  const isSelected = selected.value.some((s: any) => s.Nomor === item.Nomor);
  if (isSelected) {
    selected.value = [];
  } else {
    selected.value = [item];
  }
};

const getRowProps = ({ item }: any) => ({
  class: selected.value.some((s: any) => s.Nomor === item.Nomor)
    ? "row-selected"
    : "",
});

watch([startDate, endDate], fetchData);
onMounted(fetchData);
</script>

<style scoped>
/* 💡 STICKY HEADER & FIXED FOOTER DENGAN SCROLL TBODY */
:deep(.v-table) {
  display: flex !important;
  flex-direction: column !important;
  height: 550px !important;
}

:deep(.v-table__wrapper) {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  overflow-x: auto !important;
  max-height: 550px !important;
}

:deep(.v-data-table-footer) {
  flex: 0 0 auto !important;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #ffffff !important;
}

.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
.po-paper-browse-wrapper {
  width: 100%;
}
</style>
