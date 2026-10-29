<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { cetakBarcodeKaosanFormService as svc } from "@/services/garmen/cetakBarcodeKaosanFormService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BarangKaosanSearchModal from "@/components/lookups/BarangKaosanSearchModal.vue";
import {
  IconBarcode,
  IconSearch,
  IconPrinter,
  IconEye,
} from "@tabler/icons-vue";
import QRCode from "qrcode";

// ─── Types ────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  kode: string; // SPK nomor (atau kode dasar kalau input dari kaosan langsung)
  kodek: string; // Kode item kaosan
  tglspk: string;
  barcode: string; // barcode SKU-level lama (brgd_barcode), dipakai buat lookup, BUKAN yang di-encode ke QR
  nama: string;
  ukuran: string;
  order: number;
  harga: number;
  awal: number;
  akhir: number;
  jumlah: number;
  good: number;
  bsA: number;
  bsB: number;
  bsC: number;
  cetak: boolean;
  packing: string;
  sudahCetak?: number;
}

type Grade = "" | "A" | "B" | "C";

// Satu unit fisik dari backend (res.data.data.units / hasil preview)
interface PrintUnit {
  bcdNourut: number;
  kode: string; // nomor SPK
  kodek: string;
  ukuran: string;
  nama: string;
  harga: number;
  tglspk: string;
  grade: Grade;
  kodeBarang: string; // barcode Good / kode BS
  unit_serial: string; // isi QR (sementara = kodeBarang)
  urut: number; // nomor urut di label
  posisi: number;
  isConflict?: boolean;
}

interface QtyMismatchItem {
  nama: string;
  ukuran: string;
  order: number;
  jumlah: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const tabsStore = useTabsStore();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => (route.params.nomor as string) || "");

let _keySeq = 0;
const newKey = () => ++_keySeq;

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");
const BS_KOSONG = { good: 0, bsA: 0, bsB: 0, bsC: 0 };
const BS_FIELDS = ["good", "bsA", "bsB", "bsC"] as const;

// [ASUMSI] daftar cabang sama seperti dropdown filter cabang di modul
// lain (PermintaanPembelianView dkk) — kalau daftar aslinya beda,
// sesuaikan array ini.
const CABANG_LIST = ["P01", "P02", "P03", "P04", "P05", "HO-"];

interface CetakBarcodeKaosanFormState {
  nomor: string;
  tanggal: string;
  cab: string;
  bs: boolean;
  detail: DetailRow[];
}

const emptyData: CetakBarcodeKaosanFormState = {
  nomor: "",
  tanggal: todayLocal(),
  cab: "",
  bs: false,
  detail: [],
};

// ─── useForm ──────────────────────────────────────────────
const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<CetakBarcodeKaosanFormState>({
  menuId: "130",
  initialData: emptyData,
  onFormReset: () => {
    showSpkModal.value = false;
    activeSpkRowKey.value = null;
    showKaosanModal.value = false;
    activeKaosanRowKey.value = null;
    scanBarcodeValue.value = "";
    showBarcodePickDialog.value = false;
    barcodePickResults.value = [];
    selectedPrinter.value = "XP360B";
    isPrintPreviewVisible.value = false;
    printPreviewData.value = [];
    isPreviewMode.value = false;

    if (cabFixed.value) {
      formData.value.cab = authStore.user!.cabang;
    }
    addEmptyRow();
  },
  fetchApi: async () => {
    const res = await svc.getDetail(nomorParam.value);
    const d = res.data.data;
    return {
      nomor: d.header.nomor,
      tanggal: d.header.tanggal,
      cab: d.header.cab,
      bs: Boolean(d.header.bs),
      detail: d.detail.map((r: Omit<DetailRow, "_key">) => ({
        ...r,
        _key: newKey(),
      })),
    };
  },
  submitApi: async (payload) => {
    const clean = {
      isEdit: isEdit.value,
      nomor: payload.nomor,
      tanggal: payload.tanggal,
      cab: payload.cab,
      bs: payload.bs,
      detail: (payload.detail as DetailRow[]).map(({ _key, ...rest }) => rest),
    };
    return svc.save(clean);
  },
  onSuccess: (res: any) => {
    const nomorHasil = res.data?.data?.nomor || formData.value.nomor;
    formData.value.nomor = nomorHasil;
    toast.success(`Berhasil disimpan dengan nomor: ${nomorHasil}`);
    // BARU: sumber data print sekarang unit fisik dari backend
    // (berisi unit_serial hasil generate), bukan dihitung ulang dari
    // grid frontend
    triggerPrintFromGrid(res.data?.data?.units || []);
  },
});

// ─── Cabang: fixed kalau user punya cabang sendiri, dropdown kalau kosong ──
const cabFixed = computed(() => !!authStore.user?.cabang);

onMounted(async () => {
  labelStyleEl = document.createElement("style");
  labelStyleEl.textContent = LABEL_CSS;
  document.head.appendChild(labelStyleEl);

  if (isEdit.value) {
    // fetchData otomatis dijalankan oleh useForm
  } else {
    if (cabFixed.value) {
      formData.value.cab = authStore.user!.cabang;
    }
    addEmptyRow();
  }
});

// ─── SPK Modal (F1) ─────────────────────────────────────────
const showSpkModal = ref(false);
const activeSpkRowKey = ref<number | null>(null);

const openSpkModal = (rowKey?: number) => {
  activeSpkRowKey.value = rowKey ?? null;
  showSpkModal.value = true;
};

const onSpkSelected = async (item: any) => {
  showSpkModal.value = false;
  const spkNomor = (item?.Nomor ?? item?.spk_nomor ?? "").trim();
  if (!spkNomor) return;
  await addSpkToGrid(spkNomor, activeSpkRowKey.value);
  activeSpkRowKey.value = null;
};

