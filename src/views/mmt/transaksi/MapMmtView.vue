<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mapService } from "@/services/mmt/mapService";
import { useAuthStore } from "@/stores/authStore";
import * as XLSX from "xlsx";
import api from "@/services/api";
import {
  IconClipboardText,
  IconPrinter,
  IconPhoto,
  IconChevronDown,
  IconFileDescription,
  IconDiscountCheck,
  IconLock,
  IconLockOpen,
  IconX,
  IconPhotoOff,
  IconExternalLink,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconBrush,
  IconFileSpreadsheet, // <-- Tambahkan ini
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const menuId = "162";

const showPrintDialog = ref(false);
const printNomorBrowse = ref("");
const isExporting = ref(false);
const mapDetails = ref<Record<string, any[]>>({});

// Helper Tanggal Lokal YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFutureLocalDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseToExcelDate = (val: string | null) => {
  if (!val || val === "-") return null;
  const strVal = String(val).trim();
  let parts: string[] = [];
  if (strVal.includes("/")) {
    parts = strVal.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    }
  } else if (strVal.includes("-")) {
    parts = strVal.substring(0, 10).split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    }
  }
  return null;
};

// State Filter Tanggal (Eksplisit)
const startDate = ref<string>(getLocalDate());
const endDate = ref<string>(getFutureLocalDate(5));

// --- STATE UNTUK MODAL GAMBAR & ALASAN ---
const dialogGambar = ref(false);
const gambarUrl = ref("");

const dialogAlasan = ref(false);
const alasanText = ref("");
const alasanNomor = ref("");

// --- STATE UNTUK UPDATE STATUS DESIGN ---
const isBagianDesain = computed(
  () => authStore.user?.bagian?.toUpperCase() === "DESAIN",
);

interface DesignRow {
  Nomor: string;
  Nama: string;
  DesignDone: string;
}

const dialogDesign = ref(false);
const designList = ref<DesignRow[]>([]);
const isLoadingDesign = ref(false);
const isSavingDesign = ref(false);

const openDesignDialog = async () => {
  isLoadingDesign.value = true;
  try {
    const res = await mapService.getDesignList(startDate.value, endDate.value);

    const rawList = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || [];

    designList.value = rawList.map((r: any) => ({
      Nomor: r.Nomor,
      Nama: r.Nama,
      DesignDone: r.DesignDone || "N",
    }));
    dialogDesign.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data design.");
  } finally {
    isLoadingDesign.value = false;
  }
};

const submitDesignStatus = async () => {
  isSavingDesign.value = true;
  try {
    await mapService.updateDesignStatus(designList.value);
    toast.success("Update status design berhasil.");
    dialogDesign.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal update status design.");
  } finally {
    isSavingDesign.value = false;
  }
};

// Composable Browse
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
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
    };
    const res = await mapService.getBrowseList(payload);

    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.result)) return res.data.result;
    if (Array.isArray(res?.result)) return res.result;
    if (Array.isArray(res?.data?.rows)) return res.data.rows;
    return [];
  },
  immediate: true,
});

// Auto fetch data & reset filter kolom saat tanggal diubah
watch([startDate, endDate], () => {
  resetAllColumnFilters();
  fetchData();
});

const canLihatCus = computed(
  () => Number(authStore.user?.flags?.lihatCus) === 1,
);
const canLihatHarga = computed(
  () => Number(authStore.user?.flags?.lihatHarga) === 1,
);

