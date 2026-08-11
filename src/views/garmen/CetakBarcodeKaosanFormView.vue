<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { cetakBarcodeKaosanFormService as svc } from "@/services/garmen/cetakBarcodeKaosanFormService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BarangKaosanSearchModal from "@/components/lookups/BarangKaosanSearchModal.vue";
import { IconBarcode, IconSearch, IconPrinter } from "@tabler/icons-vue";
import JsBarcode from "jsbarcode";

// ─── Types ────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  kode: string; // SPK nomor (atau kode dasar kalau input dari kaosan langsung)
  kodek: string; // Kode item kaosan
  tglspk: string;
  barcode: string;
  nama: string;
  ukuran: string;
  order: number;
  harga: number;
  awal: number;
  akhir: number;
  jumlah: number;
  cetak: boolean;
  packing: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEdit = computed(() => !!route.query.nomor);
const nomorParam = computed(() => (route.query.nomor as string) || "");

let _keySeq = 0;
const newKey = () => ++_keySeq;

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// [ASUMSI] daftar cabang sama seperti dropdown filter cabang di modul
// lain (PermintaanPembelianView dkk) — kalau daftar aslinya beda,
// sesuaikan array ini.
const CABANG_LIST = ["P01", "P02", "P03", "P04", "P05", "HO-"];

interface CetakBarcodeKaosanFormState {
  nomor: string;
  tanggal: string;
  cab: string;
  detail: DetailRow[];
}

const emptyData: CetakBarcodeKaosanFormState = {
  nomor: "",
  tanggal: todayLocal(),
  cab: "",
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
  fetchApi: async () => {
    const res = await svc.getDetail(nomorParam.value);
    const d = res.data.data;
    return {
      nomor: d.header.nomor,
      tanggal: d.header.tanggal,
      cab: d.header.cab,
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
      detail: (payload.detail as DetailRow[]).map(({ _key, ...rest }) => rest),
    };
    return svc.save(clean);
  },
  onSuccess: (res: any) => {
    const nomorHasil = res.data?.data?.nomor || formData.value.nomor;
    formData.value.nomor = nomorHasil;
    toast.success(`Berhasil disimpan dengan nomor: ${nomorHasil}`);
    triggerPrintFromGrid();
  },
});

// ─── Cabang: fixed kalau user punya cabang sendiri, dropdown kalau kosong ──
const cabFixed = computed(() => !!authStore.user?.cabang);