const addSpkToGrid = async (spkNomor: string, replaceKey?: number | null) => {
  try {
    const res = await svc.lookupSpk(spkNomor);
    const result = res.data.data;
    if (!result.exists) {
      toast.error(result.error || "Spk tsb tidak ada.");
      return;
    }
    if (formData.value.bs && Number(result.spkDivisi) !== 3) {
      toast.error("Barang BS hanya untuk SPK Kaosan (divisi 3).");
      return;
    }
    if (!result.items?.length) {
      toast.warning("SPK ini tidak punya detail size/kaosan.");
      return;
    }

    // Cek duplikat kode+kodek+ukuran yang sudah ada di grid (selain
    // baris yang sedang di-replace)
    const isDup = (
      kode: string,
      kodek: string,
      ukuran: string,
      skipKey?: number | null,
    ) =>
      formData.value.detail.some(
        (r) =>
          r._key !== skipKey &&
          r.kode === kode &&
          r.kodek === kodek &&
          r.ukuran === ukuran,
      );

    let firstUsed = false;
    for (const it of result.items) {
      if (isDup(it.kode, it.kodek, it.ukuran, replaceKey)) continue;

      const row: DetailRow = {
        _key: newKey(),
        kode: it.kode,
        kodek: it.kodek,
        tglspk: it.tglspk,
        barcode: it.barcode,
        nama: it.nama,
        ukuran: it.ukuran,
        order: it.order,
        harga: it.harga,
        awal: it.nextAwal || 0,
        akhir: 0,
        jumlah: 0,
        cetak: it.cetak,
        packing: "",
        ...BS_KOSONG,
      };

      if (!firstUsed && replaceKey != null) {
        const idx = formData.value.detail.findIndex(
          (r) => r._key === replaceKey,
        );
        if (idx !== -1 && !formData.value.detail[idx].nama) {
          row._key = replaceKey;
          formData.value.detail[idx] = row;
          firstUsed = true;
          continue;
        }
      }
      if (!firstUsed) {
        const emptyIdx = formData.value.detail.findIndex((r) => !r.nama);
        if (emptyIdx !== -1) {
          row._key = formData.value.detail[emptyIdx]._key;
          formData.value.detail[emptyIdx] = row;
          firstUsed = true;
          continue;
        }
      }
      formData.value.detail.push(row);
    }
    ensureEmptyRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data SPK.");
  }
};

// ─── Kode Kaosan Modal (F2) ─────────────────────────────────
const showKaosanModal = ref(false);
const activeKaosanRowKey = ref<number | null>(null);

const openKaosanModal = (rowKey?: number) => {
  if (formData.value.bs) {
    toast.warning("Barang BS hanya bisa dipilih dari SPK (F1).");
    return;
  }
  activeKaosanRowKey.value = rowKey ?? null;
  showKaosanModal.value = true;
};

const onKaosanItemsSelected = async (selectedItems: any[]) => {
  if (!selectedItems?.length) return;
  const replaceKey = activeKaosanRowKey.value;

  // BARU: ambil nextAwal per kode unik yang dipilih
  const uniqueKodes = [...new Set(selectedItems.map((it) => it.Kode))];
  const nextAwalMap = new Map<string, Map<string, number>>();
  await Promise.all(
    uniqueKodes.map(async (kd) => {
      try {
        const res = await svc.lookupKodeKaosan(kd);
        const items = res.data.data.items || [];
        const m = new Map<string, number>();
        items.forEach((it: any) => m.set(it.ukuran, it.nextAwal || 1));
        nextAwalMap.set(kd, m);
      } catch {
        // gagal ambil nextAwal — bukan blocker, tetap lanjut dengan 0
      }
    }),
  );

  const isDup = (
    kode: string,
    kodek: string,
    ukuran: string,
    skipKey?: number | null,
  ) =>
    formData.value.detail.some(
      (r: DetailRow) =>
        r._key !== skipKey &&
        r.kode === kode &&
        r.kodek === kodek &&
        r.ukuran === ukuran,
    );

  let firstUsed = false;
  for (const it of selectedItems) {
    if (isDup(it.Kode, it.Kode, it.Ukuran, replaceKey)) continue;

    const suggestedAwal = nextAwalMap.get(it.Kode)?.get(it.Ukuran) || 0;

    const row: DetailRow = {
      _key: newKey(),
      kode: it.Kode,
      kodek: it.Kode,
      tglspk: "",
      barcode: it.Barcode || "",
      nama: it.Nama,
      ukuran: it.Ukuran,
      order: 0,
      harga: Number(it.Harga) || 0,
      awal: suggestedAwal, // BARU
      akhir: 0,
      jumlah: 0,
      cetak: !!it.Barcode,
      packing: "",
      ...BS_KOSONG,
    };

    if (!firstUsed && replaceKey != null) {
      const idx = formData.value.detail.findIndex(
        (r: DetailRow) => r._key === replaceKey,
      );
      if (idx !== -1 && !formData.value.detail[idx].nama) {
        row._key = replaceKey;
        formData.value.detail[idx] = row;
        firstUsed = true;
        continue;
      }
    }
    if (!firstUsed) {
      const emptyIdx = formData.value.detail.findIndex(
        (r: DetailRow) => !r.nama,
      );
      if (emptyIdx !== -1) {
        row._key = formData.value.detail[emptyIdx]._key;
        formData.value.detail[emptyIdx] = row;
        firstUsed = true;
        continue;
      }
    }
    formData.value.detail.push(row);
  }
  ensureEmptyRow();
  activeKaosanRowKey.value = null;
};

