<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, isValid, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import { soToSpkService } from "@/services/mmt/soToSpkService";
import BaseBrowse from "@/components/BaseBrowse.vue";

// --- Type Definitions ---
interface SpkDetailSize {
  Nomor: string;
  Size: string;
  Qty: number;
  Stbj: number;
  Kurang: number;
}

interface SpkHeader {
  SO?: string;
  SPK: string;
  Nomor?: string;
  MO: string;
  CMO: string;
  SO_Tanggal?: string;
  Tanggal?: string | null;
  Dateline?: string;
  CMO_Tanggal?: string;
  Deadline?: string;
  Kepentingan: string;
  Divisi: string;
  Nama: string;
  Cab: string;
  Workshop: string;
  Pending: string;
  Ket_Pending: string;
  Tipe_SPK: string;
  Panjang: number;
  Lebar: number;
  Gramasi: string;
  Bahan: string;
  Finishing: string;
  Pesan: number;
  PraSJ: number;
  Kirim: number;
  Created: string;
  PO: string;
  Ket_PO: string;
  Dateline_PO: string;
  STATUS: string;
  Alasan_Close: string;
  No_Penawaran: string;
  MAP: string;
  GambarUrl?: string;
  gambar?: string;
  Potong: string;
  Repeat: string;
  QC_Potong: string;
  Bordir: string;
  Sudah_Cetak: number;
  QC_Cetak: string;
  DC: string;
  Jahit: string;
  Lipat: string;
  Jadi: number;
  Kurang_Jadi: number;
  Kurang_Potong: number;
  Kurang_Bordir: number;
  Kurang_Cetak_Prod: number;
  Kurang_QC_Cetak: number;
  Kurang_Jahit: number;
  Kurang_Lipat: number;
  Aktif: string;
  Ngedit: string;
  Acc_MO: string;
  design_baru?: string;
  design_done?: string;
}

const router = useRouter();
const toast = useToast();

// --- State ---
const masterData = ref<SpkHeader[]>([]);
const details = ref<Record<string, SpkDetailSize[]>>({});
const loading = ref<boolean>(false);
const isExporting = ref<boolean>(false);
const loadingDetails = ref<Set<string>>(new Set());
const selected = ref<SpkHeader[]>([]);
const expanded = ref<any[]>([]);

const currentFilteredItems = ref<SpkHeader[]>([]);

const startDate = ref<string>(format(new Date(), "yyyy-MM-dd"));
const endDate = ref<string>(format(new Date(), "yyyy-MM-dd"));
const keyword = ref<string>("");

// --- PREVIEW MODAL STATE ---
const showPreviewDialog = ref<boolean>(false);
const previewUrl = ref<string>("");
const previewSpkNomor = ref<string>("");
const isIframeLoading = ref<boolean>(true);

// --- AUTO GENERATE SPK STATE ---
const isGeneratingSpk = ref<boolean>(false);
const showConfirmGenerateDialog = ref<boolean>(false);
const targetSoToGenerate = ref<SpkHeader | null>(null);

// --- GAMBAR DESAIN DI MODAL KONFIRMASI SPK ---
const confirmImageUrl = ref<string>("");
const confirmImageLoading = ref<boolean>(false);
const confirmImageError = ref<boolean>(false);
const MEDIA_SERVER = "https://manksi.com";

const resolveConfirmImage = (target: SpkHeader | null) => {
  confirmImageUrl.value = "";
  confirmImageError.value = false;

  if (!target) {
    confirmImageLoading.value = false;
    return;
  }

  const direct = (target as any).GambarUrl || (target as any).gambar;
  const map = String(
    (target as any).MAP || (target as any).so_map || "",
  ).trim();
  const cab = String(target.Cab || "").trim() || "P05";
  const nomor = String(
    (target as any).SO || (target as any).Nomor || target.SPK || "",
  ).trim();

  const candidates: string[] = [];
  if (direct) candidates.push(direct);
  if (map)
    candidates.push(
      `${MEDIA_SERVER}/images/${cab}/map/${encodeURIComponent(map)}.jpg`,
    );
  if (nomor)
    candidates.push(
      `${MEDIA_SERVER}/images/${cab}/${encodeURIComponent(nomor)}.jpg`,
    );

  if (candidates.length === 0) {
    confirmImageLoading.value = false;
    confirmImageError.value = true;
    return;
  }

  confirmImageLoading.value = true;
  const tryNext = (idx: number) => {
    if (idx >= candidates.length) {
      confirmImageUrl.value = "";
      confirmImageError.value = true;
      confirmImageLoading.value = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      confirmImageUrl.value = candidates[idx];
      confirmImageError.value = false;
      confirmImageLoading.value = false;
    };
    img.onerror = () => tryNext(idx + 1);
    img.src = candidates[idx];
  };
  tryNext(0);
};

// --- STATE AKSI CLOSE / OPEN SPK ---
const showCloseDialog = ref<boolean>(false);
const closeAction = ref<"Y" | "N">("Y");
const closeItem = ref<SpkHeader | null>(null);
const closeAlasan = ref<string>("");
const isProcessingClose = ref<boolean>(false);

// Helper unik identifier per baris (prioritas nomor SPK valid, lalu nomor SO)
const getRowIdentifier = (item: any): string => {
  if (!item) return "";
  const spk = String(item.SPK || item.Nomor || "").trim();
  if (spk && spk !== "-") return spk;
  return String(item.SO || "").trim();
};