onMounted(async () => {
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
        awal: 0,
        akhir: 0,
        jumlah: 0,
        cetak: it.cetak,
        packing: "",
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
  activeKaosanRowKey.value = rowKey ?? null;
  showKaosanModal.value = true;
};

const onKaosanItemsSelected = (selectedItems: any[]) => {
  if (!selectedItems?.length) return;
  const replaceKey = activeKaosanRowKey.value;

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
    // ⚠️ Kode dasar (brg_kode) jadi kode & kodek sekaligus, replika
    // loadkaos() Delphi: CDS.kode:=anomor; CDS.kodex:=anomor; CDS.kodek:=anomor
    if (isDup(it.Kode, it.Kode, it.Ukuran, replaceKey)) continue;

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
      awal: 0,
      akhir: 0,
      jumlah: 0,
      cetak: !!it.Barcode,
      packing: "",
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
        awal: 0,
        akhir: 0,
        jumlah: 0,
        cetak: it.cetak,
        packing: "",
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

const onScanBarcodeEnter = async () => {
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

// ─── Validasi & Save (replika F10 Delphi) ───────────────────
const validateSave = () => {
  const validRows = formData.value.detail.filter((d) => d.nama.trim() !== "");
  if (!validRows.length) {
    toast.warning("Detail harus diisi.");
    return;
  }
  for (const d of validRows) {
    if (d.cetak) {
      if (!d.awal || !d.akhir) {
        toast.warning("Awal atau Akhir harus diisi.");
        return;
      }
      if (d.awal > d.akhir) {
        toast.warning("Awal tidak boleh > Akhir.");
        return;
      }
    }
  }
  showSaveDialog.value = true;
};

// ─── Printer & Print Preview (client-side, replika cetak() Delphi) ──
type PrinterType = "XP360B" | "POSTEK";
const selectedPrinter = ref<PrinterType>("XP360B");
const cetakHarga = ref(false);
const isPrintPreviewVisible = ref(false);
const printPreviewData = ref<any[]>([]);

const fr = (v: number) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const chunkedPreviewData = computed(() => {
  const chunkSize = selectedPrinter.value === "POSTEK" ? 3 : 2;
  const result = [];
  for (let i = 0; i < printPreviewData.value.length; i += chunkSize) {
    result.push(printPreviewData.value.slice(i, i + chunkSize));
  }
  return result;
});

const buildPrintData = (rows: DetailRow[], nomorDok: string) => {
  const output: any[] = [];
  let urut = 0;
  for (const row of rows) {
    if (!row.barcode || !row.cetak || (row.jumlah || 0) <= 0) continue;
    for (let i = row.awal; i <= row.akhir; i++) {
      urut++;
      const hargaFormatted =
        cetakHarga.value && Number(row.harga) > 0 ? `Rp ${fr(row.harga)}` : "";
      output.push({
        nomor: nomorDok,
        tgl: row.tglspk ? row.tglspk.split("-").reverse().join("/") : "",
        kode: row.kodek,
        ukuran: row.ukuran,
        barcode: row.barcode,
        nama: row.nama,
        harga: row.harga,
        charga: hargaFormatted,
        nourut: urut,
      });
    }
  }
  return output;
};

const triggerPrintFromGrid = () => {
  const validRows = formData.value.detail.filter((d) => d.nama.trim() !== "");
  const data = buildPrintData(validRows, formData.value.nomor);
  if (!data.length) {
    // Tidak ada yang perlu dicetak (semua cetak=false) -> langsung balik ke browse
    router.push({ name: "CetakBarcodeKaosanBrowse" });
    return;
  }
  printPreviewData.value = data;
  isPrintPreviewVisible.value = true;
};

const testPrinter = () => {
  const jumlahTes = selectedPrinter.value === "POSTEK" ? 3 : 2;
  const dummy: any[] = [];
  for (let i = 1; i <= jumlahTes; i++) {
    dummy.push({
      nomor: "TES",
      tgl: todayLocal().split("-").reverse().join("/"),
      kode: "12345678",
      ukuran: "TES",
      barcode: "12345678",
      nama: "TES PRINTER",
      harga: 0,
      charga: "",
      nourut: i,
    });
  }
  printPreviewData.value = dummy;
  isPrintPreviewVisible.value = true;
};

const generateBarcodesInPreview = async () => {
  await nextTick();
  const area = document.getElementById("bck-print-area");
  if (!area) return;
  const svgs = area.querySelectorAll<SVGElement>(".bck-barcode-svg");
  svgs.forEach((svg) => {
    const val = svg.getAttribute("data-barcode-value");
    if (!val) return;
    try {
      JsBarcode(svg, val, {
        format: "CODE128",
        lineColor: "#000",
        width: 1.2,
        height: 25,
        displayValue: false,
        margin: 1,
      });
    } catch (e) {
      console.error(e);
    }
  });
};

watch([printPreviewData, isPrintPreviewVisible], () => {
  if (isPrintPreviewVisible.value && printPreviewData.value.length) {
    setTimeout(() => generateBarcodesInPreview(), 100);
  }
});

const printStylesXP360B = `
  @page { size: 68mm 15mm landscape; margin: 0 !important; }
  html, body { margin:0; padding:0; width:68mm; background:#fff; -webkit-print-color-adjust: exact; }
  .bck-row { display:flex; width:68mm; height:15mm; align-items:center; gap:3mm; padding:0 1mm; box-sizing:border-box; page-break-after: always !important; }
  .bck-label { width:31mm; height:14mm; display:flex; flex-direction:column; padding:0.5mm 0 0 2mm; box-sizing:border-box; overflow:hidden; }
  .bck-nama { font-size:5pt; font-weight:bold; font-family:'Arial Narrow',Arial,sans-serif; line-height:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .bck-ukuran { font-size:4.5pt; font-family:Arial; }
  .bck-barcode-svg { width:27mm !important; height:5.5mm !important; margin:0.1mm 0; }
  .bck-footer { display:flex; justify-content:space-between; width:95%; font-size:4.5pt; font-family:Arial,sans-serif; font-weight:bold; }
`;
const printStylesPostek = `
  @page { size: 108mm 17mm landscape; margin: 0 !important; }
  html, body { margin:0; padding:0; width:108mm; background:#fff; -webkit-print-color-adjust: exact; }
  .bck-row { display:flex; width:108mm; height:17mm; align-items:center; gap:2mm; padding:0 1mm; box-sizing:border-box; }
  .bck-row:not(:last-child) { page-break-after: always !important; }
  .bck-label { width:34mm; height:16mm; display:flex; flex-direction:column; padding:0.5mm 0 0 2mm; box-sizing:border-box; overflow:hidden; }
  .bck-nama { font-size:5pt; font-weight:bold; font-family:'Arial Narrow',Arial,sans-serif; line-height:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .bck-ukuran { font-size:4.5pt; font-family:Arial; }
  .bck-barcode-svg { width:29mm !important; height:6mm !important; margin:0.1mm 0; }
  .bck-footer { display:flex; justify-content:space-between; width:95%; font-size:4.5pt; font-family:Arial,sans-serif; font-weight:bold; }
`;

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
    doc.open();
    const styles =
      selectedPrinter.value === "POSTEK"
        ? printStylesPostek
        : printStylesXP360B;
    doc.write(
      `<html><head><title>Cetak Barcode</title><style>${styles}</style></head><body>`,
    );
    doc.write(content.innerHTML);
    doc.write("</body></html>");
    doc.close();

    const svgs = doc.querySelectorAll(".bck-barcode-svg");
    svgs.forEach((svg) => {
      const val = svg.getAttribute("data-barcode-value");
      if (val) {
        try {
          JsBarcode(svg as SVGElement, val, {
            format: "CODE128",
            lineColor: "#000",
            width: 1,
            height: 20,
            displayValue: false,
            margin: 0,
          });
        } catch (e) {
          console.error(e);
        }
      }
    });

    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => document.body.removeChild(frame), 1500);
    }, 400);
  }
  closePreview();
};