// Headers Datatable MAP
const defaultHeaders = computed(() => {
  const h: any[] = [
    { title: "Nomor", key: "Nomor", width: "160px" },
    { title: "MO", key: "MO", width: "100px" },
    { title: "CMO", key: "CMO", width: "100px" },
    { title: "Tanggal", key: "Tanggal", width: "100px" },
    { title: "Dateline", key: "Dateline", width: "100px" },
    { title: "Tgl. BAST", key: "TglBast", width: "100px" },
    { title: "Nama", key: "Nama", minWidth: "250px" },
    {
      title: "Selisih (BAST-MAP)",
      key: "SelisihBastMap",
      width: "130px",
      align: "right",
    },
    { title: "Berita Acara", key: "Berita_Acara", width: "120px" },
    { title: "Divisi", key: "Divisi", width: "100px" },
    { title: "Cab", key: "Cab", width: "60px" },
    { title: "Workshop", key: "Workshop", width: "120px" },
    { title: "Workshop SPK", key: "WorkshopSPK", width: "130px" },
    { title: "Aktif", key: "Aktif", width: "60px", align: "center" },
    {
      title: "Acc. Customer",
      key: "AccCustomer",
      width: "110px",
      align: "center",
    },
    { title: "Surat Jalan", key: "Surat_Jalan", width: "140px" },
    { title: "Ukuran", key: "Ukuran", width: "120px" },
    { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
    { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
    { title: "Gramasi", key: "Gramasi", width: "120px" },
    { title: "Kain", key: "Kain", width: "180px" },
    { title: "Finishing", key: "Finishing", width: "180px" },
    { title: "Qty", key: "Jumlah", width: "60px", align: "right" },
    { title: "Kirim", key: "Kirim", width: "60px", align: "right" },
  ];
  if (canLihatCus.value) {
    h.push({ title: "Customer", key: "Customer", minWidth: "200px" });
  }
  h.push(
    { title: "Rencana", key: "Rencana", width: "80px", align: "right" },
    { title: "Salesman", key: "Salesman", width: "120px" },
    { title: "Tipe", key: "Tipe", width: "100px" },
  );
  if (canLihatHarga.value) {
    h.push(
      { title: "Harga", key: "Harga", width: "100px", align: "right" },
      { title: "Harga Riil", key: "HargaRiil", width: "100px", align: "right" },
    );
  }
  h.push(
    { title: "Created", key: "Created", width: "150px" },
    { title: "Revisi", key: "Revisi", width: "70px", align: "center" },
    { title: "No. Referensi", key: "NoReferensi", width: "140px" },
    { title: "Estimasi Jadi", key: "EstimasiJadi", width: "100px" },
    { title: "Close", key: "CloseStatus", width: "70px", align: "center" },
    { title: "SO", key: "SPK", width: "160px" },
    { title: "Tgl. Desain", key: "Design_Tanggal", width: "100px" },
    { title: "User Desain", key: "Design_User", width: "100px" },
    { title: "Note Desain", key: "Design_Note", width: "150px" },
    { title: "Ngedit", key: "Ngedit", width: "100px" },
    {
      title: "Desain Baru",
      key: "Design_Baru",
      width: "100px",
      align: "center",
    },
    {
      title: "Desain Done",
      key: "Design_Done",
      width: "100px",
      align: "center",
    },
    { title: "Keterangan", key: "Keterangan", minWidth: "300px" },
  );
  return h;
});

const customHeaders = ref<any[]>([]);

// Sinkronkan customHeaders dengan defaultHeaders
watch(
  defaultHeaders,
  (newHeaders) => {
    if (customHeaders.value.length === 0) {
      customHeaders.value = [...newHeaders];
    } else {
      const currentKeys = new Set(newHeaders.map((h) => h.key));
      const preserved = customHeaders.value.filter((h) =>
        currentKeys.has(h.key),
      );
      const existingKeys = new Set(preserved.map((h) => h.key));
      newHeaders.forEach((h) => {
        if (!existingKeys.has(h.key)) preserved.push(h);
      });
      customHeaders.value = preserved;
    }
  },
  { immediate: true },
);

// --- STATE UNTUK COLUMN RESIZING ---
const resizingKey = ref<string | null>(null);
const startX = ref(0);
const startWidth = ref(0);

const startResize = (e: MouseEvent, key: string) => {
  resizingKey.value = key;
  startX.value = e.clientX;

  const targetHeader = customHeaders.value.find((h) => h.key === key);
  let w = parseInt(targetHeader?.width || targetHeader?.minWidth || "120", 10);
  if (isNaN(w)) w = 120;
  startWidth.value = w;

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  e.stopPropagation();
};

const onMouseMove = (e: MouseEvent) => {
  if (!resizingKey.value) return;
  const diff = e.clientX - startX.value;
  const newWidth = Math.max(50, startWidth.value + diff); // Minimal lebar 50px

  const idx = customHeaders.value.findIndex((h) => h.key === resizingKey.value);
  if (idx !== -1) {
    customHeaders.value[idx] = {
      ...customHeaders.value[idx],
      width: `${newWidth}px`,
      minWidth: `${newWidth}px`,
    };
  }
};

const onMouseUp = () => {
  resizingKey.value = null;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
};

const draggedKey = ref<string | null>(null);
const dragOverKey = ref<string | null>(null);

const onDragStart = (e: DragEvent, key: string) => {
  resizingKey.value = null; // Batalkan resize jika sedang drag
  draggedKey.value = key;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
};

const onDragEnter = (key: string) => {
  dragOverKey.value = key;
};

const onDragLeave = (_key: string) => {};

const onDrop = (e: DragEvent, targetKey: string) => {
  e.preventDefault();
  const sourceKey = draggedKey.value;
  draggedKey.value = null;
  dragOverKey.value = null;

  if (!sourceKey || sourceKey === targetKey) return;

  const srcIdx = customHeaders.value.findIndex((h) => h.key === sourceKey);
  const targetIdx = customHeaders.value.findIndex((h) => h.key === targetKey);

  if (srcIdx !== -1 && targetIdx !== -1) {
    const movedItem = customHeaders.value.splice(srcIdx, 1)[0];
    customHeaders.value.splice(targetIdx, 0, movedItem);
  }
};

const fmtNum = (val: number | string | null) => {
  if (val === null || val === undefined || val === "") return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

// --- EXCEL FILTER CORE LOGIC ---
const columnSearch = ref<Record<string, string>>({});
const selectedValues = ref<Record<string, string[]>>({});
const menuStates = ref<Record<string, boolean>>({});

const getCellValue = (item: any, key: string): string => {
  if (!item) return "-";
  let val = item[key];

  // Tambahkan pengecekan ini agar pop-up filter ikut terformat DD/MM/YYYY
  if (
    [
      "Tanggal",
      "Dateline",
      "TglBast",
      "EstimasiJadi",
      "Design_Tanggal",
    ].includes(key)
  ) {
    return val ? formatTanggal(val) || "-" : "-";
  }

  if (key === "Created") {
    return val ? formatTanggalJam(val) || "-" : "-";
  }

  if (
    [
      "Panjang",
      "Lebar",
      "Jumlah",
      "Kirim",
      "Rencana",
      "Harga",
      "HargaRiil",
    ].includes(key)
  ) {
    return val !== null && val !== undefined && val !== "" ? fmtNum(val) : "0";
  }

  if (val === null || val === undefined || val === "") {
    return "-";
  }

  return String(val);
};

const uniqueValuesMap = computed(() => {
  const map: Record<string, string[]> = {};
  const currentItems = items.value ?? [];
  const currentHeaders = customHeaders.value.length
    ? customHeaders.value
    : defaultHeaders.value;

  currentHeaders.forEach((h: any) => {
    const key = h.key;
    const set = new Set<string>();
    currentItems.forEach((item: any) => {
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
  const sel = selectedValues.value[key];
  if (!sel) return true;
  return sel.includes(option);
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

  const sel = selectedValues.value[key];
  if (!sel) return false;
  const all = uniqueValuesMap.value[key] || [];
  return sel.length < all.length;
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

const filteredItems = computed(() => {
  const rawItems = items.value ?? [];
  const currentHeaders = customHeaders.value.length
    ? customHeaders.value
    : defaultHeaders.value;

  return rawItems.filter((item: any) => {
    return currentHeaders.every((h: any) => {
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

// Klik Baris Tabel
const handleRowClick = (_event: any, rowData: any) => {
  const item = rowData.item?.raw || rowData.item || rowData;
  if (!item || !item.Nomor) return;

  const exists = selected.value.some((s: any) => s.Nomor === item.Nomor);
  if (exists) {
    selected.value = [];
  } else {
    selected.value = [item];
  }
};

// Highlight Baris
const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  const isSelected = selected.value.some((s: any) => s.Nomor === row.Nomor);
  const classes: string[] = [];

  if (isSelected) {
    classes.push("row-selected");
  }
  if (row.Aktif === "N") {
    classes.push("row-passive text-grey");
  } else if (row.Aktif === "Y" && row.CloseStatus === "N") {
    classes.push("row-active-open text-red-darken-2 font-weight-medium");
  }

  return { class: classes.join(" ") };
};

// Aksi CRUD
const goAdd = () =>
  router.push({ name: "MapFormCreate", query: { mode: "new" } });

const goEdit = (item?: any) => {
  const targetItem =
    item || (selected.value.length > 0 ? selected.value[0] : null);
  if (!targetItem) return;
  router.push({
    name: "MapFormEdit",
    params: { nomor: encodeURIComponent(targetItem.Nomor) },
  });
};

const goDelete = async (item?: any) => {
  const targetItem =
    item || (selected.value.length > 0 ? selected.value[0] : null);
  if (!targetItem) return;

  isLoading.value = true;
  try {
    await mapService.deleteMap(targetItem.Nomor);
    toast.success("Berhasil dihapus.");
    selected.value = [];
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

// Handle Modal & Gambar
const fallbackStep = ref(0);

const lihatGambar = () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
  const cab = item.Cab || "HO-";

  fallbackStep.value = 0;
  gambarUrl.value = `${base}/images/${cab}/map/${encodeURIComponent(item.Nomor)}.jpg`;
  dialogGambar.value = true;
};

const onGambarError = () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  const nomor = item.Nomor;
  const referensi = item.NoReferensi || item.MAP || "";
  const cab = item.Cab || "HO-";
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

  const fallbacks: string[] = [];

  if (nomor) fallbacks.push(`/file-gambar/${encodeURIComponent(nomor)}.jpg`);
  if (referensi)
    fallbacks.push(
      `${base}/images/${cab}/map/${encodeURIComponent(referensi)}.jpg`,
    );
  if (referensi)
    fallbacks.push(`/file-gambar/${encodeURIComponent(referensi)}.jpg`);
  if (nomor)
    fallbacks.push(`/file-gambar/mintaharga/${encodeURIComponent(nomor)}.jpg`);
  if (referensi)
    fallbacks.push(
      `/file-gambar/mintaharga/${encodeURIComponent(referensi)}.jpg`,
    );

  if (fallbackStep.value < fallbacks.length) {
    gambarUrl.value = fallbacks[fallbackStep.value];
    fallbackStep.value++;
  } else {
    gambarUrl.value = "";
  }
};

// Cetak & Export
const cetak = () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih salah satu baris MAP terlebih dahulu.");
    return;
  }
  const item = selected.value[0];
  const zBagian = authStore.user?.bagian?.toUpperCase() || "";

  if (zBagian !== "MARKETING" && (!item.CMO || item.CMO.trim() === "")) {
    toast.warning(
      "MAP tsb belum diapprove oleh Chief Marketing.\nTidak bisa dicetak.",
    );
    return;
  }

  printNomorBrowse.value = item.Nomor;
  showPrintDialog.value = true;
};

const pilihGambarVertikalBrowse = () => {
  showPrintDialog.value = false;
  const routeData = router.resolve({
    name: 'MapMmtPrint',
    params: { nomor: printNomorBrowse.value },
    query: { layout: "vertikal" },
  });
  window.open(routeData.href, "_blank");
};

const pilihGambarHorizontalBrowse = () => {
  showPrintDialog.value = false;
  const routeData = router.resolve({
    name: 'MapMmtPrint',
    params: { nomor: printNomorBrowse.value },
    query: { layout: "horizontal" },
  });
  window.open(routeData.href, "_blank");
};

// Modal Actions
const pengajuanPerubahan = () => {
  if (selected.value.length === 0) return;
  alasanNomor.value = selected.value[0].Nomor;
  alasanText.value = "";
  dialogAlasan.value = true;
};

const submitPengajuan = async () => {
  if (!alasanText.value.trim()) {
    toast.warning("Alasan harus diisi!");
    return;
  }

  isLoading.value = true;
  try {
    await mapService.requestPin5(alasanNomor.value, alasanText.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    dialogAlasan.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan.");
  } finally {
    isLoading.value = false;
  }
};

const showApprovalDialog = ref(false);
const approvalItem = ref<any>(null);

const openApprovalDialog = () => {
  if (selected.value.length === 0) return;
  approvalItem.value = selected.value[0];
  showApprovalDialog.value = true;
};

const confirmApproval = async () => {
  isLoading.value = true;
  try {
    await mapService.approveCmo(approvalItem.value.Nomor);
    toast.success("Berhasil di-approve.");
    showApprovalDialog.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal approve.");
  } finally {
    isLoading.value = false;
  }
};

const showCloseDialog = ref(false);
const closeAction = ref<"Y" | "N">("Y");
const closeItem = ref<any>(null);

const openCloseDialog = (isClose: "Y" | "N") => {
  if (selected.value.length === 0) return;
  closeAction.value = isClose;
  closeItem.value = selected.value[0];
  showCloseDialog.value = true;
};

const exportToExcelCustom = async () => {
  if (!filteredItems.value || filteredItems.value.length === 0) {
    return toast.warning(
      "Tidak ada data yang sesuai dengan filter untuk diekspor.",
    );
  }

  isExporting.value = true;

  try {
    // 1. Gunakan langsung filteredItems TANPA sorting ulang agar urutan sama persis dengan di browse
    const sortedItems = [...filteredItems.value];

    // 2. Ambil detail sizes jika diperlukan
    for (const header of sortedItems) {
      const nomorMap = header.Nomor;
      if (
        nomorMap &&
        (!mapDetails.value[nomorMap] || mapDetails.value[nomorMap].length === 0)
      ) {
        try {
          const res = (mapService as any).getSizes
            ? await (mapService as any).getSizes(nomorMap)
            : null;
          const resData = res?.data?.data ?? res?.data;
          mapDetails.value[nomorMap] = Array.isArray(resData) ? resData : [];
        } catch (e) {
          mapDetails.value[nomorMap] = [];
        }
      }
    }

    const fileName = `Data_MAP_${startDate.value}_sd_${endDate.value}.xlsx`;

    const num = (value: any): number => {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    // Style Definisi
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

    // Title Block
    worksheetData.push([
      { v: "MEMO APPROVAL PRODUK (MAP)", s: { font: { bold: true, sz: 14 } } },
    ]);
    worksheetData.push([
      {
        v: `Tanggal Periode : ${startDate.value} s.d ${endDate.value}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    // Headers kolom sesuai urutan header aktif di frontend
    const headers = [
      { v: "NOMOR", s: styleHeaderMain },
      { v: "MO", s: styleHeaderMain },
      { v: "CMO", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "DATELINE", s: styleHeaderMain },
      { v: "TGL. BAST", s: styleHeaderMain },
      { v: "NAMA", s: styleHeaderMain },
      { v: "SELISIH (BAST-MAP)", s: styleHeaderMain },
      { v: "BERITA ACARA", s: styleHeaderMain },
      { v: "DIVISI", s: styleHeaderMain },
      { v: "CAB", s: styleHeaderMain },
      { v: "WORKSHOP", s: styleHeaderMain },
      { v: "WORKSHOP SPK", s: styleHeaderMain },
      { v: "AKTIF", s: styleHeaderMain },
      { v: "ACC. CUSTOMER", s: styleHeaderMain },
      { v: "SURAT JALAN", s: styleHeaderMain },
      { v: "UKURAN", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "GRAMASI", s: styleHeaderMain },
      { v: "KAIN", s: styleHeaderMain },
      { v: "FINISHING", s: styleHeaderMain },
      { v: "QTY", s: styleHeaderMain },
      { v: "KIRIM", s: styleHeaderMain },
      ...(canLihatCus.value ? [{ v: "CUSTOMER", s: styleHeaderMain }] : []),
      { v: "RENCANA", s: styleHeaderMain },
      { v: "SALESMAN", s: styleHeaderMain },
      { v: "TIPE", s: styleHeaderMain },
      ...(canLihatHarga.value
        ? [
            { v: "HARGA", s: styleHeaderMain },
            { v: "HARGA RIIL", s: styleHeaderMain },
          ]
        : []),
      { v: "CREATED", s: styleHeaderMain },
      { v: "REVISI", s: styleHeaderMain },
      { v: "NO. REFERENSI", s: styleHeaderMain },
      { v: "ESTIMASI JADI", s: styleHeaderMain },
      { v: "CLOSE", s: styleHeaderMain },
      { v: "SO", s: styleHeaderMain },
      { v: "TGL. DESAIN", s: styleHeaderMain },
      { v: "USER DESAIN", s: styleHeaderMain },
      { v: "NOTE DESAIN", s: styleHeaderMain },
      { v: "NGEDIT", s: styleHeaderMain },
      { v: "DESAIN BARU", s: styleHeaderMain },
      { v: "DESAIN DONE", s: styleHeaderMain },
      { v: "KETERANGAN", s: styleHeaderMain },
      { v: "UKURAN/SIZE (DETAIL)", s: styleHeaderMain },
      { v: "QTY SPK (DETAIL)", s: styleHeaderMain },
      { v: "REALISASI STBJ (DETAIL)", s: styleHeaderMain },
      { v: "SISA KURANG (DETAIL)", s: styleHeaderMain },
    ];
    worksheetData.push(headers);

    let grandTotalQty = 0;
    let grandTotalKirim = 0;
    let grandTotalDetailQty = 0;

    sortedItems.forEach((header) => {
      const nomorMap = header.Nomor || "-";
      const targetSizes = mapDetails.value[nomorMap] || [];

      grandTotalQty += num(header.Jumlah);
      grandTotalKirim += num(header.Kirim);

      // Gunakan getCellValue agar format tanggal yang masuk ke Excel sama persis dengan yang tampil di tabel (browse)
      const baseRowData = [
        { v: nomorMap, s: styleDataCellCenter },
        { v: header.MO || "-", s: styleDataCellCenter },
        { v: header.CMO || "-", s: styleDataCellCenter },
        { v: getCellValue(header, "Tanggal"), s: styleDataCellCenter },
        { v: getCellValue(header, "Dateline"), s: styleDataCellCenter },
        { v: getCellValue(header, "TglBast"), s: styleDataCellCenter },
        { v: header.Nama || "-", s: styleDataCell },
        {
          v: num(header.SelisihBastMap),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: header.Berita_Acara || "-", s: styleDataCellCenter },
        { v: header.Divisi || "-", s: styleDataCellCenter },
        { v: header.Cab || "-", s: styleDataCellCenter },
        { v: header.Workshop || "-", s: styleDataCellCenter },
        { v: header.WorkshopSPK || "-", s: styleDataCellCenter },
        { v: header.Aktif || "-", s: styleDataCellCenter },
        {
          v:
            header.AccCustomer === "Y"
              ? `✓ ${formatTanggal(header.AccTanggal) || ""}`
              : "Belum",
          s: styleDataCellCenter,
        },
        { v: header.Surat_Jalan || "-", s: styleDataCellCenter },
        { v: header.Ukuran || "-", s: styleDataCellCenter },
        {
          v: num(header.Panjang),
          t: "n",
          z: "#,##0.##",
          s: styleDataCellRight,
        },
        { v: num(header.Lebar), t: "n", z: "#,##0.##", s: styleDataCellRight },
        { v: header.Gramasi || "-", s: styleDataCellCenter },
        { v: header.Kain || "-", s: styleDataCell },
        { v: header.Finishing || "-", s: styleDataCell },
        { v: num(header.Jumlah), t: "n", z: "#,##0", s: styleDataCellRight },
        { v: num(header.Kirim), t: "n", z: "#,##0", s: styleDataCellRight },
        ...(canLihatCus.value
          ? [{ v: header.Customer || "-", s: styleDataCell }]
          : []),
        { v: num(header.Rencana), t: "n", z: "#,##0", s: styleDataCellRight },
        { v: header.Salesman || "-", s: styleDataCell },
        { v: header.Tipe || "-", s: styleDataCellCenter },
        ...(canLihatHarga.value
          ? [
              {
                v: num(header.Harga),
                t: "n",
                z: "#,##0",
                s: styleDataCellRight,
              },
              {
                v: num(header.HargaRiil),
                t: "n",
                z: "#,##0",
                s: styleDataCellRight,
              },
            ]
          : []),
        { v: getCellValue(header, "Created"), s: styleDataCellCenter },
        { v: header.Revisi || "-", s: styleDataCellCenter },
        { v: header.NoReferensi || "-", s: styleDataCellCenter },
        { v: getCellValue(header, "EstimasiJadi"), s: styleDataCellCenter },
        { v: header.CloseStatus || "-", s: styleDataCellCenter },
        { v: header.SPK || "-", s: styleDataCellCenter },
        { v: getCellValue(header, "Design_Tanggal"), s: styleDataCellCenter },
        { v: header.Design_User || "-", s: styleDataCellCenter },
        { v: header.Design_Note || "-", s: styleDataCell },
        { v: header.Ngedit || "-", s: styleDataCellCenter },
        { v: header.Design_Baru || "-", s: styleDataCellCenter },
        { v: header.Design_Done || "-", s: styleDataCellCenter },
        { v: header.Keterangan || "-", s: styleDataCell },
      ];

      if (targetSizes.length > 0) {
        targetSizes.forEach((dtl: any) => {
          const qtySize = num(dtl.Qty);
          const stbjSize = num(dtl.Stbj);
          const kurangSize = num(dtl.Kurang);
          grandTotalDetailQty += qtySize;

          worksheetData.push([
            ...baseRowData,
            { v: dtl.Size || "-", s: styleDataCellCenter },
            { v: qtySize, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: stbjSize, t: "n", z: "#,##0", s: styleDataCellRight },
            { v: kurangSize, t: "n", z: "#,##0", s: styleDataCellRight },
          ]);
        });
      } else {
        worksheetData.push([
          ...baseRowData,
          { v: "-", s: styleDataCellCenter },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
        ]);
      }
    });

    const totalColsCount = headers.length - 1;
    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      ...Array(totalColsCount).fill({ v: "", s: styleFooter }),
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsCount } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsCount } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: totalColsCount - 4 },
      },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_MAP");
    XLSX.writeFile(wb, fileName);

    toast.success("Berhasil mengekspor data MAP ke Excel.");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    isExporting.value = false;
  }
};

const confirmToggleClose = async () => {
  isLoading.value = true;
  try {
    await mapService.toggleClose(closeItem.value.Nomor, closeAction.value);
    toast.success(
      `Berhasil ${closeAction.value === "Y" ? "di-Close" : "di-Open"}.`,
    );
    showCloseDialog.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal.");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Memo Approval Produk (MAP)"
    :menu-id="menuId"
    :icon="IconClipboardText"
    :headers="customHeaders"
    :items="filteredItems"
    item-value="Nomor"
    :is-loading="isLoading"
    height="500px"
    fixed-header
    v-model:selected="selected"
    v-model:startDate="startDate"
    v-model:endDate="endDate"
    v-model:start-date="startDate"
    v-model:end-date="endDate"
    has-print
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @print="cetak"
    @action:print="cetak"
    @export="exportToExcelCustom"
    @row-click="handleRowClick"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <v-btn
          v-if="activeFiltersCount > 0"
          color="warning"
          variant="tonal"
          size="x-small"
          @click="resetAllColumnFilters"
        >
          Reset Filter Kolom ({{ activeFiltersCount }})
        </v-btn>
      </div>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-grey"></div>
          <span>= Pasif</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= Aktif & Open</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-black"></div>
          <span>= Close</span>
        </div>
        <div class="legend-item">
          <v-chip color="error" size="x-small" density="comfortable"
            >Belum</v-chip
          >
          <span>= Belum Acc Cust</span>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="isBagianDesain"
        size="small"
        variant="flat"
        color="deep-purple-darken-1"
        :loading="isLoadingDesign"
        @click="openDesignDialog"
      >
        <template #prepend>
          <IconBrush :size="15" :stroke-width="1.7" />
        </template>
        Update Status Design
      </v-btn>

      <!-- TOMBOL EXCEL KUSTOM -->
      <v-btn
        size="small"
        variant="flat"
        color="success"
        :loading="isExporting"
        @click="exportToExcelCustom"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export Excel
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
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
        color="teal-darken-1"
        :disabled="selected.length === 0"
        @click="lihatGambar"
      >
        <template #prepend>
          <IconPhoto :size="15" :stroke-width="1.7" />
        </template>
        Lihat Gambar
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template v-slot:activator="{ props }">
          <v-btn color="primary" variant="flat" size="small" v-bind="props">
            Aksi MAP
            <template #append>
              <IconChevronDown :size="14" :stroke-width="2" />
            </template>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item @click="pengajuanPerubahan">
            <template #prepend>
              <IconFileDescription :size="16" :stroke-width="1.7" />
            </template>
            <v-list-item-title>Pengajuan Perubahan</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openApprovalDialog">
            <template #prepend>
              <IconDiscountCheck :size="16" :stroke-width="1.7" />
            </template>
            <v-list-item-title>Approval MAP</v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item @click="openCloseDialog('Y')">
            <template #prepend>
              <IconLock :size="16" :stroke-width="1.7" />
            </template>
            <v-list-item-title>Close Data</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openCloseDialog('N')">
            <template #prepend>
              <IconLockOpen :size="16" :stroke-width="1.7" />
            </template>
            <v-list-item-title>Open Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <!-- EXCEL FILTER, DRAGGABLE & RESIZABLE PER HEADER KOLOM -->
    <template
      v-for="header in customHeaders"
      :key="header.key"
      #[`header.${header.key}`]="{ column }"
    >
      <div
        class="d-flex align-center justify-space-between w-100 draggable-header-cell position-relative"
        :class="{ 'header-drop-target': dragOverKey === header.key }"
        draggable="true"
        @dragstart="onDragStart($event, header.key)"
        @dragover="onDragOver"
        @dragenter="onDragEnter(header.key)"
        @dragleave="onDragLeave(header.key)"
        @drop="onDrop($event, header.key)"
      >
        <span class="font-weight-bold text-truncate mr-1 header-drag-title">
          {{ column.title }}
        </span>

        <div class="d-flex align-center">
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
                @click.stop
                @mousedown.stop
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

          <!-- Resizer Handle di kanan header -->
          <div
            class="column-resizer"
            @mousedown.stop.prevent="startResize($event, header.key)"
          ></div>
        </div>
      </div>
    </template>

    <!-- Custom Columns Formatting -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>
    <template #item.TglBast="{ item }">
      {{ formatTanggal(item.TglBast) }}
    </template>
    <template #item.EstimasiJadi="{ item }">
      {{ formatTanggal(item.EstimasiJadi) }}
    </template>
    <template #item.Design_Tanggal="{ item }">
      {{ formatTanggal(item.Design_Tanggal) }}
    </template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <template #item.Panjang="{ item }">{{ fmtNum(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ fmtNum(item.Lebar) }}</template>
    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
    <template #item.Rencana="{ item }">{{ fmtNum(item.Rencana) }}</template>
    <template #item.Harga="{ item }">{{ fmtNum(item.Harga) }}</template>
    <template #item.HargaRiil="{ item }">{{ fmtNum(item.HargaRiil) }}</template>

    <template #item.Keterangan="{ item }">
      <div class="text-truncate-cell" :title="item.Keterangan">
        {{ item.Keterangan }}
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="d-flex align-center gap-2">
        <span class="font-weight-bold">{{ item.Nomor }}</span>
        <v-chip
          v-if="item.Ngedit === 'WAIT'"
          color="warning"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >WAIT</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'TOLAK'"
          color="error"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >TOLAK</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'ACC'"
          color="success"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >ACC</v-chip
        >
      </div>
    </template>

    <template #item.AccCustomer="{ item }">
      <v-chip
        v-if="item.AccCustomer === 'Y'"
        color="success"
        size="x-small"
        density="comfortable"
        class="font-weight-bold"
      >
        ✓ {{ formatTanggal(item.AccTanggal) }}
      </v-chip>
      <v-chip
        v-else
        color="error"
        size="x-small"
        density="comfortable"
        class="font-weight-bold"
      >
        Belum
      </v-chip>
    </template>

    <template #item.Nama="{ item }">
      <div
        :class="{
          'bg-yellow pa-1 rounded font-weight-bold':
            item.Design_Baru === 'Y' && item.Design_Done === 'N',
        }"
        class="text-truncate-cell"
        :title="item.Nama"
      >
        {{ item.Nama }}
      </div>
    </template>

    <template #item.Customer="{ item }">
      <div class="text-truncate-cell" :title="item.Customer">
        {{ item.Customer }}
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Display Gambar -->
  <v-dialog v-model="dialogGambar" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span>Gambar MAP: {{ selected[0]?.Nomor }}</span>
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="dialogGambar = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="gambarUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
          @error="onGambarError"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="40"
              ></v-progress-circular>
              <div class="text-caption mt-2 text-grey-darken-1">
                Sedang memuat gambar...
              </div>
            </div>
          </template>
          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <IconPhotoOff :size="48" color="#bdbdbd" />
              <div class="text-subtitle-2 mt-2">Gambar tidak tersedia</div>
            </div>
          </template>
        </v-img>
      </v-card-text>

      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" :href="gambarUrl" target="_blank">
          <template #prepend>
            <IconExternalLink :size="15" :stroke-width="1.7" />
          </template>
          Buka di Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Pengajuan Perubahan -->
  <v-dialog v-model="dialogAlasan" max-width="500px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center"
      >
        <IconFileDescription
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        Pengajuan Perubahan Data MAP
      </v-card-title>
      <v-card-text class="pa-4 pt-4">
        <div class="text-body-2 mb-2 font-weight-medium">
          MAP: {{ alasanNomor }}
        </div>
        <v-textarea
          v-model="alasanText"
          label="Alasan Pengajuan"
          variant="outlined"
          auto-grow
          rows="3"
          hide-details
          placeholder="Tuliskan alasan perubahan data secara jelas..."
        ></v-textarea>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="error" @click="dialogAlasan = false"
          >Batal</v-btn
        >
        <v-btn color="primary" variant="elevated" @click="submitPengajuan"
          >Kirim Pengajuan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Cetak MAP -->
  <v-dialog v-model="showPrintDialog" max-width="450px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold"
          >Cetak Surat Pra SO (MAP)</span
        >
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-4 text-grey-darken-3">
          Mencetak dokumen MAP: <strong>{{ printNomorBrowse }}</strong
          ><br />
          Silakan pilih orientasi cetaknya:
        </div>
        <div class="d-flex flex-column gap-2">
          <v-btn
            color="primary"
            variant="flat"
            @click="pilihGambarVertikalBrowse"
          >
            <template #prepend>
              <IconLayoutSidebarRight :size="15" :stroke-width="1.7" />
            </template>
            Cetak Vertikal (Portrait)
          </v-btn>
          <v-btn
            color="info"
            variant="tonal"
            @click="pilihGambarHorizontalBrowse"
          >
            <template #prepend>
              <IconLayoutSidebarRightCollapse :size="15" :stroke-width="1.7" />
            </template>
            Cetak Horizontal (Landscape)
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="showPrintDialog = false"
          >Batal</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Confirmation Approval -->
  <v-dialog v-model="showApprovalDialog" max-width="380px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header bg-success">
        <IconDiscountCheck size="16" color="white" class="mr-2" />
        Konfirmasi Approval MAP
        <button class="dlg-x" @click="showApprovalDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Yakin ingin meng-approve MAP:</div>
        <div
          class="text-primary font-weight-bold"
          style="font-size: 13px; margin-top: 6px"
        >
          {{ approvalItem?.Nomor }}
        </div>
        <div style="font-size: 11px; color: #555; margin-top: 4px">
          {{ approvalItem?.Nama }}
        </div>
        <div style="font-size: 11px; color: #555; margin-top: 2px">
          MO: {{ approvalItem?.MO }}
        </div>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white bg-success"
          :disabled="isLoading"
          @click="confirmApproval"
        >
          {{ isLoading ? "Memproses..." : "Ya, Approve" }}
        </button>
        <button
          class="dlg-btn cancel"
          :disabled="isLoading"
          @click="showApprovalDialog = false"
        >
          Batal
        </button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog Toggle Close/Open -->
  <v-dialog v-model="showCloseDialog" max-width="380px" persistent>
    <div class="close-dlg">
      <div
        class="close-dlg-header"
        :class="closeAction === 'Y' ? 'bg-error' : 'bg-success'"
      >
        <component
          :is="closeAction === 'Y' ? IconLock : IconLockOpen"
          size="16"
          color="white"
          class="mr-2"
        />
        {{
          closeAction === "Y" ? "Konfirmasi Close Data" : "Konfirmasi Open Data"
        }}
        <button class="dlg-x" @click="showCloseDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">
          {{
            closeAction === "Y"
              ? "Yakin ingin meng-Close MAP:"
              : "Yakin ingin meng-Open MAP:"
          }}
        </div>
        <div
          class="text-primary font-weight-bold"
          style="font-size: 13px; margin-top: 6px"
        >
          {{ closeItem?.Nomor }}
        </div>
        <div style="font-size: 11px; color: #555; margin-top: 4px">
          {{ closeItem?.Nama }}
        </div>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          :class="closeAction === 'Y' ? 'bg-error' : 'bg-success'"
          :disabled="isLoading"
          @click="confirmToggleClose"
        >
          {{
            isLoading
              ? "Memproses..."
              : closeAction === "Y"
                ? "Ya, Close"
                : "Ya, Open"
          }}
        </button>
        <button
          class="dlg-btn cancel"
          :disabled="isLoading"
          @click="showCloseDialog = false"
        >
          Batal
        </button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog Update Status Design -->
  <v-dialog v-model="dialogDesign" max-width="600px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-deep-purple-darken-1 text-white d-flex align-center pa-3"
      >
        <IconBrush :size="18" :stroke-width="1.7" color="white" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold"
          >Update Status Design</span
        >
      </v-card-title>
      <v-card-text class="pa-0">
        <div v-if="isLoadingDesign" class="pa-6 text-center text-grey">
          Memuat data...
        </div>
        <div
          v-else-if="designList.length === 0"
          class="pa-6 text-center text-grey"
        >
          Tidak ada MAP dengan Design Baru yang belum selesai di periode ini.
        </div>
        <v-table v-else density="compact" fixed-header height="360px">
          <thead>
            <tr>
              <th style="width: 140px">No. SPK/MAP</th>
              <th>Nama</th>
              <th style="width: 100px; text-align: center">Selesai</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in designList" :key="row.Nomor">
              <td class="font-weight-bold text-primary" style="font-size: 12px">
                {{ row.Nomor }}
              </td>
              <td style="font-size: 12px">{{ row.Nama }}</td>
              <td class="text-center">
                <input
                  type="checkbox"
                  :checked="row.DesignDone === 'Y'"
                  @change="row.DesignDone = row.DesignDone === 'Y' ? 'N' : 'Y'"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer />
        <v-btn
          variant="text"
          color="error"
          :disabled="isSavingDesign"
          @click="dialogDesign = false"
          >Batal</v-btn
        >
        <v-btn
          color="deep-purple-darken-1"
          variant="elevated"
          :loading="isSavingDesign"
          :disabled="designList.length === 0"
          @click="submitDesignStatus"
          >Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
.bg-yellow {
  background-color: #ffeb3b !important;
  color: #000;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}

/* BaseBrowse Container & Table Custom Scrollbar + Fixed Header/Footer */
:deep(.v-table__wrapper),
:deep(.v-data-table__overflow) {
  max-height: 500px !important;
  overflow-y: auto !important;
}

:deep(.v-data-table-footer),
:deep(.v-data-table__footer) {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 2 !important;
  background-color: #ffffff !important;
  border-top: 1px solid #e0e0e0;
}

/* Style Highlight Klik Baris */
:deep(.row-selected td) {
  background-color: #e3f2fd !important;
}

/* Legend Styles */
.legend-group {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.bg-grey {
  background-color: #9e9e9e;
}
.bg-red {
  background-color: #d32f2f;
}
.bg-black {
  background-color: #212121;
}

/* Cell Truncate */
.text-truncate-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  font-size: 11px;
}

/* Row Highlights */
:deep(.row-passive td) {
  color: #9e9e9e !important;
}

:deep(.row-active-open td) {
  color: #d32f2f !important;
  font-weight: 600 !important;
}

/* Dialog Styling */
.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  color: white;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: white;
  font-size: 15px;
  cursor: pointer;
}
.close-dlg-body {
  padding: 14px;
}
.f-lbl-sm {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.close-dlg-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.dlg-btn {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}

.draggable-header-cell {
  cursor: grab;
  user-select: none;
  transition:
    background-color 0.2s ease,
    border 0.2s ease;
  padding: 2px 4px;
  border-radius: 4px;
  position: relative;
}

.draggable-header-cell:active {
  cursor: grabbing;
}

.header-drag-title {
  cursor: grab;
}

.header-drop-target {
  background-color: rgba(25, 118, 210, 0.15) !important;
  outline: 2px dashed #1976d2 !important;
}

/* Column Resizer Handle */
.column-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background-color: transparent;
  z-index: 3;
  transition: background-color 0.2s;
}

.column-resizer:hover,
.draggable-header-cell:hover .column-resizer {
  background-color: rgba(0, 0, 0, 0.15);
}
</style>