// --- Table Headers ---
const masterHeaders = [
  { title: "Nomor SO", key: "SO", width: "160px", minWidth: "160px" },
  { title: "Nomor SPK", key: "SPK", width: "160px", minWidth: "160px" },
  { title: "MO", key: "MO", width: "100px" },
  { title: "CMO", key: "CMO", width: "120px" },
  { title: "Tanggal SO", key: "SO_Tanggal", minWidth: "110px", width: "110px" },
  {
    title: "Tanggal ACC MO",
    key: "CMO_Tanggal",
    minWidth: "160px",
    width: "160px",
  },
  { title: "Tanggal SPK", key: "Tanggal", minWidth: "110px", width: "110px" },
  { title: "Dateline", key: "Dateline", minWidth: "110px", width: "110px" },
  { title: "Kepentingan", key: "Kepentingan", width: "120px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Nama Pesanan", key: "Nama", width: "250px" },
  { title: "Cabang", key: "Cab", width: "120px" },
  { title: "Workshop", key: "Workshop", width: "120px" },
  { title: "Pending", key: "Pending", width: "100px" },
  { title: "Ket Pending", key: "Ket_Pending", width: "180px" },
  { title: "Tipe", key: "Tipe_SPK", width: "100px" },
  { title: "Panjang", key: "Panjang", width: "90px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "90px", align: "end" },
  { title: "Gramasi", key: "Gramasi", width: "100px" },
  { title: "Kain/Bahan", key: "Bahan", width: "150px" },
  { title: "Finishing", key: "Finishing", width: "130px" },
  { title: "Pesan", key: "Pesan", width: "150px" },
  { title: "PraSJ", key: "PraSJ", width: "90px", align: "end" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "end" },
  { title: "Kurang", key: "Kurang_Cetak_Prod", width: "90px", align: "end" },
  { title: "Created By", key: "Created", width: "110px" },
  { title: "PO", key: "PO", width: "120px" },
  { title: "Ket PO", key: "Ket_PO", width: "150px" },
  { title: "Dateline PO", key: "Dateline_PO", width: "110px" },
  { title: "Status", key: "STATUS", width: "100px" },
  { title: "Alasan Close", key: "Alasan_Close", width: "180px" },
  { title: "No Penawaran", key: "No_Penawaran", width: "140px" },
  { title: "MAP", key: "MAP", width: "100px" },
  { title: "Potong", key: "Potong", width: "90px", align: "end" },
  { title: "Repeat", key: "Repeat", width: "90px" },
  { title: "QC Potong", key: "QC_Potong", width: "100px", align: "end" },
  { title: "Bordir", key: "Bordir", width: "90px", align: "end" },
  { title: "Cetak", key: "Sudah_Cetak", width: "90px", align: "end" },
  { title: "QC Cetak", key: "QC_Cetak", width: "100px", align: "end" },
  { title: "DC", key: "DC", width: "90px", align: "end" },
  { title: "Jahit", key: "Jahit", width: "90px", align: "end" },
  { title: "Lipat", key: "Lipat", width: "90px", align: "end" },
  { title: "Jadi", key: "Jadi", width: "90px", align: "end" },
  { title: "Kurang Jadi", key: "Kurang_Jadi", width: "110px", align: "end" },
  {
    title: "Kurang Potong",
    key: "Kurang_Potong",
    width: "120px",
    align: "end",
  },
  {
    title: "Kurang Bordir",
    key: "Kurang_Bordir",
    width: "120px",
    align: "end",
  },
  {
    title: "Kurang Cetak",
    key: "Kurang_Cetak_Prod",
    width: "120px",
    align: "end",
  },
  {
    title: "Kurang QC Cetak",
    key: "Kurang_QC_Cetak",
    width: "130px",
    align: "end",
  },
  { title: "Kurang Jahit", key: "Kurang_Jahit", width: "110px", align: "end" },
  { title: "Kurang Lipat", key: "Kurang_Lipat", width: "110px", align: "end" },
  { title: "Aktif", key: "Aktif", width: "80px" },
  { title: "ACC PIN", key: "Ngedit", width: "100px" },
  { title: "Acc MO", key: "Acc_MO", width: "100px" },
];

const detailHeaders = [
  { title: "Ukuran/Size", key: "Size", minWidth: "120px" },
  { title: "Qty SPK / SO", key: "Qty", minWidth: "100px", align: "end" },
  { title: "Realisasi STBJ", key: "Stbj", minWidth: "120px", align: "end" },
  { title: "Sisa Kurang", key: "Kurang", minWidth: "120px", align: "end" },
];

// Helper parse string tanggal ke format dd/MM/yyyy
const formatDateDisplay = (dateStr: string | null | undefined): string => {
  if (
    !dateStr ||
    dateStr === "-" ||
    dateStr === "null" ||
    String(dateStr).trim() === "" ||
    String(dateStr).startsWith("0000")
  ) {
    return "-";
  }
  const str = String(dateStr).trim();

  if (str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime()) && isValid(d)) return format(d, "dd/MM/yyyy");
    const p = parseISO(str);
    if (isValid(p)) return format(p, "dd/MM/yyyy");
  }

  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const p2 = parseISO(str);
  if (isValid(p2)) return format(p2, "dd/MM/yyyy");

  if (/^\d{2}[\/-]\d{2}[\/-]\d{4}/.test(str)) {
    return str.substring(0, 10).replace(/-/g, "/");
  }

  return str;
};

const formatDateTimeDisplay = (dateStr: string | null | undefined): string => {
  if (
    !dateStr ||
    dateStr === "-" ||
    dateStr === "null" ||
    String(dateStr).trim() === "" ||
    String(dateStr).startsWith("0000")
  ) {
    return "-";
  }
  const str = String(dateStr).trim();

  const dbMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (dbMatch) {
    const [, year, month, day, hour, minute] = dbMatch;
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  if (str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime()) && isValid(d)) {
      return format(d, "dd/MM/yyyy HH:mm");
    }
  }

  return formatDateDisplay(str);
};

const parseToExcelDate = (dateValue?: string | Date | null): Date | null => {
  if (!dateValue || dateValue === "-") return null;
  try {
    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }
    const value = String(dateValue).trim();
    if (!value || value === "-") return null;

    const dmyMatch = value.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
      );
    }

    const ymdMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
      );
    }
    return null;
  } catch (error) {
    console.error("Gagal parse tanggal ke Date:", error);
    return null;
  }
};

const parseToExcelDateTime = (
  dateValue?: string | Date | null,
): Date | null => {
  if (!dateValue || dateValue === "-") return null;
  try {
    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }
    const value = String(dateValue).trim();
    if (!value || value === "-") return null;

    const ymdMatch = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
    );
    if (ymdMatch) {
      const [, year, month, day, hour, minute, second] = ymdMatch;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hour, 10),
        parseInt(minute, 10),
        parseInt(second || "0", 10),
      );
    }
    return parseToExcelDate(value);
  } catch (error) {
    console.error("Gagal parse tanggal + jam ke Date:", error);
    return null;
  }
};

const getStatusColor = (item: SpkHeader) => {
  if (item.STATUS === "Closed") return "grey";
  if (item.Ngedit === "WAIT") return "blue";
  if (item.Ngedit === "ACC") return "success";
  if (item.Ngedit === "TOLAK") return "error";
  return "orange";
};

const filteredMasterData = computed(() => {
  if (!keyword.value.trim()) return masterData.value;
  const kw = keyword.value.toLowerCase();
  return masterData.value.filter((item) => {
    const spk = String(item.SPK || (item as any).Nomor || "").toLowerCase();
    const so = String(item.SO || "").toLowerCase();
    const nama = String(item.Nama || "").toLowerCase();
    return spk.includes(kw) || so.includes(kw) || nama.includes(kw);
  });
});

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedItem = computed(() =>
  isSingleSelected.value ? selected.value[0] : null,
);