const closePreview = () => {
  isPrintPreviewVisible.value = false;
  if (formData.value.nomor && formData.value.nomor !== "TES") {
    router.push({ name: "CetakBarcodeKaosanBrowse" });
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

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl-full">Scan Barcode (Cari Kode Kaosan)</label>
        </div>
        <input
          v-model="scanBarcodeValue"
          class="inp w-100"
          placeholder="Scan / ketik barcode + Enter"
          @keydown.enter.prevent="onScanBarcodeEnter"
        />

        <div class="sep mt-2 mb-2" />

        <button type="button" class="btn-tes-printer" @click="testPrinter">
          <IconPrinter :size="14" class="mr-1" /> Tes Printer
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

        <label class="chk mt-2">
          <input type="checkbox" v-model="cetakHarga" />
          Cetak Harga
        </label>
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
                        :class="{ ro: !!row.nama }"
                        :readonly="!!row.nama"
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
                      style="background: #fffde7"
                      @input="onAwalAkhirChange(row)"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.akhir"
                      type="number"
                      min="0"
                      class="ci text-right"
                      style="background: #fffde7"
                      @input="onAwalAkhirChange(row)"
                      v-select-on-focus
                    />
                  </td>
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
                  <td colspan="15" class="empty-row">
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
      <v-card-text class="pa-4" style="background: #525659">
        <div
          id="bck-print-area"
          :class="
            selectedPrinter === 'POSTEK' ? 'printer-postek' : 'printer-xp360b'
          "
        >
          <div
            v-for="(chunk, i) in chunkedPreviewData"
            :key="i"
            class="bck-row bck-preview"
          >
            <div
              v-for="item in chunk"
              :key="item.nourut"
              class="bck-label bck-preview-label"
            >
              <div class="bck-nama">{{ item.nama }}</div>
              <div class="bck-ukuran">{{ item.ukuran }}</div>
              <svg
                class="bck-barcode-svg"
                :data-barcode-value="item.barcode"
              ></svg>
              <div class="bck-footer">
                <div
                  style="
                    display: flex;
                    flex-direction: column;
                    line-height: 1.1;
                  "
                >
                  <span>{{ item.barcode }}</span>
                  <span v-if="item.charga" style="font-weight: normal">{{
                    item.charga
                  }}</span>
                </div>
                <span>{{ item.tgl }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="closePreview">Tutup</v-btn>
        <v-btn color="primary" @click="triggerBrowserPrint">
          <template #prepend><IconPrinter :size="15" /></template>Cetak
        </v-btn>
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
</style>

<style>
/* ── Print preview & print (non-scoped, dipakai iframe cetak juga) ── */
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
  border: 1px dashed #ccc;
}
.bck-barcode-svg {
  display: block;
}
.bck-barcode-svg rect {
  fill: #fff !important;
}
.bck-barcode-svg g,
.bck-barcode-svg path,
.bck-barcode-svg line {
  stroke: #000 !important;
  fill: #000 !important;
}

/* ── Layout preview di layar — TERPISAH dari printStylesXP360B/Postek
   yang cuma dipakai di iframe cetak. Ukuran disamakan biar preview =
   hasil cetak fisik. ── */
.printer-xp360b .bck-row {
  display: flex;
  width: 68mm;
  height: 15mm;
  align-items: center;
  gap: 3mm;
  padding: 0 1mm;
  box-sizing: border-box;
}
.printer-xp360b .bck-label {
  width: 31mm;
  height: 14mm;
  display: flex;
  flex-direction: column;
  padding: 0.5mm 0 0 2mm;
  box-sizing: border-box;
  overflow: hidden;
}
.printer-xp360b .bck-nama {
  font-size: 5pt;
  font-weight: bold;
  font-family: "Arial Narrow", Arial, sans-serif;
  line-height: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.printer-xp360b .bck-ukuran {
  font-size: 4.5pt;
  font-family: Arial;
}
.printer-xp360b .bck-barcode-svg {
  width: 27mm !important;
  height: 5.5mm !important;
  margin: 0.1mm 0;
}
.printer-xp360b .bck-footer {
  display: flex;
  justify-content: space-between;
  width: 95%;
  font-size: 4.5pt;
  font-family: Arial, sans-serif;
  font-weight: bold;
}

.printer-postek .bck-row {
  display: flex;
  width: 108mm;
  height: 17mm;
  align-items: center;
  gap: 2mm;
  padding: 0 1mm;
  box-sizing: border-box;
}
.printer-postek .bck-label {
  width: 34mm;
  height: 16mm;
  display: flex;
  flex-direction: column;
  padding: 0.5mm 0 0 2mm;
  box-sizing: border-box;
  overflow: hidden;
}
.printer-postek .bck-nama {
  font-size: 5pt;
  font-weight: bold;
  font-family: "Arial Narrow", Arial, sans-serif;
  line-height: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.printer-postek .bck-ukuran {
  font-size: 4.5pt;
  font-family: Arial;
}
.printer-postek .bck-barcode-svg {
  width: 29mm !important;
  height: 6mm !important;
  margin: 0.1mm 0;
}
.printer-postek .bck-footer {
  display: flex;
  justify-content: space-between;
  width: 95%;
  font-size: 4.5pt;
  font-family: Arial, sans-serif;
  font-weight: bold;
}

#bck-print-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.bck-preview.bck-row {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  background: white;
}
</style>
