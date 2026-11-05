<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import QRCode from "qrcode";
import BaseForm from "@/components/BaseForm.vue";
import BahanMmtSearchModal from "@/components/lookups/BahanMmtSearchModal.vue";
import GudangMmtSearchModal from "@/components/lookups/GudangMmtSearchModal.vue";
import api from "@/services/api";
import {
  IconBarcode,
  IconSearch,
  IconTrash,
  IconQrcode,
  IconPrinter,
  IconDeviceFloppy,
  IconDatabaseSearch,
  IconX,
  IconAlertCircle,
  IconPlus,
  IconDownload,
  IconBuildingWarehouse,
} from "@tabler/icons-vue";

// --- Interfaces ---
interface BarcodeQueueItem {
  tanggal: string;
  kodeBahan: string;
  namaBahan: string;
  barcode: string;
  panjang: number;
  lebar: number;
  gudangKode: string;
  copies: number;
  isNew: boolean;
  qrImage: string;
}

interface FormState {
  tanggal: string;
  kodeBahan: string;
  namaBahan: string;
  panjang: number;
  lebar: number;
  gudangKode: string;
  gudangNama: string;
  qty: number;
  copiesPerRoll: number;
  barcodeSearchInput: string;
  qrSize: string; // '1.5' | '3' | '5'
}

const router = useRouter();
const toast = useToast();

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// --- State ---
const activeTab = ref(0); // 0: Generate Baru, 1: Reprint (Ambil DB)
const isLoading = ref(false);
const isSaving = ref(false);
const showBahanModal = ref(false);
const showGudangModal = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

const listPending = ref<BarcodeQueueItem[]>([]);

const form = reactive<FormState>({
  tanggal: getToday(),
  kodeBahan: "",
  namaBahan: "",
  panjang: 0,
  lebar: 0,
  gudangKode: "WH-16",
  gudangNama: "GUDANG UTAMA MMT",
  qty: 1,
  copiesPerRoll: 2, // Standar MMT: 2 label stiker per rol
  barcodeSearchInput: "",
  qrSize: "1.5", // Default 1.5 cm
});

const qrSizeOptions = [
  { label: "1.5 cm (Kecil)", value: "1.5" },
  { label: "3.0 cm (Sedang)", value: "3" },
  { label: "5.0 cm (Besar)", value: "5" },
];

// --- Computed ---
const totalNewItems = computed(
  () => listPending.value.filter((it) => it.isNew).length,
);

const totalStickerLabels = computed(() =>
  listPending.value.reduce((acc, it) => acc + (it.copies || 1), 0),
);

// --- Methods ---
const onSelectGudang = (g: { Kode: string; Nama: string }) => {
  form.gudangKode = g.Kode;
  form.gudangNama = g.Nama;
};

const onSelectBahan = (b: any) => {
  form.kodeBahan = b.Kode || b.brg_kode || "";
  form.namaBahan = b.Nama || b.brg_nama || "";
  form.panjang = Number(b.Panjang || b.brg_panjang || 0);
  form.lebar = Number(b.Lebar || b.brg_lebar || 0);
};