// --- ACTION CLOSE / OPEN SPK METHODS ---
const openCloseSpkDialog = (action: "Y" | "N") => {
  if (!selectedItem.value) {
    toast.error("Pilih salah satu SPK terlebih dahulu.");
    return;
  }
  const nomorSpk = selectedItem.value.SPK || (selectedItem.value as any).Nomor;
  if (!nomorSpk || nomorSpk === "-") {
    toast.warning("Baris ini belum memiliki nomor SPK.");
    return;
  }

  closeAction.value = action;
  closeItem.value = selectedItem.value;
  closeAlasan.value = selectedItem.value.Alasan_Close || "";
  showCloseDialog.value = true;
};

const confirmToggleCloseSpk = async () => {
  if (!closeItem.value) return;
  const nomorSpk = closeItem.value.SPK || (closeItem.value as any).Nomor;

  if (closeAction.value === "Y" && !closeAlasan.value.trim()) {
    toast.warning("Alasan Close SPK harus diisi!");
    return;
  }

  isProcessingClose.value = true;
  try {
    await soToSpkService.toggleClose(nomorSpk, {
      isClose: closeAction.value === "Y",
      alasan: closeAlasan.value,
    });

    toast.success(
      `SPK ${nomorSpk} berhasil ${closeAction.value === "Y" ? "di-Close" : "di-Open"}.`,
    );
    showCloseDialog.value = false;
    await fetchData();
  } catch (error: any) {
    console.error("Gagal toggle status close SPK:", error);
    toast.error(
      error.response?.data?.message ||
        `Gagal ${closeAction.value === "Y" ? "menutup" : "membuka"} SPK.`,
    );
  } finally {
    isProcessingClose.value = false;
  }
};