const addKodeKaosanToGrid = async (
  kode: string,
  replaceKey?: number | null,
) => {
  if (formData.value.bs) {
    toast.warning("Barang BS hanya bisa dipilih dari SPK (F1).");
    return;
  }

  try {
    const res = await svc.lookupKodeKaosan(kode);
    const items = res.data.data.items || [];
    if (!items.length) {
      toast.warning("Kode tersebut tidak punya varian ukuran.");
      return;
    }

    const isDup = (
      kd: string,
      kdk: string,
      ukuran: string,
      skipKey?: number | null,
    ) =>
      formData.value.detail.some(
        (r) =>
          r._key !== skipKey &&
          r.kode === kd &&
          r.kodek === kdk &&
          r.ukuran === ukuran,
      );

    let firstUsed = false;
    for (const it of items) {
      if (isDup(it.kode, it.kodek, it.ukuran, replaceKey)) continue;
      const row: DetailRow = {
        _key: newKey(),
        kode: it.kode,
        kodek: it.kodek,
        tglspk: it.tglspk || "",
        barcode: it.barcode,
        nama: it.nama,
        ukuran: it.ukuran,
        order: it.order,
        harga: it.harga,
        awal: it.nextAwal || 0,
        akhir: 0,
        jumlah: 0,
        cetak: it.cetak,
        packing: "",
        ...BS_KOSONG,
      };
      if (!firstUsed && replaceKey != null) {
        const idx = formData.value.detail.findIndex(
          (r) => r._key === replaceKey,
        );
        if (idx !== -1 && !formData.value.detail[idx].nama) {
          row._key = replaceKey;
          formData.value.detail[idx] = row;
          firstUsed = true;
          continue;
        }
      }
      if (!firstUsed) {
        const emptyIdx = formData.value.detail.findIndex((r) => !r.nama);
        if (emptyIdx !== -1) {
          row._key = formData.value.detail[emptyIdx]._key;
          formData.value.detail[emptyIdx] = row;
          firstUsed = true;
          continue;
        }
      }
      formData.value.detail.push(row);
    }
    ensureEmptyRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat kode kaosan.");
  }
};

// ─── Scan barcode global (input di kolom kiri) ──────────────
const scanBarcodeValue = ref("");
const showBarcodePickDialog = ref(false);
const barcodePickResults = ref<any[]>([]);
const showQtyMismatchDialog = ref(false);
const qtyMismatchDetails = ref<QtyMismatchItem[]>([]);

const onScanBarcodeEnter = async () => {
  if (formData.value.bs) {
    toast.warning("Barang BS hanya bisa dipilih dari SPK (F1).");
    return;
  }
  const val = scanBarcodeValue.value.trim();
  if (!val) return;
  try {
    const res = await svc.lookupByBarcode(val);
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Barcode tidak ditemukan.");
      scanBarcodeValue.value = "";
      return;
    }
    const distinctKode = [...new Set(rows.map((r: any) => r.Kode))];
    if (distinctKode.length === 1) {
      await addKodeKaosanToGrid(distinctKode[0] as string);
    } else {
      barcodePickResults.value = rows;
      showBarcodePickDialog.value = true;
    }
  } catch {
    toast.error("Gagal mencari barcode.");
  } finally {
    scanBarcodeValue.value = "";
  }
};

const pickBarcodeResult = async (row: any) => {
  showBarcodePickDialog.value = false;
  await addKodeKaosanToGrid(row.Kode);
};

// ─── Grid helpers ───────────────────────────────────────────
const ensureEmptyRow = () => {
  const last = formData.value.detail[formData.value.detail.length - 1];
  if (!last || last.nama) {
    formData.value.detail.push({
      _key: newKey(),
      kode: "",
      kodek: "",
      tglspk: "",
      barcode: "",
      nama: "",
      ukuran: "",
      order: 0,
      harga: 0,
      awal: 0,
      akhir: 0,
      jumlah: 0,
      cetak: false,
      packing: "",
      ...BS_KOSONG,
    });
  }
};
const addEmptyRow = () => ensureEmptyRow();

const removeRow = (key: number) => {
  const idx = formData.value.detail.findIndex((r) => r._key === key);
  if (idx !== -1) formData.value.detail.splice(idx, 1);
  ensureEmptyRow();
};

// awal/akhir berubah -> hitung jumlah + auto packing (replika
// clawalPropertiesEditValueChanged Delphi)
const onAwalAkhirChange = (row: DetailRow) => {
  if (!row.nama) return;

  // BARU: baris sudah punya unit tercetak — Akhir tidak boleh
  // dikurangi di bawah jumlah yang sudah ada (Awal terkunci lewat
  // readonly di template)
  if (row.sudahCetak && row.sudahCetak > 0) {
    const minAkhir = row.awal + row.sudahCetak - 1;
    if ((row.akhir || 0) < minAkhir) {
      toast.warning(
        `Baris "${row.nama}" sudah punya ${row.sudahCetak} unit tercetak — Akhir minimal ${minAkhir}.`,
      );
      row.akhir = minAkhir;
    }
  }

  row.jumlah = Math.max(0, (row.akhir || 0) - (row.awal || 0) + 1);
  if (row.cetak) {
    row.packing = `${row.awal}-${row.akhir}`;
  }
};

// toggle cetak -> replika clcetakPropertiesEditValueChanged: kalau
// barcode kosong, cetak nggak boleh dinyalakan
const onToggleCetak = (row: DetailRow) => {
  if (row.cetak && !row.barcode) {
    toast.warning("Barcode Kosong.\nSPK ini tidak bisa cetak barcode.");
    row.cetak = false;
  }
};

const hasFilledRows = computed(() =>
  formData.value.detail.some((r) => !!r.nama),
);