// 1. Generate Barcode Baru
const handleGenerateBarcodes = async () => {
  if (!form.kodeBahan) {
    toast.warning("Silakan pilih bahan terlebih dahulu.");
    return;
  }
  if (!form.qty || form.qty <= 0) {
    toast.warning("Jumlah rol barcode minimal 1.");
    return;
  }

  isLoading.value = true;
  try {
    const res = await api.get(
      "/mmt/bahan-baku-produksi/barcode/create/next-number",
      {
        params: {
          kodeBahan: form.kodeBahan,
          tanggal: form.tanggal,
        },
      },
    );

    if (res.data?.success) {
      const ym = res.data.ym;
      let startSeq = Number(res.data.nextSeq);

      // Sinkronisasi dengan item yang belum disimpan di antrean lokal
      const sameBahanInAntrean = listPending.value.filter(
        (it) => it.kodeBahan === form.kodeBahan && it.isNew,
      );

      if (sameBahanInAntrean.length > 0) {
        const lastBarcode =
          sameBahanInAntrean[sameBahanInAntrean.length - 1].barcode;
        const parts = lastBarcode.split("-");
        const lastSeqNumber = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeqNumber)) {
          startSeq = lastSeqNumber + 1;
        }
      }

      for (let i = 0; i < form.qty; i++) {
        const currentSeq = startSeq + i;
        const seqStr = String(currentSeq).padStart(3, "0");
        const barcode = `${form.kodeBahan}-${ym}-${seqStr}`;

        if (!listPending.value.some((it) => it.barcode === barcode)) {
          const qrImage = await QRCode.toDataURL(barcode, {
            width: 300,
            margin: 0,
            errorCorrectionLevel: "M",
          });

          listPending.value.push({
            tanggal: form.tanggal,
            kodeBahan: form.kodeBahan,
            namaBahan: form.namaBahan,
            barcode,
            panjang: form.panjang,
            lebar: form.lebar,
            gudangKode: form.gudangKode,
            copies: form.copiesPerRoll || 2,
            isNew: true,
            qrImage,
          });
        }
      }

      toast.success(
        `Berhasil generate ${form.qty} rol baru (${form.qty * (form.copiesPerRoll || 2)} label stiker).`,
      );
    }
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || "Gagal generate nomor urut barcode.",
    );
  } finally {
    isLoading.value = false;
  }
};

// 2. Ambil Barcode Lama Dari Database (Reprint)
const handleFindOldBarcode = async () => {
  const code = form.barcodeSearchInput?.trim();
  if (!code) {
    toast.warning("Silakan scan atau masukkan kode barcode.");
    return;
  }

  if (listPending.value.some((it) => it.barcode === code)) {
    toast.warning(`Barcode ${code} sudah ada di dalam antrean!`);
    form.barcodeSearchInput = "";
    return;
  }

  isLoading.value = true;
  try {
    const res = await api.get(
      `/mmt/bahan-baku-produksi/stok-gudang/${encodeURIComponent(code)}`,
    );
    const infoStok = res.data?.data;

    if (infoStok) {
      const barcodeVal = infoStok.Barcode || code;
      const qrImage = await QRCode.toDataURL(barcodeVal, {
        width: 300,
        margin: 0,
        errorCorrectionLevel: "M",
      });

      listPending.value.push({
        barcode: barcodeVal,
        kodeBahan: infoStok.Kode || "",
        namaBahan: infoStok.Nama_Bahan || "Material Terdaftar",
        panjang: Number(infoStok.Sisa_Panjang_Stok || infoStok.Panjang || 0),
        lebar: Number(infoStok.Lebar || 0),
        tanggal: getToday(),
        gudangKode: infoStok.Kode_Gudang || form.gudangKode,
        copies: form.copiesPerRoll || 2,
        isNew: false,
        qrImage,
      });

      form.barcodeSearchInput = "";
      toast.success(`Barcode ${code} berhasil dimuat ke antrean.`);
    } else {
      toast.error("Barcode tidak ditemukan di master stok gudang!");
    }
  } catch (err: any) {
    toast.error(
      err.response?.data?.message ||
        "Gagal memuat data barcode dari master stok.",
    );
  } finally {
    isLoading.value = false;
  }
};

// 3. Hapus baris dari antrean
const removeItem = (idx: number) => {
  listPending.value.splice(idx, 1);
};