// --- EXPORT TO EXCEL METHOD ---
const exportToExcel = async () => {
  if (currentFilteredItems.value.length === 0) {
    return toast.warning(
      "Tidak ada data yang sesuai dengan filter untuk diekspor.",
    );
  }

  isExporting.value = true;

  try {
    const sortedItems = [...currentFilteredItems.value].sort(
      (a: any, b: any) => {
        const getNum = (val: string) => {
          if (!val || val === "-") return 0;
          const strVal = String(val).trim();
          if (strVal.includes("/")) {
            const parts = strVal.split("/");
            if (parts.length === 3) {
              return (
                (parseInt(parts[2], 10) || 0) * 10000 +
                (parseInt(parts[1], 10) || 0) * 100 +
                (parseInt(parts[0], 10) || 0)
              );
            }
          } else if (strVal.includes("-")) {
            const parts = strVal.substring(0, 10).split("-");
            if (parts.length === 3) {
              return (
                (parseInt(parts[0], 10) || 0) * 10000 +
                (parseInt(parts[1], 10) || 0) * 100 +
                (parseInt(parts[2], 10) || 0)
              );
            }
          }
          return 0;
        };
        return getNum(a.Tanggal) - getNum(b.Tanggal);
      },
    );

    // Sync detail sizes untuk SPK maupun SO
    for (const header of sortedItems) {
      const identifier = getRowIdentifier(header);
      if (
        identifier &&
        (!details.value[identifier] || details.value[identifier].length === 0)
      ) {
        try {
          const res = await soToSpkService.getSizes(identifier);
          const resData = res.data?.data ?? res.data;
          details.value[identifier] = Array.isArray(resData) ? resData : [];
        } catch (e) {
          console.error(`Gagal sync detail ${identifier}:`, e);
          details.value[identifier] = [];
        }
      }
    }

    const fileName = `Monitoring_SO_to_SPK_${startDate.value}_sd_${endDate.value}.xlsx`;

    const num = (value: any): number => {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
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
      { v: "MONITORING SO TO SPK", s: { font: { bold: true, sz: 14 } } },
    ]);
    worksheetData.push([
      {
        v: `Tanggal Periode : ${startDate.value} s.d ${endDate.value} | Filter Keyword: ${keyword.value || "Semua"}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headers = [
      { v: "NOMOR SO", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "MO", s: styleHeaderMain },
      { v: "CMO", s: styleHeaderMain },
      { v: "TANGGAL SO", s: styleHeaderMain },
      { v: "TANGGAL ACC MO", s: styleHeaderMain },
      { v: "TANGGAL SPK", s: styleHeaderMain },
      { v: "DATELINE", s: styleHeaderMain },
      { v: "KEPENTINGAN", s: styleHeaderMain },
      { v: "DIVISI", s: styleHeaderMain },
      { v: "NAMA PESANAN", s: styleHeaderMain },
      { v: "CABANG", s: styleHeaderMain },
      { v: "WORKSHOP", s: styleHeaderMain },
      { v: "PENDING", s: styleHeaderMain },
      { v: "KET PENDING", s: styleHeaderMain },
      { v: "TIPE", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "GRAMASI", s: styleHeaderMain },
      { v: "KAIN/BAHAN", s: styleHeaderMain },
      { v: "FINISHING", s: styleHeaderMain },
      { v: "PESAN", s: styleHeaderMain },
      { v: "PRASJ", s: styleHeaderMain },
      { v: "KIRIM", s: styleHeaderMain },
      { v: "KURANG", s: styleHeaderMain },
      { v: "CREATED BY", s: styleHeaderMain },
      { v: "PO", s: styleHeaderMain },
      { v: "KET PO", s: styleHeaderMain },
      { v: "DATELINE PO", s: styleHeaderMain },
      { v: "STATUS", s: styleHeaderMain },
      { v: "ALASAN CLOSE", s: styleHeaderMain },
      { v: "NO PENAWARAN", s: styleHeaderMain },
      { v: "MAP", s: styleHeaderMain },
      { v: "POTONG", s: styleHeaderMain },
      { v: "REPEAT", s: styleHeaderMain },
      { v: "QC POTONG", s: styleHeaderMain },
      { v: "BORDIR", s: styleHeaderMain },
      { v: "CETAK", s: styleHeaderMain },
      { v: "QC CETAK", s: styleHeaderMain },
      { v: "DC", s: styleHeaderMain },
      { v: "JAHIT", s: styleHeaderMain },
      { v: "LIPAT", s: styleHeaderMain },
      { v: "JADI", s: styleHeaderMain },
      { v: "KURANG JADI", s: styleHeaderMain },
      { v: "KURANG POTONG", s: styleHeaderMain },
      { v: "KURANG BORDIR", s: styleHeaderMain },
      { v: "KURANG CETAK", s: styleHeaderMain },
      { v: "KURANG QC CETAK", s: styleHeaderMain },
      { v: "KURANG JAHIT", s: styleHeaderMain },
      { v: "KURANG LIPAT", s: styleHeaderMain },
      { v: "AKTIF", s: styleHeaderMain },
      { v: "ACC PIN", s: styleHeaderMain },
      { v: "ACC MO", s: styleHeaderMain },
      { v: "UKURAN/SIZE (DETAIL)", s: styleHeaderMain },
      { v: "QTY SPK (DETAIL)", s: styleHeaderMain },
      { v: "REALISASI STBJ (DETAIL)", s: styleHeaderMain },
      { v: "SISA KURANG (DETAIL)", s: styleHeaderMain },
    ];
    worksheetData.push(headers);

    let grandTotalQtySPK = 0;
    let grandTotalStbj = 0;
    let grandTotalKurang = 0;
    let grandTotalPraSJ = 0;
    let grandTotalKirim = 0;

    sortedItems.forEach((header) => {
      const spkNomor = header.SPK || (header as any).Nomor || "-";
      const soNomor = header.SO || "-";
      const identifier = getRowIdentifier(header);
      const targetSizes = details.value[identifier] || [];

      const soTanggalExcel = parseToExcelDate(header.SO_Tanggal);
      const cmoTanggalExcel = parseToExcelDateTime(header.CMO_Tanggal);
      const tglExcel =
        spkNomor && spkNomor !== "-" ? parseToExcelDate(header.Tanggal) : null;
      const datelineExcel = parseToExcelDate(header.Dateline);
      const datelinePoExcel = parseToExcelDate(header.Dateline_PO);
      const cabText = header.Cab || (header as any).Cabang || "-";

      grandTotalPraSJ += num(header.PraSJ);
      grandTotalKirim += num(header.Kirim);

      const baseRowData = [
        { v: soNomor, s: styleDataCellCenter },
        { v: spkNomor, s: styleDataCellCenter },
        { v: header.MO || "-", s: styleDataCellCenter },
        { v: header.CMO || "-", s: styleDataCellCenter },
        soTanggalExcel
          ? {
              v: soTanggalExcel,
              t: "d",
              z: "dd/mm/yyyy",
              s: styleDataCellCenter,
            }
          : { v: "-", s: styleDataCellCenter },
        cmoTanggalExcel
          ? {
              v: cmoTanggalExcel,
              t: "d",
              z: "dd/mm/yyyy hh:mm",
              s: styleDataCellCenter,
            }
          : { v: "-", s: styleDataCellCenter },
        tglExcel
          ? { v: tglExcel, t: "d", z: "dd/mm/yyyy", s: styleDataCellCenter }
          : { v: "-", s: styleDataCellCenter },
        datelineExcel
          ? {
              v: datelineExcel,
              t: "d",
              z: "dd/mm/yyyy",
              s: styleDataCellCenter,
            }
          : { v: "-", s: styleDataCellCenter },
        { v: header.Kepentingan || "-", s: styleDataCell },
        { v: header.Divisi || "-", s: styleDataCellCenter },
        { v: header.Nama || "-", s: styleDataCell },
        { v: cabText, s: styleDataCellCenter },
        { v: header.Workshop || "-", s: styleDataCellCenter },
        { v: header.Pending || "-", s: styleDataCellCenter },
        {
          v: header.Ket_Pending || (header as any).KetPending || "-",
          s: styleDataCell,
        },
        {
          v: header.Tipe_SPK || (header as any).Tipe || "-",
          s: styleDataCellCenter,
        },
        {
          v: num(header.Panjang),
          t: "n",
          z: "#,##0.##",
          s: styleDataCellRight,
        },
        { v: num(header.Lebar), t: "n", z: "#,##0.##", s: styleDataCellRight },
        { v: header.Gramasi || "-", s: styleDataCellCenter },
        { v: header.Bahan || (header as any).Kain || "-", s: styleDataCell },
        { v: header.Finishing || "-", s: styleDataCell },
        { v: num(header.Pesan), t: "n", z: "#,##0", s: styleDataCellRight },
        {
          v: num(header.PraSJ || (header as any).Prasj),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: num(header.Kirim), t: "n", z: "#,##0", s: styleDataCellRight },
        {
          v: num(header.Kurang_Cetak_Prod || (header as any).Kurang),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: header.Created || "-", s: styleDataCellCenter },
        { v: header.PO || "-", s: styleDataCellCenter },
        { v: header.Ket_PO || (header as any).KetPO || "-", s: styleDataCell },
        datelinePoExcel
          ? {
              v: datelinePoExcel,
              t: "d",
              z: "dd/mm/yyyy",
              s: styleDataCellCenter,
            }
          : { v: "-", s: styleDataCellCenter },
        {
          v: header.STATUS || (header as any).Status || "-",
          s: styleDataCellCenter,
        },
        {
          v: header.Alasan_Close || (header as any).AlasanClose || "-",
          s: styleDataCell,
        },
        {
          v: header.No_Penawaran || (header as any).NoPenawaran || "-",
          s: styleDataCellCenter,
        },
        { v: header.MAP || "-", s: styleDataCellCenter },
        { v: num(header.Potong), t: "n", z: "#,##0", s: styleDataCellRight },
        { v: header.Repeat || "-", s: styleDataCellCenter },
        {
          v: num(header.QC_Potong || (header as any).QcPotong),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: num(header.Bordir), t: "n", z: "#,##0", s: styleDataCellRight },
        {
          v: num(header.Sudah_Cetak || (header as any).Cetak),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.QC_Cetak || (header as any).QcCetak),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.DC || (header as any).dc),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: num(header.Jahit), t: "n", z: "#,##0", s: styleDataCellRight },
        { v: num(header.Lipat), t: "n", z: "#,##0", s: styleDataCellRight },
        { v: num(header.Jadi), t: "n", z: "#,##0", s: styleDataCellRight },
        {
          v: num(header.Kurang_Jadi),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_Potong),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_Bordir),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_Cetak_Prod || (header as any).Kurang_Cetak),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_QC_Cetak || (header as any).Kurang_QcCetak),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_Jahit),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        {
          v: num(header.Kurang_Lipat),
          t: "n",
          z: "#,##0",
          s: styleDataCellRight,
        },
        { v: header.Aktif || "-", s: styleDataCellCenter },
        { v: header.Ngedit || "-", s: styleDataCellCenter },
        { v: header.Acc_MO || "-", s: styleDataCellCenter },
      ];

      if (targetSizes.length > 0) {
        targetSizes.forEach((dtl) => {
          const qtySize = num(dtl.Qty);
          const stbjSize = num(dtl.Stbj);
          const kurangSize = num(dtl.Kurang);

          grandTotalQtySPK += qtySize;
          grandTotalStbj += stbjSize;
          grandTotalKurang += kurangSize;

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

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: {
          ...styleFooter,
          alignment: { horizontal: "right", vertical: "center" },
        },
      },
      ...Array(Math.max(0, headers.length - 1)).fill({
        v: "",
        s: styleFooter,
      }),
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const lastColumnIndex = Math.max(0, headers.length - 1);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: {
          r: worksheetData.length - 1,
          c: Math.max(0, lastColumnIndex - 4),
        },
      },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring_SO_SPK");
    XLSX.writeFile(wb, fileName);

    toast.success("Excel Berhasil Diexport Sesuai Kolom Frontend dan Terurut!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data terfilter.");
  } finally {
    isExporting.value = false;
  }
};

// --- API Methods ---
let abortController: AbortController | null = null;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  if (!startDate.value || !endDate.value) return;

  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  loading.value = true;
  selected.value = [];
  expanded.value = [];

  try {
    const res = await soToSpkService.getBrowse(
      {
        startDate: startDate.value,
        endDate: endDate.value,
        keyword: keyword.value,
      },
      { signal: abortController.signal },
    );

    const result = res.data?.data ?? res.data;

    if (Array.isArray(result)) {
      const uniqueMap = new Map();

      result.forEach((item: any) => {
        const soVal = String(item.SO || "").trim();
        const nomorVal = String(item.Nomor || item.SPK || "").trim();

        if (!soVal && !nomorVal) return;

        const uniqueKey = soVal || nomorVal;

        if (!uniqueMap.has(uniqueKey)) {
          const spkVal = item.Nomor || item.SPK || "-";

          uniqueMap.set(uniqueKey, {
            ...item,
            SPK: spkVal,
            Nomor: spkVal,
            SO_Tanggal: item.SO_Tanggal || item.so_tanggal || "",
            Tanggal:
              spkVal && spkVal !== "-" ? item.Tanggal || item.tanggal || item.Tgl || null : "-",
            Dateline: item.Dateline || item.dateline || "",
            CMO_Tanggal: item.CMO_Tanggal || item.cmo_tanggal || "",
            Deadline: item.Deadline || item.deadline || item.Dateline || "",
            Dateline_PO: item.Dateline_PO || item.dateline_po || "",
          });
        }
      });

      const processedItems = Array.from(uniqueMap.values()).sort((a, b) => {
        const spkA = String(a.SPK || a.Nomor || "").trim();
        const spkB = String(b.SPK || b.Nomor || "").trim();

        const isAEmpty = !spkA || spkA === "-";
        const isBEmpty = !spkB || spkB === "-";

        if (isAEmpty && !isBEmpty) return -1;
        if (!isAEmpty && isBEmpty) return 1;
        return 0;
      });

      masterData.value = processedItems;
    } else {
      masterData.value = [];
    }
  } catch (e: any) {
    if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
    console.error("Fetch Browse Error:", e);
    toast.error(e.response?.data?.message || "Gagal mengambil data SO to SPK.");
    masterData.value = [];
  } finally {
    loading.value = false;
  }
};

const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const targetIdentifier =
    typeof lastItem === "object"
      ? getRowIdentifier(lastItem)
      : String(lastItem);

  if (!targetIdentifier || details.value[targetIdentifier]) return;

  loadingDetails.value.add(targetIdentifier);
  try {
    const res = await soToSpkService.getSizes(targetIdentifier);
    const resData = res.data?.data ?? res.data;
    details.value[targetIdentifier] = Array.isArray(resData) ? resData : [];
  } catch {
    toast.error("Gagal memuat detail size");
    details.value[targetIdentifier] = [];
  } finally {
    loadingDetails.value.delete(targetIdentifier);
  }
};

const isLoadingDetails = (identifier: string) =>
  loadingDetails.value.has(identifier);

// --- User Actions ---
const handleRowClick = (_event: any, row: any) => {
  const item = row?.item ?? row;
  const currentKey = item?.SO || item?.SPK || item?.Nomor;

  const isAlreadySelected = selected.value.some((s: any) => {
    const sKey = s?.SO || s?.SPK || s?.Nomor;
    return sKey === currentKey;
  });

  selected.value = isAlreadySelected ? [] : [item];
};

const getRowProps = ({ item }: any) => {
  const itemKey = item?.SO || item?.SPK || item?.Nomor;
  const isSelected =
    itemKey &&
    selected.value.some((s: any) => {
      const sKey = s?.SO || s?.SPK || s?.Nomor;
      return sKey === itemKey;
    });

  const classes: string[] = [];
  if (isSelected) classes.push("row-selected");
  if (item.STATUS === "Closed" || item.Aktif === "N") {
    classes.push("row-passive");
  }
  return { class: classes.join(" ") };
};

const handleEdit = () => {
  if (!selectedItem.value) return;
  if (selectedItem.value.STATUS === "Closed") {
    return toast.warning("SPK yang sudah Closed tidak dapat diubah.");
  }
  const nomorSpk = selectedItem.value.SPK || (selectedItem.value as any).Nomor;
  if (!nomorSpk || nomorSpk === "-") {
    return toast.warning(
      "Data ini belum memiliki SPK. Silakan buat SPK terlebih dahulu.",
    );
  }
  router.push(`/mmt/so-spk/edit/${encodeURIComponent(nomorSpk)}`);
};

// --- PREVIEW ACTION ---
const handlePreview = (itemToPreview?: SpkHeader) => {
  const target = itemToPreview || selectedItem.value;
  if (!target) {
    toast.error("Pilih salah satu SPK terlebih dahulu.");
    return;
  }
  const nomorSpk = target.SPK || (target as any).Nomor;
  if (!nomorSpk || nomorSpk === "-") {
    toast.error("SPK belum dibuat untuk dokumen ini.");
    return;
  }

  previewSpkNomor.value = nomorSpk;
  isIframeLoading.value = true;
  previewUrl.value = `/mmt/so-spk/print/${encodeURIComponent(nomorSpk)}?preview=1`;
  showPreviewDialog.value = true;
};

const handleIframeLoaded = () => {
  isIframeLoading.value = false;
};

const handlePrint = async () => {
  if (!selectedItem.value) {
    toast.error("Pilih satu SPK terlebih dahulu.");
    return;
  }
  const nomorSpk = selectedItem.value.SPK || (selectedItem.value as any).Nomor;
  if (!nomorSpk || nomorSpk === "-") {
    toast.warning("Dokumen ini belum memiliki nomor SPK.");
    return;
  }

  try {
    await soToSpkService.checkPrintPermission(nomorSpk);
    window.open(`/mmt/so-spk/print/${encodeURIComponent(nomorSpk)}`, "_blank");
    await soToSpkService.recordPrint(nomorSpk);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mencetak SPK.");
  }
};

const openCreateSpkDialog = (item?: SpkHeader) => {
  const target = item || selectedItem.value;
  if (!target) {
    toast.error("Pilih salah satu Sales Order (SO) terlebih dahulu.");
    return;
  }

  const soNomor = target.SO;
  const spkNomor = target.SPK || (target as any).Nomor;

  if (!soNomor || soNomor === "-") {
    toast.error("Baris yang dipilih tidak memiliki nomor SO yang valid.");
    return;
  }

  if (spkNomor && spkNomor !== "-" && (target as any).IsSO !== 1) {
    toast.warning(`SO ${soNomor} sudah memiliki SPK: ${spkNomor}`);
    return;
  }

  targetSoToGenerate.value = target;
  resolveConfirmImage(target);
  showConfirmGenerateDialog.value = true;
};

const handleExecuteGenerateSpk = async () => {
  if (!targetSoToGenerate.value) return;

  const soNomor = targetSoToGenerate.value.SO!;
  const ketSo =
    (targetSoToGenerate.value as any).so_keterangan ||
    (targetSoToGenerate.value as any).Keterangan ||
    "";

  isGeneratingSpk.value = true;

  try {
    const payload = {
      isEdit: false,
      so_nomor: soNomor,
      spk_ketbeli: "",
      spk_keterangan: ketSo,
    };

    let res: any;
    if (typeof (soToSpkService as any).createSave === "function") {
      res = await (soToSpkService as any).createSave(payload);
    } else if (typeof soToSpkService.save === "function") {
      res = await soToSpkService.save(payload);
    }

    const generatedNomor = res?.data?.data?.nomor || res?.data?.nomor;
    toast.success(`SPK berhasil dibuat: ${generatedNomor}`);

    showConfirmGenerateDialog.value = false;
    await fetchData();
  } catch (error: any) {
    console.error("Gagal generate SPK:", error);
    toast.error(
      error.response?.data?.message || "Gagal membuat SPK dari SO terpilih.",
    );
  } finally {
    isGeneratingSpk.value = false;
  }
};

// --- Lifecycle & Watchers ---
onMounted(() => {
  fetchData();
});

watch([startDate, endDate], ([newStart, newEnd]) => {
  if (!newStart || !newEnd) return;
  if (fetchTimer) clearTimeout(fetchTimer);
  fetchTimer = setTimeout(() => {
    fetchData();
  }, 200);
});
</script>

<template>
  <BaseBrowse
    title="Monitoring SO to SPK"
    menu-id="mmt-so-to-spk"
    icon="mdi-file-find"
    :headers="masterHeaders"
    :items="filteredMasterData"
    :can-insert="true"
    :can-edit="true"
    :is-loading="loading"
    :loading="loading"
    :disable-sort="true"
    item-value="SO"
    v-model:startDate="startDate"
    v-model:filteredItems="currentFilteredItems"
    v-model:endDate="endDate"
    fixed-header
    height="calc(100vh - 210px)"
    class="browse-table-container"
    @refresh="fetchData"
    @add="openCreateSpkDialog()"
    @edit="handleEdit"
    @row-click="handleRowClick"
    :row-props-fn="getRowProps"
    :row-props="getRowProps"
    v-model:expanded="expanded"
    @update:expanded="handleExpandUpdate"
  >
    <template #header-actions="{ isSingleSelected }">
      <v-btn
        size="x-small"
        color="primary"
        class="text-white font-weight-bold"
        prepend-icon="mdi-file-document-plus"
        :disabled="!isSingleSelected || isGeneratingSpk"
        :loading="isGeneratingSpk"
        @click="openCreateSpkDialog()"
      >
        Buat SPK
      </v-btn>

      <v-btn
        size="x-small"
        color="warning"
        :disabled="!isSingleSelected"
        @click="handleEdit"
      >
        <v-icon start>mdi-pencil</v-icon> Ubah
      </v-btn>
    </template>

    <template #extra-actions>
      <v-btn color="success" size="x-small" @click="exportToExcel">
        <v-icon start>mdi-file-excel</v-icon> Export
      </v-btn>

      <v-btn
        color="purple-darken-1"
        class="text-white font-weight-bold"
        rounded="pill"
        size="small"
        prepend-icon="mdi-eye"
        :disabled="!selectedItem"
        @click="handlePreview()"
      >
        Preview
      </v-btn>

      <v-btn
        color="light-blue-darken-1"
        class="text-white font-weight-bold"
        rounded="pill"
        size="small"
        prepend-icon="mdi-printer"
        :disabled="!selectedItem"
        @click="handlePrint"
      >
        Cetak
      </v-btn>

      <v-menu v-if="selectedItem">
        <template v-slot:activator="{ props }">
          <v-btn
            color="indigo-darken-1"
            class="text-white font-weight-bold"
            rounded="pill"
            size="small"
            append-icon="mdi-chevron-down"
            v-bind="props"
          >
            Aksi SPK
          </v-btn>
        </template>
        <v-list density="compact" class="py-1">
          <v-list-item
            v-if="selectedItem.STATUS !== 'Closed'"
            @click="openCloseSpkDialog('Y')"
          >
            <template #prepend>
              <v-icon size="18" color="error" class="mr-2">mdi-lock</v-icon>
            </template>
            <v-list-item-title class="text-error font-weight-medium">
              Close SPK
            </v-list-item-title>
          </v-list-item>

          <v-list-item
            v-if="selectedItem.STATUS === 'Closed'"
            @click="openCloseSpkDialog('N')"
          >
            <template #prepend>
              <v-icon size="18" color="success" class="mr-2"
                >mdi-lock-open</v-icon
              >
            </template>
            <v-list-item-title class="text-success font-weight-medium">
              Open SPK
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <template #filter-fields>
      <div class="d-flex align-center ga-2">
        <v-text-field
          v-model="keyword"
          label="Cari SPK / SO / Nama"
          density="compact"
          hide-details
          variant="outlined"
          append-inner-icon="mdi-magnify"
          style="min-width: 200px"
          @keyup.enter="fetchData"
        />

        <v-btn
          color="teal-darken-1"
          variant="flat"
          size="small"
          prepend-icon="mdi-eye-outline"
          :disabled="!selectedItem"
          @click="handlePreview()"
        >
          Preview SPK
        </v-btn>
      </div>
    </template>

    <template #item.SO="{ value }">
      <span class="font-weight-medium text-primary">
        {{ value || "-" }}
      </span>
    </template>

    <template #item.SPK="{ item }">
      <v-chip
        v-if="item.SPK && item.SPK !== '-'"
        :color="getStatusColor(item)"
        size="x-small"
        label
        class="font-weight-bold cursor-pointer"
        @click.stop="handlePreview(item)"
      >
        <v-icon start size="12" class="mr-1">mdi-eye</v-icon>
        {{ item.SPK }}
      </v-chip>
      <span v-else class="text-caption text-grey font-weight-bold">-</span>
    </template>

    <template #item.Cab="{ value, item }">
      {{ value || item.Cabang || "-" }}
    </template>

    <template #item.SO_Tanggal="{ item }">
      {{ formatDateDisplay(item.SO_Tanggal) }}
    </template>

    <template #item.CMO_Tanggal="{ item }">
      {{ formatDateTimeDisplay(item.CMO_Tanggal) }}
    </template>

    <!-- TANGGAL SPK: jika belum ada SPK, tampilkan "-" -->
    <template #item.Tanggal="{ item }">
      <span v-if="item.SPK && item.SPK !== '-'">
        {{ formatDateDisplay(item.Tanggal) }}
      </span>
      <span v-else class="text-caption text-grey font-weight-bold">-</span>
    </template>

    <template #item.Dateline="{ item }">
      {{ formatDateDisplay(item.Dateline) }}
    </template>

    <template #item.Dateline_PO="{ value }">
      {{ value || "-" }}
    </template>

    <template #item.Nama="{ item }">
      <div
        :class="
          item.design_baru === 'Y' && item.design_done === 'N'
            ? 'text-deep-orange-darken-2 font-weight-bold'
            : ''
        "
      >
        {{ item.Nama }}
      </div>
    </template>

    <!-- EXPANDED CONTENT: Mendukung baris SO murni maupun SPK -->
    <template #expanded-content="{ item }">
      <div
        v-if="isLoadingDetails(getRowIdentifier(item))"
        class="text-center pa-2"
      >
        <v-progress-circular
          indeterminate
          size="20"
          color="primary"
          class="mr-2"
        />
        <span class="text-caption">Memuat detail ukuran...</span>
      </div>

      <div
        v-else-if="
          !details[getRowIdentifier(item)] ||
          details[getRowIdentifier(item)].length === 0
        "
        class="text-center pa-2 text-caption text-grey"
      >
        Tidak ada data detail ukuran untuk
        {{ getRowIdentifier(item) || "dokumen ini" }}
      </div>

      <v-card
        v-else
        variant="outlined"
        flat
        style="max-width: 600px"
        class="my-1"
      >
        <v-data-table
          :headers="detailHeaders"
          :items="details[getRowIdentifier(item)]"
          density="compact"
          class="bg-white border rounded"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #[`item.Qty`]="{ value }">
            <div class="text-right font-weight-bold">
              {{ Number(value || 0).toLocaleString() }}
            </div>
          </template>

          <template #[`item.Stbj`]="{ value }">
            <div class="text-right text-success font-weight-bold">
              {{ Number(value || 0).toLocaleString() }}
            </div>
          </template>

          <template #[`item.Kurang`]="{ value }">
            <div
              :class="[
                'text-right',
                'font-weight-bold',
                Number(value) > 0 ? 'text-red' : 'text-grey-darken-1',
              ]"
            >
              {{ Number(value || 0).toLocaleString() }}
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>
  </BaseBrowse>

  <!-- Dialog Konfirmasi Close / Open SPK -->
  <v-dialog v-model="showCloseDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="text-white d-flex align-center pa-3 font-weight-bold text-subtitle-1"
        :class="closeAction === 'Y' ? 'bg-error' : 'bg-success'"
      >
        <v-icon color="white" class="mr-2">
          {{ closeAction === "Y" ? "mdi-lock" : "mdi-lock-open" }}
        </v-icon>
        {{
          closeAction === "Y" ? "Konfirmasi Close SPK" : "Konfirmasi Open SPK"
        }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="text-body-2 mb-2 font-weight-medium">
          {{
            closeAction === "Y"
              ? "Apakah Anda yakin ingin meng-Close SPK berikut?"
              : "Apakah Anda yakin ingin meng-Open SPK berikut?"
          }}
        </div>
        <div class="pa-2 bg-grey-lighten-4 rounded border mb-3">
          <div class="font-weight-bold text-primary">
            No. SPK: {{ closeItem?.SPK || (closeItem as any)?.Nomor }}
          </div>
          <div class="text-caption text-grey-darken-2">
            Nama: {{ closeItem?.Nama }}
          </div>
          <div class="text-caption text-grey-darken-2">
            No. SO: {{ closeItem?.SO || "-" }}
          </div>
        </div>

        <v-textarea
          v-if="closeAction === 'Y'"
          v-model="closeAlasan"
          label="Alasan Close SPK *"
          variant="outlined"
          rows="3"
          density="compact"
          auto-grow
          hide-details
          placeholder="Tuliskan alasan penutupan SPK..."
        />
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 justify-end ga-2">
        <v-btn
          variant="tonal"
          color="grey-darken-1"
          size="small"
          :disabled="isProcessingClose"
          @click="showCloseDialog = false"
        >
          Batal
        </v-btn>
        <v-btn
          :color="closeAction === 'Y' ? 'error' : 'success'"
          variant="flat"
          size="small"
          class="font-weight-bold"
          :loading="isProcessingClose"
          @click="confirmToggleCloseSpk"
        >
          {{ closeAction === "Y" ? "Ya, Close SPK" : "Ya, Open SPK" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Modal Konfirmasi Generate SPK -->
  <v-dialog v-model="showConfirmGenerateDialog" max-width="1100px" persistent>
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-4">
        <v-icon start color="white">mdi-file-document-plus</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold text-white">
          Referensi Sales Order — Konfirmasi Pembuatan SPK
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          @click="showConfirmGenerateDialog = false"
        >
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 bg-grey-lighten-4">
        <v-row>
          <v-col cols="12" md="8">
            <v-card variant="outlined" class="pa-3 bg-white border rounded">
              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >No. SPK</span
                >
                <v-text-field
                  model-value="(Otomatis)"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  class="bg-grey-lighten-4"
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >No. Sales Order</span
                >
                <v-text-field
                  :model-value="
                    targetSoToGenerate?.SO ||
                    (targetSoToGenerate as any)?.so_nomor ||
                    '-'
                  "
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  class="bg-blue-lighten-5"
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Nama Pekerjaan</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Nama || '-'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2 ga-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >No. MAP</span
                >
                <v-text-field
                  :model-value="
                    targetSoToGenerate?.MAP ||
                    (targetSoToGenerate as any)?.so_map ||
                    '-'
                  "
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 180px"
                />
                <span class="text-caption font-weight-bold mx-2">Customer</span>
                <v-text-field
                  :model-value="(targetSoToGenerate as any)?.Customer || '-'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2 ga-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Ukuran</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Panjang || 0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 90px"
                />
                <span class="text-caption font-weight-bold">X</span>
                <v-text-field
                  :model-value="targetSoToGenerate?.Lebar || 0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 90px"
                />
                <span class="text-caption font-weight-bold mr-1">Mtr</span>
                <span class="text-caption font-weight-bold ml-2"
                  >Ket. Ukuran</span
                >
                <v-text-field
                  :model-value="
                    (targetSoToGenerate as any)?.Ket_Ukuran ||
                    (targetSoToGenerate as any)?.so_ket_ukuran ||
                    '-'
                  "
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Gramasi</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Gramasi || '-'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Finishing</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Finishing || '-'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2 ga-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Jenis Order</span
                >
                <v-text-field
                  model-value="MT"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 90px"
                />
                <span class="text-caption font-weight-bold ml-2">Tipe</span>
                <v-text-field
                  :model-value="targetSoToGenerate?.Tipe_SPK || 'Medium'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 120px"
                />
                <span class="text-caption font-weight-bold ml-2">Qty</span>
                <v-text-field
                  :model-value="targetSoToGenerate?.Pesan || 1"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 90px"
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Kepentingan</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Kepentingan || 'TOP URGENT'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2 ga-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Workshop</span
                >
                <v-text-field
                  :model-value="targetSoToGenerate?.Workshop || 'P05'"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 100px"
                />
                <span class="text-caption font-weight-bold ml-2">No. PO</span>
                <v-text-field
                  :model-value="
                    targetSoToGenerate?.PO || targetSoToGenerate?.Ket_PO || '-'
                  "
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                />
              </div>

              <div class="d-flex align-center mb-2">
                <span class="text-caption font-weight-bold" style="width: 140px"
                  >Dateline SO</span
                >
                <v-text-field
                  :model-value="
                    targetSoToGenerate?.Dateline ||
                    targetSoToGenerate?.Deadline ||
                    '-'
                  "
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="max-width: 180px"
                />
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card
              variant="outlined"
              class="pa-2 bg-white border rounded h-100 d-flex flex-column"
            >
              <div class="text-caption font-weight-bold text-primary mb-2">
                GAMBAR DESAIN
              </div>
              <div
                class="flex-grow-1 d-flex align-center justify-center bg-grey-lighten-4 border rounded"
                style="min-height: 350px"
              >
                <div v-if="confirmImageLoading" class="text-center pa-4">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    size="32"
                  />
                  <div class="text-caption text-grey mt-2">
                    Memuat gambar desain...
                  </div>
                </div>
                <img
                  v-else-if="confirmImageUrl"
                  :src="confirmImageUrl"
                  alt="Gambar Desain"
                  style="
                    max-width: 100%;
                    max-height: 400px;
                    object-fit: contain;
                  "
                />
                <div v-else class="text-caption text-grey text-center pa-4">
                  <v-icon size="40" color="grey-lighten-1"
                    >mdi-image-off</v-icon
                  >
                  <div>Tidak ada gambar desain</div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 bg-white justify-end ga-2">
        <v-btn
          variant="tonal"
          color="grey-darken-1"
          size="small"
          :disabled="isGeneratingSpk"
          @click="showConfirmGenerateDialog = false"
        >
          Batal
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold px-4"
          :loading="isGeneratingSpk"
          @click="handleExecuteGenerateSpk"
        >
          Ya, Buat SPK Sekarang
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Modal Dialog Preview SPK -->
  <v-dialog
    v-model="showPreviewDialog"
    max-width="1200px"
    width="95vw"
    height="92vh"
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card class="d-flex flex-column" style="height: 92vh; max-height: 92vh">
      <v-toolbar
        color="grey-darken-4"
        density="compact"
        class="flex-grow-0 flex-shrink-0"
      >
        <v-icon class="ml-3 mr-2" color="teal-lighten-2"
          >mdi-file-eye-outline</v-icon
        >
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Preview SPK — {{ previewSpkNomor }}
        </v-toolbar-title>

        <v-chip
          color="error"
          size="x-small"
          label
          class="mr-3 font-weight-bold"
        >
          PREVIEW MODE (DILARANG DICETAK)
        </v-chip>

        <v-spacer />

        <v-btn icon variant="text" @click="showPreviewDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text
        class="pa-0 flex-grow-1 position-relative bg-grey-lighten-3 iframe-wrapper"
      >
        <div
          v-if="isIframeLoading"
          class="preview-loading-overlay d-flex flex-column align-center justify-center"
        >
          <v-progress-circular indeterminate color="primary" size="48" />
          <span class="text-caption text-grey-darken-2 mt-3 font-weight-medium">
            Memuat dokumen preview SPK...
          </span>
        </div>

        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="preview-iframe"
          @load="handleIframeLoaded"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions
        class="bg-white py-2 px-4 justify-space-between flex-grow-0 flex-shrink-0"
      >
        <span class="text-caption text-grey-darken-1">
          * Mode preview untuk pengecekan data visual &amp; layout SPK.
        </span>
        <v-btn
          color="grey-darken-1"
          variant="tonal"
          size="small"
          class="px-4 font-weight-bold"
          @click="showPreviewDialog = false"
        >
          Tutup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.v-data-table__tr),
:deep(.v-data-table__tr.v-data-table__tr--selected),
:deep(.v-data-table__tr.v-data-table__tr--selected:hover),
:deep(.v-data-table__tr > td) {
  background-color: #ffffff !important;
}

.row-selected,
:deep(.v-data-table__tr.row-selected),
:deep(.v-data-table__tr.row-selected > td) {
  background-color: #d8efff !important;
}

:deep(.v-data-table__tr.row-selected:hover > td) {
  background-color: #c0e4ff !important;
}

.row-passive td {
  color: #9e9e9e !important;
}

:deep(.v-table) {
  display: flex !important;
  flex-direction: column !important;
  height: calc(100vh - 210px) !important;
}

:deep(.v-table__wrapper) {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  overflow-x: auto !important;
}

:deep(.v-data-table-footer) {
  flex: 0 0 auto !important;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #ffffff !important;
}

:deep(.v-data-table__th--fixed),
:deep(.v-data-table__td--fixed) {
  box-sizing: border-box !important;
}

.cursor-pointer {
  cursor: pointer;
}

.iframe-wrapper {
  height: calc(92vh - 100px) !important;
  min-height: 500px;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.preview-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: 10;
}
</style>