// Mode BS: Jumlah = Good + A + B + C, Akhir = Awal + Jumlah - 1 (urutan Good → A → B → C)
const onBsChange = (row: DetailRow) => {
  if (!row.nama) return;
  for (const f of BS_FIELDS) {
    row[f] = Math.max(0, Math.floor(Number(row[f]) || 0));
  }
  row.jumlah = row.good + row.bsA + row.bsB + row.bsC;
  row.akhir = row.jumlah > 0 && row.awal > 0 ? row.awal + row.jumlah - 1 : 0;
  if (row.cetak) row.packing = row.akhir > 0 ? `${row.awal}-${row.akhir}` : "";
};

const onRangeChange = (row: DetailRow) =>
  formData.value.bs ? onBsChange(row) : onAwalAkhirChange(row);

// ─── Validasi & Save (replika F10 Delphi) ───────────────────
const validateSave = () => {
  const validRows = formData.value.detail.filter((d) => d.nama.trim() !== "");
  if (!validRows.length) {
    toast.warning("Detail harus diisi.");
    return;
  }
  for (const d of validRows) {
    if (d.cetak) {
      if (formData.value.bs && d.awal && d.jumlah <= 0) {
        toast.warning(`Isi jumlah Good/BS untuk "${d.nama}" (${d.ukuran}).`);
        return;
      }

      if (!d.awal || !d.akhir) {
        toast.warning("Awal atau Akhir harus diisi.");
        return;
      }
      if (d.awal > d.akhir) {
        toast.warning("Awal tidak boleh > Akhir.");
        return;
      }
      if (d.sudahCetak && d.sudahCetak > 0 && d.jumlah < d.sudahCetak) {
        toast.warning(
          `Baris "${d.nama}" sudah punya ${d.sudahCetak} unit tercetak — Akhir tidak boleh dikurangi.`,
        );
        return;
      }
    }
  }

  // BARU: cek mismatch jumlah vs qty pesanan SPK — warning + konfirmasi
  const mismatches = validRows
    .filter((d) => d.cetak && d.order > 0 && d.jumlah !== d.order)
    .map((d) => ({
      nama: d.nama,
      ukuran: d.ukuran,
      order: d.order,
      jumlah: d.jumlah,
    }));

  if (mismatches.length > 0) {
    qtyMismatchDetails.value = mismatches;
    showQtyMismatchDialog.value = true;
    return;
  }

  showSaveDialog.value = true;
};

// BARU: lanjut ke dialog save utama setelah user konfirmasi mismatch
const confirmQtyMismatchAndSave = () => {
  showQtyMismatchDialog.value = false;
  showSaveDialog.value = true;
};

// ─── Printer & Print Preview (client-side) ──────────────────
type PrinterType = "XP360B" | "POSTEK";

interface PrintLabel {
  _k: number;
  nama: string;
  namaPt: number;
  kodeBarang: string;
  tgl: string;
  ukuran: string;
  spk: string;
  urut: number;
  grade: Grade;
  qrSvg: string;
  isConflict: boolean;
}

const selectedPrinter = ref<PrinterType>("XP360B");
const isPrintPreviewVisible = ref(false);
const printPreviewData = ref<PrintLabel[]>([]);
// true = dialog menampilkan preview (belum simpan) → closePreview tidak pindah tab
const isPreviewMode = ref(false);

let labelStyleEl: HTMLStyleElement | null = null;
onBeforeUnmount(() => {
  labelStyleEl?.remove();
  labelStyleEl = null;
});

// CSS label — SATU sumber untuk preview layar dan iframe cetak.
// Label 33 x 13 mm di dalam halaman setinggi 15 mm (batas aman 1 mm atas/bawah).
// QR 10.5 mm = 21 modul x 4 dot (203 dpi) → tajam selama isi QR masih versi 1.
// Postek: halaman 108 mm, sel 33 mm, gap 3.5 mm, pad kiri 1.5 mm (3-up, pitch 36.5 mm).
// XP-360B: halaman 68 mm, sel 31 mm, gap 3 mm (2-up), label diskalakan 0.94
// (BELUM diukur — sesuaikan --cw/--gap/--scale setelah ada ukuran gulungan).
const LABEL_CSS = `
.bck-sheet { --pw: 108mm; --ph: 15mm; --padl: 1.5mm; --padr: 0.5mm; --gap: 3.5mm; --cw: 33mm; --scale: 1; }
.bck-sheet.printer-xp360b { --pw: 68mm; --ph: 15mm; --padl: 1mm; --padr: 1mm; --gap: 3mm; --cw: 31mm; --scale: 0.94; }
.bck-sheet .bck-row { display:flex; width:var(--pw); height:var(--ph); align-items:center; gap:var(--gap); padding:0 var(--padr) 0 var(--padl); box-sizing:border-box; }
.bck-sheet .bck-cellwrap { flex:none; width:var(--cw); height:var(--ph); display:flex; align-items:center; justify-content:center; overflow:hidden; }
.bck-sheet .bck-label { flex:none; width:33mm; height:13mm; box-sizing:border-box; padding:0 0.5mm; overflow:hidden; display:grid; grid-template-columns:11.5mm 1fr; align-items:center; transform:scale(var(--scale)); transform-origin:center center; background:#fff; color:#000; }
.bck-sheet .bck-qr { width:10.5mm; height:10.5mm; justify-self:center; }
.bck-sheet .bck-qr svg { display:block; width:100%; height:100%; }
.bck-sheet .bck-info { display:flex; flex-direction:column; min-width:0; overflow:hidden; }
.bck-sheet .bck-nama { height:3.8mm; overflow:hidden; font:bold 5pt/1.9mm Arial,Helvetica,sans-serif; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; word-break:break-word; }
.bck-sheet .bck-kodeline { display:flex; align-items:center; justify-content:space-between; height:2.2mm; }
.bck-sheet .bck-badge { flex:none; height:2.2mm; padding:0 1mm; background:#000; color:#fff; border-radius:0.4mm; font:bold 5.5pt/2.2mm Arial,sans-serif; letter-spacing:0.1mm; -webkit-text-stroke:0.1mm #fff; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.bck-sheet .bck-sep { border-top:0.2mm solid #000; margin:0.3mm 0; }
.bck-sheet .bck-line { font:4.6pt/2mm Arial,sans-serif; white-space:nowrap; overflow:hidden; }
.bck-sheet .bck-kode { font-weight:bold; }
.bck-sheet .bck-size { margin-left:1.5mm; font-weight:bold; font-size:6pt; }
`;