// 4. Simpan Seluruh Item Baru ke Database
const executeSave = async () => {
  const uniqueNewItems: BarcodeQueueItem[] = [];
  const visited = new Set<string>();

  for (const item of listPending.value) {
    if (item.isNew && !visited.has(item.barcode)) {
      visited.add(item.barcode);
      uniqueNewItems.push(item);
    }
  }

  if (uniqueNewItems.length === 0) {
    toast.warning("Tidak ada data baru yang perlu disimpan ke database.");
    showSaveDialog.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const d = new Date();
    const batchNoRef = `REF-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;

    const payload = {
      items: uniqueNewItems.map((it) => ({
        tanggal: it.tanggal,
        kodeBahan: it.kodeBahan,
        barcode: it.barcode,
        panjang: it.panjang,
        lebar: it.lebar,
        noRef: batchNoRef,
      })),
    };

    await api.post(
      "/mmt/bahan-baku-produksi/barcode/create/save-batch",
      payload,
    );

    toast.success(
      `Berhasil mendaftarkan ${uniqueNewItems.length} rol barcode ke database (No. Ref: ${batchNoRef}).`,
    );

    // Tandai semua item sebagai tersimpan
    listPending.value.forEach((it) => (it.isNew = false));
    showSaveDialog.value = false;
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || "Gagal menyimpan barcode ke database.",
    );
  } finally {
    isSaving.value = false;
  }
};

// 5. Cetak Label Stiker (Sesuai Sistem MMT)
const handlePrintLayout = () => {
  if (listPending.value.length === 0) {
    toast.warning("Tidak ada antrean label untuk dicetak.");
    return;
  }

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const sizeNum = parseFloat(form.qrSize);
  const qrDimension = `${form.qrSize}cm`;

  let boxWidth = "70mm";
  let boxHeight = "50mm";
  let fontSizeDimens = "11pt";
  let fontSizeName = "13pt";
  let fontSizeBarcode = "8pt";

  if (sizeNum >= 5) {
    boxWidth = "95mm";
    boxHeight = "75mm";
    fontSizeDimens = "14pt";
    fontSizeName = "16pt";
    fontSizeBarcode = "10pt";
  } else if (sizeNum >= 3) {
    boxWidth = "85mm";
    boxHeight = "60mm";
    fontSizeDimens = "12pt";
    fontSizeName = "14pt";
    fontSizeBarcode = "9pt";
  }

  // Bangun daftar HTML label sesuai jumlah salinan stiker
  const labelHtmlList: string[] = [];
  listPending.value.forEach((item) => {
    const copyCount = item.copies || 1;
    for (let c = 0; c < copyCount; c++) {
      labelHtmlList.push(`
        <div class="label-box">
          <div class="border-inner">
            <div class="top-row">
              <img src="${item.qrImage}" class="qr-img" />
              <div class="info-column">
                <div class="qr-text">${item.barcode}</div>
                <div class="dimens-text">${Number(item.panjang).toFixed(2)} × ${Number(item.lebar).toFixed(2)} M</div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="product-name">${item.namaBahan || item.kodeBahan}</div>
          </div>
        </div>
      `);
    }
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cetak Label Stiker Barcode MMT</title>
        <style>
          @page { size: 101.2mm 101mm portrait; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
          .label-box { width: ${boxWidth}; height: ${boxHeight}; padding: 3mm; box-sizing: border-box; }
          .label-box:nth-child(2n) { page-break-after: always; }
          .border-inner { border: 1pt solid black; height: 100%; width: 100%; padding: 2mm; display: flex; flex-direction: column; box-sizing: border-box; }
          .top-row { display: flex; gap: 10px; margin-bottom: 4px; align-items: center; }
          .qr-img { width: ${qrDimension}; height: ${qrDimension}; object-fit: contain; }
          .info-column { display: flex; flex-direction: column; justify-content: center; }
          .qr-text { font-weight: bold; font-size: ${fontSizeBarcode}; word-break: break-all; font-family: monospace; }
          .dimens-text { font-size: ${fontSizeDimens}; font-weight: bold; margin-top: 5px; }
          .divider { border-top: 1pt solid black; width: 100%; margin: 4px 0; }
          .product-name { font-size: ${fontSizeName}; font-weight: bold; text-align: center; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase; }
        </style>
      </head>
      <body>
        ${labelHtmlList.join("")}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    document.body.removeChild(iframe);
  }, 400);
};

// 6. Download Label JPG (Menggunakan Canvas 2D)
const handleDownloadJpg = async () => {
  if (listPending.value.length === 0) {
    toast.warning("Tidak ada antrean label untuk di-download.");
    return;
  }

  isLoading.value = true;
  try {
    const sizeNum = parseFloat(form.qrSize);
    let widthPx = 700;
    let heightPx = 500;
    let qrSizePx = 250;
    if (sizeNum >= 5) {
      widthPx = 950;
      heightPx = 750;
      qrSizePx = 350;
    } else if (sizeNum >= 3) {
      widthPx = 850;
      heightPx = 600;
      qrSizePx = 300;
    }

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal membuat konteks canvas 2D");

    for (let i = 0; i < listPending.value.length; i++) {
      const it = listPending.value[i];

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, widthPx, heightPx);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, widthPx - 32, heightPx - 32);

      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("Gagal memuat QR image"));
        qrImg.src = it.qrImage;
      });
      ctx.drawImage(qrImg, 32, 32, qrSizePx, qrSizePx);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 26px monospace";
      ctx.fillText(it.barcode, 48 + qrSizePx, 80);

      ctx.font = "bold 32px Arial";
      ctx.fillText(
        `${Number(it.panjang).toFixed(2)} × ${Number(it.lebar).toFixed(2)} M`,
        48 + qrSizePx,
        140,
      );

      ctx.beginPath();
      ctx.moveTo(32, 48 + qrSizePx);
      ctx.lineTo(widthPx - 32, 48 + qrSizePx);
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      const bahanText = (it.namaBahan || it.kodeBahan).toUpperCase();
      ctx.fillText(bahanText, widthPx / 2, heightPx - 50);
      ctx.textAlign = "left";

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Label-${it.barcode}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await new Promise((r) => setTimeout(r, 200));
    }

    toast.success("Semua label berhasil di-download sebagai JPG!");
  } catch (err: any) {
    console.error("Error download JPG:", err);
    toast.error("Gagal mendownload label sebagai JPG.");
  } finally {
    isLoading.value = false;
  }
};

// 7. Reset & Batal
const executeCancel = () => {
  listPending.value = [];
  showCancelDialog.value = false;
  toast.info("Antrean barcode berhasil direset.");
};

// 8. Tutup
const executeClose = () => {
  showCloseDialog.value = false;
  router.push("/mmt/bahan-baku-produksi/create-barcode");
};
</script>

<template>
  <div class="create-barcode-form-wrapper">
    <BaseForm
      title="Create Barcode Rol"
      menu-id="5541"
      :icon="IconBarcode"
      :is-loading="isLoading"
      :is-saving="isSaving"
      item-name="Barcode Rol"
      desktop-mode
      v-model:show-save-dialog="showSaveDialog"
      v-model:show-cancel-dialog="showCancelDialog"
      v-model:show-close-dialog="showCloseDialog"
      @validate-save="showSaveDialog = true"
      @confirm-save="executeSave"
      @confirm-cancel="executeCancel"
      @confirm-close="executeClose"
    >
      <!-- HEADER ACTIONS -->
      <template #header-actions>
        <v-btn
          size="small"
          color="primary"
          class="mr-2 text-none font-weight-medium"
          :disabled="totalNewItems === 0 || isSaving"
          :loading="isSaving"
          @click="showSaveDialog = true"
        >
          <template #prepend>
            <IconDeviceFloppy :size="15" />
          </template>
          Simpan ke DB ({{ totalNewItems }})
        </v-btn>

        <v-btn
          size="small"
          color="secondary"
          variant="tonal"
          class="mr-2 text-none font-weight-medium"
          :disabled="listPending.length === 0"
          @click="handlePrintLayout"
        >
          <template #prepend>
            <IconPrinter :size="15" />
          </template>
          Cetak Label ({{ totalStickerLabels }})
        </v-btn>

        <v-btn
          size="small"
          color="success"
          variant="tonal"
          class="mr-2 text-none font-weight-medium"
          :disabled="listPending.length === 0"
          :loading="isLoading"
          @click="handleDownloadJpg"
        >
          <template #prepend>
            <IconDownload :size="15" />
          </template>
          Download JPG
        </v-btn>

        <v-btn
          size="small"
          variant="outlined"
          class="mx-1 text-none"
          :disabled="listPending.length === 0"
          @click="showCancelDialog = true"
        >
          Reset
        </v-btn>

        <v-btn
          size="small"
          variant="tonal"
          color="error"
          class="text-none"
          @click="showCloseDialog = true"
        >
          <template #prepend>
            <IconX :size="15" />
          </template>
          Tutup
        </v-btn>
      </template>

      <!-- ══════════════════════════════════════════════════════════
           ── KOLOM KIRI (PANEL PARAMETER & INPUT MODE SESUAI MMT) ──
           ══════════════════════════════════════════════════════════ -->
      <template #left-column>
        <div class="panel-left-container">
          <!-- Card Pengaturan Input & Tabs Mode -->
          <div class="desktop-form-section">
            <!-- Tab Mode: Baru vs Reprint -->
            <div class="tabs-header-wrapper mb-3">
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeTab === 0 }"
                @click="activeTab = 0"
              >
                Baru
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: activeTab === 1 }"
                @click="activeTab = 1"
              >
                Ambil DB (Reprint)
              </button>
            </div>

            <!-- Pilihan Ukuran QR Code -->
            <div class="fr">
              <label class="lbl">Ukuran Cetak QR</label>
              <select v-model="form.qrSize" class="inp iselect flex-1">
                <option
                  v-for="opt in qrSizeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Salinan Label per Rol -->
            <div class="fr">
              <label class="lbl">Salinan / Rol</label>
              <div class="d-flex align-center gap-2 flex-1">
                <input
                  type="number"
                  v-model.number="form.copiesPerRoll"
                  min="1"
                  max="5"
                  class="inp tc fw"
                  style="width: 50px"
                />
                <span class="text-caption text-grey-darken-1">lembar</span>
              </div>
            </div>

            <div class="form-divider my-2"></div>

            <!-- ── TAB 0: GENERATE BARCODE BARU ── -->
            <div v-if="activeTab === 0">
              <div class="section-label">Data Rol Bahan Masuk</div>

              <!-- Tanggal Masuk -->
              <div class="fr">
                <label class="lbl">Tanggal Masuk</label>
                <input
                  type="date"
                  v-model="form.tanggal"
                  class="idate flex-1"
                  required
                />
              </div>

              <!-- Gudang Penyimpanan -->
              <div class="fr">
                <label class="lbl">Gudang</label>
                <div class="igrp flex-1">
                  <input
                    type="text"
                    :value="`${form.gudangKode} - ${form.gudangNama}`"
                    class="inp ro fw text-primary"
                    readonly
                    title="Gudang Penyimpanan Bahan MMT"
                    @click="showGudangModal = true"
                  />
                  <button
                    type="button"
                    class="blkp"
                    @click="showGudangModal = true"
                    title="Pilih Gudang MMT"
                  >
                    <IconBuildingWarehouse :size="13" />
                  </button>
                </div>
              </div>

              <!-- Pilih Bahan Master -->
              <div class="fr">
                <label class="lbl">Pilih Bahan</label>
                <div class="igrp flex-1">
                  <input
                    type="text"
                    :value="
                      form.kodeBahan
                        ? `${form.kodeBahan} - ${form.namaBahan}`
                        : ''
                    "
                    readonly
                    class="inp fw text-primary"
                    placeholder="Pilih Bahan MMT..."
                    @click="showBahanModal = true"
                  />
                  <button
                    v-if="form.kodeBahan"
                    type="button"
                    class="bclr"
                    @click.stop="
                      form.kodeBahan = '';
                      form.namaBahan = '';
                      form.panjang = 0;
                      form.lebar = 0;
                    "
                    title="Hapus pilihan bahan"
                  >
                    <IconX :size="12" />
                  </button>
                  <button
                    type="button"
                    class="blkp"
                    @click="showBahanModal = true"
                    title="Cari Bahan MMT"
                  >
                    <IconSearch :size="13" />
                  </button>
                </div>
              </div>

              <!-- Dimensi Bahan (Panjang x Lebar) -->
              <div class="fr">
                <label class="lbl">Dimensi (P × L)</label>
                <div class="dimen-row flex-1">
                  <div class="dimen-field">
                    <span class="dimen-tag" title="Panjang Bahan">P</span>
                    <input
                      type="number"
                      step="0.01"
                      v-model.number="form.panjang"
                      class="inp tr dimen-inp"
                      placeholder="0.00"
                      title="Panjang bahan (meter)"
                    />
                    <span class="dimen-unit">m</span>
                  </div>
                  <span class="dimen-cross">×</span>
                  <div class="dimen-field">
                    <span class="dimen-tag" title="Lebar Bahan">L</span>
                    <input
                      type="number"
                      step="0.01"
                      v-model.number="form.lebar"
                      class="inp tr dimen-inp"
                      placeholder="0.00"
                      title="Lebar bahan (meter)"
                    />
                    <span class="dimen-unit">m</span>
                  </div>
                </div>
              </div>

              <!-- Jumlah Rol Baru -->
              <div class="fr">
                <label class="lbl">Jumlah Rol</label>
                <input
                  type="number"
                  v-model.number="form.qty"
                  min="1"
                  class="inp tr fw flex-1"
                  placeholder="Jumlah rol..."
                />
              </div>

              <!-- Tombol Eksekusi Generate -->
              <div class="mt-3">
                <v-btn
                  block
                  color="primary"
                  size="small"
                  class="text-none font-weight-medium"
                  :loading="isLoading"
                  @click="handleGenerateBarcodes"
                >
                  <IconPlus :size="15" class="mr-1" />
                  Barcode Rol Baru
                </v-btn>
              </div>
            </div>

            <!-- ── TAB 1: REPRINT DARI DATABASE ── -->
            <div v-else>
              <div class="section-label">Scan Barcode Terdaftar</div>

              <div class="info-alert mb-3">
                <IconAlertCircle
                  :size="15"
                  class="mr-1 text-primary flex-shrink-0"
                />
                <span class="text-caption text-grey-darken-2">
                  Scan atau masukkan kode barcode dari master stok database
                  untuk dicetak ulang labelnya tanpa menambah nomor urut baru.
                </span>
              </div>

              <div class="fr">
                <label class="lbl">Scan Barcode</label>
                <div class="igrp flex-1">
                  <input
                    type="text"
                    v-model="form.barcodeSearchInput"
                    placeholder="..."
                    class="inp font-monospace"
                    autofocus
                    @keyup.enter="handleFindOldBarcode"
                  />
                  <button
                    type="button"
                    class="blkp"
                    @click="handleFindOldBarcode"
                    title="Scan Barcode"
                  >
                    <IconBarcode :size="13" />
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <v-btn
                  block
                  color="indigo"
                  size="small"
                  class="text-none font-weight-medium text-white"
                  :loading="isLoading"
                  :disabled="!form.barcodeSearchInput"
                  @click="handleFindOldBarcode"
                >
                  <IconDatabaseSearch :size="15" class="mr-1" />
                  Ambil Dari Database
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════
           ── KOLOM KANAN (TABEL ANTREAN BARCODE ROL TEMA MANKSI) ──
           ══════════════════════════════════════════════════════════ -->
      <template #right-column>
        <div class="queue-panel-wrapper">
          <!-- Header Tabel Navy Manksi -->
          <div class="tbl-header">
            <div class="d-flex align-center">
              <IconBarcode :size="16" class="mr-2" />
              <span class="tbl-title">
                DAFTAR ANTREAN CETAK & REGISTER BARCODE ROL
              </span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="badge-tag">
                Total:
                <strong>{{ listPending.length }}</strong> Rol
              </span>
              <span class="badge-tag badge-new" v-if="totalNewItems > 0">
                <strong>{{ totalNewItems }}</strong> Baru (Belum Disimpan)
              </span>
              <span class="badge-tag badge-labels">
                <strong>{{ totalStickerLabels }}</strong> Label Stiker
              </span>
            </div>
          </div>

          <!-- Wrapper Tabel Border Manksi -->
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 35px" class="tc">No</th>
                  <th style="width: 50px" class="tc">QR</th>
                  <th style="width: 170px">Barcode Rol</th>
                  <th style="width: 120px">Kode Bahan</th>
                  <th>Nama Bahan</th>
                  <th style="width: 110px" class="tr">Dimensi (P × L)</th>
                  <th style="width: 70px" class="tc">Salinan</th>
                  <th style="width: 80px" class="tc">Tipe</th>
                  <th style="width: 40px" class="tc">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, idx) in listPending" :key="idx">
                  <td class="tc text-caption text-grey-darken-1">
                    {{ idx + 1 }}
                  </td>
                  <td class="tc py-1">
                    <img
                      :src="it.qrImage"
                      alt="QR"
                      class="qr-thumbnail"
                      title="Preview QR Code Stiker"
                    />
                  </td>
                  <td class="font-monospace fw text-primary text-caption">
                    {{ it.barcode }}
                  </td>
                  <td class="font-weight-medium text-caption">
                    {{ it.kodeBahan }}
                  </td>
                  <td
                    class="text-caption text-truncate"
                    style="max-width: 250px"
                  >
                    {{ it.namaBahan || "-" }}
                  </td>
                  <td class="tr text-caption">
                    {{ Number(it.panjang).toFixed(2) }}m ×
                    {{ Number(it.lebar).toFixed(2) }}m
                  </td>
                  <td class="tc">
                    <input
                      type="number"
                      v-model.number="it.copies"
                      min="1"
                      max="10"
                      class="copies-inp"
                      title="Jumlah lembar salinan stiker untuk rol ini"
                    />
                  </td>
                  <td class="tc">
                    <v-chip
                      size="x-small"
                      :color="it.isNew ? 'success' : 'indigo'"
                      variant="flat"
                      class="text-white font-weight-bold"
                    >
                      {{ it.isNew ? "BARU" : "REPRINT" }}
                    </v-chip>
                  </td>
                  <td class="tc">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeItem(idx)"
                      title="Hapus rol dari antrean"
                    >
                      <IconTrash :size="14" />
                    </button>
                  </td>
                </tr>

                <tr v-if="listPending.length === 0">
                  <td colspan="9" class="tc py-8 text-grey-darken-1">
                    <div class="empty-queue-state">
                      <IconBarcode
                        :size="32"
                        class="text-grey-lighten-1 mb-2"
                      />
                      <div class="font-weight-medium">
                        Belum ada antrean barcode rol
                      </div>
                      <div class="text-caption text-grey">
                        Pilih tab
                        <strong>"Generate Baru"</strong>
                        untuk membuat nomor urut barcode baru, atau tab
                        <strong>"Ambil DB (Reprint)"</strong>
                        untuk mencetak ulang barcode yang sudah terdaftar.
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary Footer Manksi -->
          <div class="summary-footer">
            <span class="text-caption text-grey-darken-2">
              * Data dengan status
              <strong class="text-success">BARU</strong> wajib disimpan ke
              database sebelum dicatat di master stok.
            </span>
            <div class="d-flex align-center gap-2">
              <v-btn
                v-if="totalNewItems > 0"
                size="x-small"
                color="primary"
                variant="flat"
                class="text-none font-weight-medium"
                :loading="isSaving"
                @click="showSaveDialog = true"
              >
                Simpan ke Database ({{ totalNewItems }})
              </v-btn>
              <v-btn
                v-if="listPending.length > 0"
                size="x-small"
                color="secondary"
                variant="tonal"
                class="text-none font-weight-medium"
                @click="handlePrintLayout"
              >
                Cetak Label Stiker ({{ totalStickerLabels }})
              </v-btn>
            </div>
          </div>
        </div>
      </template>
    </BaseForm>

    <!-- Lookups Modal -->
    <BahanMmtSearchModal v-model="showBahanModal" @selected="onSelectBahan" />
    <GudangMmtSearchModal
      v-model="showGudangModal"
      @selected="onSelectGudang"
    />
  </div>
</template>

<style scoped>
.create-barcode-form-wrapper {
  --left-col-width: 380px;
}

/* ── Panel Kiri & Sections ── */
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.tabs-header-wrapper {
  display: flex;
  border-bottom: 2px solid #e2e8f0;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 4px 4px 0 0;
}

.tab-btn:hover {
  color: #1e3a8a;
  background: #f1f5f9;
}

.tab-btn.active {
  color: #1565c0;
  font-weight: 700;
  border-bottom-color: #1565c0;
  background: #eff6ff;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.form-divider {
  border-top: 1px dashed #cbd5e1;
}

.info-alert {
  display: flex;
  align-items: flex-start;
  background-color: #f0f7ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.4;
}

/* ── Form Controls Manksi Compact 24px ── */
.fr {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.lbl {
  width: 105px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.inp {
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  min-width: 0;
  box-sizing: border-box;
}

.inp:focus,
.idate:focus {
  border-color: #1565c0;
}

.idate {
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  min-width: 0;
  box-sizing: border-box;
}

.iselect {
  cursor: pointer;
}

.ro {
  background: #f5f5f5 !important;
  color: #555 !important;
}

.fw {
  font-weight: 700;
}

.tc {
  text-align: center;
}

.tr {
  text-align: right;
}

.flex-1 {
  flex: 1;
}

/* Hilangkan tombol spinner bawaan browser pada input number agar nilai tidak tertutup */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Dimensi Field Manksi Theme ── */
.dimen-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dimen-field {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
  height: 24px;
  overflow: hidden;
  box-sizing: border-box;
}

.dimen-field:focus-within {
  border-color: #1565c0;
  box-shadow: 0 0 0 1px #1565c0;
}

.dimen-tag {
  background: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
  padding: 0 6px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #cbd5e1;
  user-select: none;
  flex-shrink: 0;
}

.dimen-inp {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  height: 100% !important;
  padding: 0 4px !important;
  font-size: 11px !important;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  min-width: 0;
  background: transparent;
}

.dimen-unit {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  padding: 0 5px;
  user-select: none;
  flex-shrink: 0;
}

.dimen-cross {
  color: #94a3b8;
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
  line-height: 1;
}

/* ── Input Group Lookup Manksi ── */
.igrp {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
  height: 24px;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
}

.igrp .inp {
  border: none;
  border-radius: 0;
  flex: 1;
}

.blkp {
  background: #f0f0f0;
  border: none;
  border-left: 1px solid #ccc;
  height: 100%;
  padding: 0 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: background 0.15s;
}

.blkp:hover {
  background: #e0e0e0;
  color: #1565c0;
}

.bclr {
  background: #fff;
  border: none;
  height: 100%;
  padding: 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.bclr:hover {
  color: #d32f2f;
}

/* ── Panel & Tabel Antrean Kanan ── */
.queue-panel-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 6px 12px;
  border-radius: 6px 6px 0 0;
}

.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-tag {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.badge-new {
  background: #2e7d32;
  color: #fff;
  font-weight: 600;
}

.badge-labels {
  background: rgba(255, 255, 255, 0.35);
  color: #fff;
  font-weight: 600;
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #ccc;
  border-top: none;
  background: white;
  max-height: calc(100vh - 215px);
}

.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.gt th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
  border-right: 1px solid #e0e0e0;
  padding: 5px 6px;
  text-align: left;
  font-weight: 700;
  white-space: nowrap;
  color: #334155;
}

.gt td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  padding: 4px 6px;
  vertical-align: middle;
}

.gt tbody tr:hover {
  background-color: #f8fafc;
}

.qr-thumbnail {
  width: 26px;
  height: 26px;
  display: block;
  margin: 0 auto;
  border-radius: 2px;
}

.copies-inp {
  width: 36px;
  height: 20px;
  text-align: center;
  border: 1px solid #cbd5e1;
  border-radius: 2px;
  font-size: 11px;
  font-weight: bold;
  color: #1e293b;
  background: white;
  outline: none;
}

.copies-inp:focus {
  border-color: #1565c0;
}

.btn-del {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 2px;
}

.btn-del:hover {
  background: #fee2e2;
  color: #b71c1c;
}

/* ── Summary Footer Manksi ── */
.summary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #fafafa;
  border: 1px solid #ccc;
  border-top: none;
  border-radius: 0 0 6px 6px;
  font-size: 11px;
}

.empty-queue-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