const PAGE_CSS: Record<PrinterType, string> = {
  XP360B: `
@page { size: 68mm 15mm landscape; margin: 0 !important; }
html, body { margin:0; padding:0; width:68mm; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.bck-row { page-break-after: always !important; }
`,
  POSTEK: `
@page { size: 108mm 15mm landscape; margin: 0 !important; }
html, body { margin:0; padding:0; width:108mm; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.bck-row:not(:last-child) { page-break-after: always !important; }
`,
};

const fmtTgl = (iso: string) => {
  const [y, m, d] = (iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y.slice(2)}` : "";
};

const chunkedPreviewData = computed(() => {
  const chunkSize = selectedPrinter.value === "POSTEK" ? 3 : 2;
  const result: PrintLabel[][] = [];
  for (let i = 0; i < printPreviewData.value.length; i += chunkSize) {
    result.push(printPreviewData.value.slice(i, i + chunkSize));
  }
  return result;
});

const adaKodeBaru = computed(() =>
  printPreviewData.value.some((l) => l.kodeBarang.includes("(BARU)")),
);

// QR sebagai SVG (vektor) → tajam di thermal; tanggal label = tanggal dokumen
const buatQrSvg = (isi: string) =>
  QRCode.toString(isi, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

const NAMA_LEBAR_MM = 20.3;
const NAMA_PT_MAX = 5;
const NAMA_PT_MIN = 3.5;
const PT_KE_MM = 25.4 / 72;
let ctxUkur: CanvasRenderingContext2D | null = null;

// Font nama terbesar (5pt → 3.5pt) yang masih muat 2 baris di kolom info
const hitungNamaPt = (nama: string): number => {
  if (!ctxUkur) ctxUkur = document.createElement("canvas").getContext("2d");
  const ctx = ctxUkur;
  if (!ctx) return NAMA_PT_MAX;
  ctx.font = "bold 100px Arial, Helvetica, sans-serif";
  const lebarKata = nama
    .trim()
    .split(/\s+/)
    .map((k) => ctx.measureText(k).width / 100); // satuan em
  const lebarSpasi = ctx.measureText(" ").width / 100;

  for (let pt = NAMA_PT_MAX; pt >= NAMA_PT_MIN; pt -= 0.1) {
    const maxEm = NAMA_LEBAR_MM / (pt * PT_KE_MM);
    if (lebarKata.some((w) => w > maxEm)) continue;
    let baris = 1;
    let terpakai = 0;
    for (const w of lebarKata) {
      if (terpakai === 0) terpakai = w;
      else if (terpakai + lebarSpasi + w <= maxEm) terpakai += lebarSpasi + w;
      else {
        baris++;
        terpakai = w;
      }
    }
    if (baris <= 2) return Math.round(pt * 10) / 10;
  }
  return NAMA_PT_MIN;
};

const buildPrintData = async (units: PrintUnit[]): Promise<PrintLabel[]> => {
  const tgl = fmtTgl(formData.value.tanggal);
  return Promise.all(
    units.map(
      async (u, i): Promise<PrintLabel> => ({
        _k: i,
        nama: u.nama,
        namaPt: hitungNamaPt(u.nama),
        kodeBarang: u.kodeBarang,
        tgl,
        ukuran: u.ukuran,
        spk: u.kode,
        urut: u.urut,
        grade: u.grade,
        qrSvg: await buatQrSvg(u.unit_serial),
        isConflict: !!u.isConflict,
      }),
    ),
  );
};

const triggerPrintFromGrid = async (units: PrintUnit[] = []) => {
  isPreviewMode.value = false;
  const data = await buildPrintData(units);
  if (!data.length) {
    // Tidak ada yang perlu dicetak -> langsung balik ke browse
    const currentPath = route.path; // snapshot SEBELUM push
    router
      .push({ name: "CetakBarcodeKaosanBrowse" })
      .catch(() => {})
      .then(() => {
        tabsStore.closeTab(currentPath);
      });
    return;
  }
  printPreviewData.value = data;
  isPrintPreviewVisible.value = true;
};

// Preview Cetak — endpoint read-only, boleh kapan saja tanpa simpan
const previewPrintClick = async () => {
  const validRows = formData.value.detail.filter(
    (d) => d.nama.trim() !== "" && d.cetak,
  );
  if (!validRows.length) {
    toast.warning("Tidak ada baris dengan Cetak aktif untuk dipreview.");
    return;
  }
  for (const d of validRows) {
    if (!d.awal || !d.akhir) {
      toast.warning("Awal atau Akhir harus diisi untuk preview.");
      return;
    }
    if (d.awal > d.akhir) {
      toast.warning("Awal tidak boleh > Akhir.");
      return;
    }
  }

  try {
    const res = await svc.previewPrint({
      nomor: formData.value.nomor || "",
      tanggal: formData.value.tanggal,
      bs: formData.value.bs,
      detail: formData.value.detail.map(({ _key, ...rest }) => rest),
    });
    const units: PrintUnit[] = res.data.data || [];
    if (!units.length) {
      toast.warning("Tidak ada unit yang bisa dipreview.");
      return;
    }
    if (units.some((u) => u.isConflict)) {
      toast.warning(
        "Beberapa nomor urut sudah dipakai di dokumen lain — cek ulang sebelum simpan.",
      );
    }
    isPreviewMode.value = true;
    printPreviewData.value = await buildPrintData(units);
    isPrintPreviewVisible.value = true;
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal memuat preview cetak.");
  }
};

// Tes printer: label contoh (baris kedua memakai badge RJ A)
const testPrinter = async () => {
  isPreviewMode.value = false;
  const jumlahTes = selectedPrinter.value === "POSTEK" ? 3 : 2;
  const tgl = fmtTgl(todayLocal());
  const qrSvg = await buatQrSvg("22023204");
  printPreviewData.value = Array.from(
    { length: jumlahTes },
    (_, i): PrintLabel => ({
      _k: i,
      nama: "KO POLOS PANJANG COMBED 24 BENHUR",
      namaPt: hitungNamaPt("KO POLOS PANJANG COMBED 24 BENHUR"),
      kodeBarang: "22023204",
      tgl,
      ukuran: "L",
      spk: "SPK-SM-KO-005325",
      urut: 306 + i,
      grade: i === 1 ? "A" : "",
      qrSvg,
      isConflict: false,
    }),
  );
  isPrintPreviewVisible.value = true;
};

const triggerBrowserPrint = () => {
  const content = document.getElementById("bck-print-area");
  if (!content) return;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = selectedPrinter.value === "POSTEK" ? "108mm" : "68mm";
  frame.style.height = "400mm";
  frame.style.border = "none";
  frame.style.top = "-9999px";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (doc) {
    const kelas =
      selectedPrinter.value === "POSTEK" ? "printer-postek" : "printer-xp360b";
    doc.open();
    doc.write(
      `<html><head><title>Cetak Barcode</title><style>${LABEL_CSS}${PAGE_CSS[selectedPrinter.value]}</style></head><body><div class="bck-sheet ${kelas}">${content.innerHTML}</div></body></html>`,
    );
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => document.body.removeChild(frame), 1500);
    }, 300);
  }
  closePreview();
};

const closePreview = () => {
  isPrintPreviewVisible.value = false;
  const wasPreview = isPreviewMode.value;
  isPreviewMode.value = false;
  if (wasPreview) return; // preview murni: tetap di form, tidak pindah tab
  if (formData.value.nomor && formData.value.nomor !== "TES") {
    const currentPath = route.path; // snapshot SEBELUM push
    router
      .push({ name: "CetakBarcodeKaosanBrowse" })
      .catch(() => {})
      .then(() => {
        tabsStore.closeTab(currentPath);
      });
  }
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Cetak Barcode Kaosan'"
    menu-id="130"
    :icon="IconBarcode"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ═══ KOLOM KIRI ═══ -->
    <template #left-column>
      <div class="header-section">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.nomor"
            class="inp ro text-primary font-weight-bold"
            placeholder="<-- Kosong=Baru"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="idate"
            :disabled="isEdit"
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Cab</label>
          <input
            v-if="cabFixed || isEdit"
            :value="formData.cab"
            class="inp ro"
            readonly
          />
          <select v-else v-model="formData.cab" class="inp sel">
            <option value="">-- Pilih --</option>
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <label class="chk mt-2">
          <input
            type="checkbox"
            v-model="formData.bs"
            :disabled="isEdit || hasFilledRows"
          />
          Barang BS (Good + RJ A/B/C)
        </label>

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl-full">Scan Barcode (Cari Kode Kaosan)</label>
        </div>
        <input
          v-model="scanBarcodeValue"
          :disabled="formData.bs"
          class="inp w-100"
          placeholder="Scan / ketik barcode + Enter"
          @keydown.enter.prevent="onScanBarcodeEnter"
        />

        <div class="sep mt-2 mb-2" />

        <button type="button" class="btn-tes-printer" @click="testPrinter">
          <IconPrinter :size="14" class="mr-1" /> Tes Printer
        </button>

        <button
          type="button"
          class="btn-preview-cetak mt-1"
          @click="previewPrintClick"
        >
          <IconEye :size="14" class="mr-1" /> Preview Cetak
        </button>

        <div class="sep mt-2 mb-2" />

        <div class="fieldset-box">
          <div class="fieldset-legend">Seri Printer</div>
          <label class="rb">
            <input type="radio" v-model="selectedPrinter" value="POSTEK" />
            Postek C168/200s
          </label>
          <label class="rb">
            <input type="radio" v-model="selectedPrinter" value="XP360B" />
            Xprinter XP-360B
          </label>
        </div>
      </div>
    </template>

    <!-- ═══ KOLOM KANAN: Grid Barang Kaosan ═══ -->
    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <div class="d-flex flex-column" style="flex: 1; min-height: 0">
          <div class="tbl-header blue">
            <span class="font-weight-bold">Detail Barcode Kaosan</span>
            <button type="button" class="btn-add" @click="addEmptyRow">
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap flex-grow-1">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 32px">No</th>
                  <th style="width: 110px">SPK</th>
                  <th style="width: 80px">Tgl SPK</th>
                  <th style="width: 110px">Kode Kaosan</th>
                  <th style="width: 110px">Barcode</th>
                  <th style="min-width: 180px">Nama Barang</th>
                  <th style="width: 60px">Size</th>
                  <th style="width: 60px" class="text-right">Order</th>
                  <th style="width: 75px" class="text-right">Harga</th>
                  <th
                    style="width: 60px; background: #f9a825"
                    class="text-center"
                  >
                    Awal
                  </th>
                  <th
                    style="width: 60px; background: #f9a825"
                    class="text-center"
                  >
                    Akhir
                  </th>
                  <template v-if="formData.bs">
                    <th
                      style="width: 60px; background: #2e7d32"
                      class="text-center"
                    >
                      Good
                    </th>
                    <th
                      style="width: 60px; background: #212121"
                      class="text-center"
                    >
                      RJ A
                    </th>
                    <th
                      style="width: 60px; background: #212121"
                      class="text-center"
                    >
                      RJ B
                    </th>
                    <th
                      style="width: 60px; background: #212121"
                      class="text-center"
                    >
                      RJ C
                    </th>
                  </template>
                  <th style="width: 60px" class="text-right">Jumlah</th>
                  <th style="width: 55px" class="text-center">Cetak</th>
                  <th style="width: 100px; background: #fff59d">
                    Packing List
                  </th>
                  <th style="width: 32px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in formData.detail" :key="row._key">
                  <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>

                  <td class="p0">
                    <div class="cell-grp">
                      <input
                        v-model="row.kode"
                        class="ci"
                        :class="{ ro: !!row.nama }"
                        :readonly="!!row.nama"
                        placeholder="F1"
                        @keydown.f1.prevent="openSpkModal(row._key)"
                        @keydown.enter.prevent="
                          row.kode &&
                          !row.nama &&
                          addSpkToGrid(row.kode, row._key)
                        "
                      />
                      <button
                        type="button"
                        class="ci-btn"
                        @click.stop="openSpkModal(row._key)"
                      >
                        <IconSearch :size="11" />
                      </button>
                    </div>
                  </td>

                  <td><input :value="row.tglspk" readonly class="ci ro" /></td>

                  <td class="p0">
                    <div class="cell-grp">
                      <input
                        v-model="row.kodek"
                        class="ci"
                        :class="{ ro: !!row.nama || formData.bs }"
                        :readonly="!!row.nama || formData.bs"
                        placeholder="F2"
                        @keydown.f2.prevent="openKaosanModal(row._key)"
                        @keydown.enter.prevent="
                          row.kodek &&
                          !row.nama &&
                          addKodeKaosanToGrid(row.kodek, row._key)
                        "
                      />
                      <button
                        type="button"
                        class="ci-btn"
                        @click.stop="openKaosanModal(row._key)"
                      >
                        <IconSearch :size="11" />
                      </button>
                    </div>
                  </td>

                  <td><input :value="row.barcode" readonly class="ci ro" /></td>
                  <td>
                    <input
                      :value="row.nama"
                      readonly
                      class="ci ro"
                      tabindex="-1"
                    />
                  </td>
                  <td class="text-center">{{ row.ukuran }}</td>
                  <td class="text-right">{{ num(row.order) }}</td>
                  <td class="text-right">{{ num(row.harga) }}</td>

                  <td class="p0">
                    <input
                      v-model.number="row.awal"
                      type="number"
                      min="0"
                      class="ci text-right"
                      :class="{ ro: (row.sudahCetak || 0) > 0 }"
                      style="background: #fffde7"
                      :readonly="(row.sudahCetak || 0) > 0"
                      @input="onRangeChange(row)"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.akhir"
                      type="number"
                      min="0"
                      class="ci text-right"
                      :class="{ ro: formData.bs }"
                      :readonly="formData.bs"
                      style="background: #fffde7"
                      @input="onAwalAkhirChange(row)"
                      v-select-on-focus
                    />
                  </td>
                  <template v-if="formData.bs">
                    <td v-for="f in BS_FIELDS" :key="f" class="p0">
                      <input
                        v-model.number="row[f]"
                        type="number"
                        min="0"
                        step="1"
                        class="ci text-right"
                        :class="{ ro: (row.sudahCetak || 0) > 0 }"
                        :readonly="(row.sudahCetak || 0) > 0"
                        @input="onBsChange(row)"
                        v-select-on-focus
                      />
                    </td>
                  </template>
                  <td class="text-right font-weight-bold">
                    {{ num(row.jumlah) }}
                  </td>
                  <td class="text-center">
                    <input
                      type="checkbox"
                      v-model="row.cetak"
                      @change="onToggleCetak(row)"
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model="row.packing"
                      class="ci"
                      style="background: #fffde7"
                    />
                  </td>
                  <td class="text-center p0">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeRow(row._key)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="!formData.detail.length">
                  <td :colspan="formData.bs ? 19 : 15" class="empty-row">
                    Scan barcode atau F1/F2 untuk menambah item
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- SPK Modal -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    :divisi="formData.bs ? 3 : undefined"
    @selected="onSpkSelected"
  />

  <!-- Kode Kaosan Modal (F2) -->
  <BarangKaosanSearchModal
    v-model="showKaosanModal"
    @selected="onKaosanItemsSelected"
  />

  <!-- Pilih hasil scan barcode kalau ambigu (>1 kode) -->
  <v-dialog v-model="showBarcodePickDialog" max-width="600px">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Barang
      </v-card-title>
      <v-card-text class="pa-0">
        <div class="ml">
          <div
            v-for="(item, i) in barcodePickResults"
            :key="i"
            class="mi"
            @click="pickBarcodeResult(item)"
          >
            <span class="mk">{{ item.Kode }}</span>
            <span style="flex: 1">{{ item.Nama }} ({{ item.Size }})</span>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2">
        <v-spacer />
        <v-btn
          size="small"
          variant="text"
          @click="showBarcodePickDialog = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Print Preview -->
  <v-dialog v-model="isPrintPreviewVisible" max-width="600px" scrollable>
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title>Pratinjau Cetak Barcode</v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" size="small" @click="closePreview" />
      </v-toolbar>
      <div v-if="isPreviewMode" class="preview-banner">
        Mode Preview — kode BS sudah final dan sama dengan hasil Simpan; nomor
        urut baru terkunci saat disimpan.
      </div>
      <v-card-text class="pa-4" style="background: #525659">
        <div
          id="bck-print-area"
          class="bck-sheet"
          :class="
            selectedPrinter === 'POSTEK' ? 'printer-postek' : 'printer-xp360b'
          "
        >
          <div
            v-for="(chunk, i) in chunkedPreviewData"
            :key="i"
            class="bck-row bck-preview"
          >
            <div v-for="item in chunk" :key="item._k" class="bck-cellwrap">
              <div
                class="bck-label bck-preview-label"
                :class="{ 'bck-conflict': item.isConflict }"
              >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="bck-qr" v-html="item.qrSvg"></div>
                <div class="bck-info">
                  <div
                    class="bck-nama"
                    :style="{ fontSize: item.namaPt + 'pt' }"
                  >
                    {{ item.nama }}
                  </div>
                  <div class="bck-sep"></div>
                  <div class="bck-line bck-kodeline">
                    <span class="bck-kode">{{ item.kodeBarang }}</span>
                    <span v-if="item.grade" class="bck-badge">
                      RJ {{ item.grade }}
                    </span>
                  </div>
                  <div class="bck-line">
                    {{ item.tgl
                    }}<span class="bck-size">{{ item.ukuran }}</span>
                  </div>
                  <div class="bck-line">{{ item.spk }}</div>
                  <div class="bck-line">{{ item.urut }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="closePreview">Tutup</v-btn>
        <v-btn
          color="primary"
          :disabled="adaKodeBaru"
          @click="triggerBrowserPrint"
        >
          <template #prepend><IconPrinter :size="15" /></template>Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Konfirmasi mismatch jumlah cetak vs qty pesanan SPK -->
  <v-dialog v-model="showQtyMismatchDialog" max-width="500px" persistent>
    <v-card rounded="lg">
      <v-card-title class="bg-orange-darken-2 text-white pa-3 text-subtitle-1">
        ⚠️ Jumlah Tidak Sesuai Qty Pesanan
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="mb-2" style="font-size: 12px">
          Jumlah yang akan dicetak berbeda dari qty pesanan SPK untuk baris berikut:
        </p>
        <div v-for="(m, i) in qtyMismatchDetails" :key="i" class="mismatch-row">
          <strong>{{ m.nama }}</strong> ({{ m.ukuran }}) — Qty Pesanan:
          <b>{{ m.order }}</b
          >, Akan Dicetak: <b>{{ m.jumlah }}</b>
        </div>
        <p class="mt-3" style="font-size: 12px; color: #616161">
          Lanjutkan simpan dengan jumlah seperti ini?
        </p>
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="showQtyMismatchDialog = false"
          >Batal</v-btn
        >
        <v-btn color="orange-darken-2" @click="confirmQtyMismatchAndSave"
          >Ya, Lanjutkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.header-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  min-height: 24px;
}
.lbl {
  width: 60px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.lbl-full {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
}
.inp,
.idate {
  flex: 1;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
  font-family: inherit;
}
.inp.sel {
  cursor: pointer;
}
.inp:focus,
.idate:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
  cursor: default;
}
.w-100 {
  width: 100%;
}
.sep {
  height: 1px;
  background: #eee;
  width: 100%;
}

.btn-tes-printer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border: 1px solid #1565c0;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-tes-printer:hover {
  background: #bbdefb;
}

.btn-preview-cetak {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 100%;
  border: 1px solid #6a1b9a;
  background: #f3e5f5;
  color: #6a1b9a;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-preview-cetak:hover {
  background: #e1bee7;
}

.fieldset-box {
  border: 1px solid #9e9e9e;
  padding: 8px;
  padding-top: 16px;
  position: relative;
  background: #fafafa;
  border-radius: 4px;
}
.fieldset-legend {
  position: absolute;
  top: -8px;
  left: 8px;
  background: #fafafa;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: #424242;
}
.rb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  cursor: pointer;
  margin-bottom: 4px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  cursor: pointer;
}

.right-content-wrapper {
  font-size: 11px;
}
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.tbl-wrap {
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  overflow: auto;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.gt thead th {
  background: #455a64;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom: 2px solid #37474f;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 5px 7px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt tbody td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  height: 26px;
  vertical-align: middle;
  padding: 0 4px;
}
.gt tbody tr:nth-of-type(even) td {
  background-color: rgba(0, 0, 0, 0.015);
}
.gt-lbl {
  background: #f5f5f5;
  font-size: 10px;
  color: #666;
}
.p0 {
  padding: 0 !important;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.ci:focus:not(.ro) {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
  min-width: 0;
}
.ci-btn {
  width: 20px;
  min-width: 20px;
  height: 25px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
  flex-shrink: 0;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px 8px;
  font-size: 11px;
}

.ms {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 7px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 6px;
}
.ml {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.mi {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
}
.mi:hover {
  background: #e3f2fd;
}
.mk {
  font-weight: 700;
  width: 90px;
  flex-shrink: 0;
  font-family: monospace;
  font-size: 10px;
}
.me {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.mismatch-row {
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
</style>

<style>
/* Hanya "chrome" preview. CSS label ada di LABEL_CSS (script). */
#bck-print-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.bck-preview.bck-row {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  background: white;
}
.bck-preview-label {
  outline: 1px dashed #ccc;
}
.bck-preview-label.bck-conflict {
  outline: 2px solid #d32f2f;
}
.preview-banner {
  background: #fff3e0;
  color: #e65100;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border-bottom: 1px solid #ffcc80;
  text-align: center;
}
</style>
