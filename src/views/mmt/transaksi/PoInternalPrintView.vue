<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

import logoKP from "@/assets/kp.jpg";
import logoJA from "@/assets/ja.jpg";
import logoMD from "@/assets/md.jpg";

const props = defineProps<{
  nomor?: string | string[];
}>();

const route = useRoute();
const API_PO_PAPER = "mmt/po-paperprint";

/* =========================================================
 * NOMOR PO INTERNAL
 * ======================================================= */
const nomorPO = computed(() => {
  if (Array.isArray(props.nomor)) {
    return props.nomor.join("/");
  }

  return (
    props.nomor ||
    (route.params.nomor as string) ||
    (route.query.nomor as string) ||
    ""
  );
});

/* =========================================================
 * STATE & ORIENTASI
 * ======================================================= */
const header = ref<any>({});
const detail = ref<any[]>([]);
const isReady = ref(false);
const isLoading = ref(true);

// Default landscape agar selaras dengan layout cetak A5 ganda pada lembar A4
const printOrientation = ref<"portrait" | "landscape">("landscape");

/*
 * Maksimal detail per halaman A5
 */
const rowsPerPage = ref<number>(6);

/*
 * Copy dokumen cetak PO
 */
const copies = ref<{ label: string }[]>([{ label: "ASLI" }, { label: "COPY" }]);

/* =========================================================
 * INJEKSI STYLE PRINT (ROTASI 90 DERAJAT / LANDSCAPE)
 * ======================================================= */
const injectPrintStyle = () => {
  const oldStyle = document.getElementById("po-dynamic-print-style");
  if (oldStyle) oldStyle.remove();

  const isLandscape = printOrientation.value === "landscape";
  const pageSize = isLandscape ? "297mm 210mm" : "210mm 297mm";

  const styleEl = document.createElement("style");
  styleEl.id = "po-dynamic-print-style";
  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${pageSize};
        margin: 0 !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
};

/* =========================================================
 * LOGO
 * ======================================================= */
const currentLogo = computed(() => {
  const nama = (
    header.value?.perush_nama ||
    header.value?.perusahaan ||
    ""
  ).toLowerCase();

  const cabang = (
    header.value?.Cab ||
    header.value?.cabang ||
    ""
  ).toLowerCase();

  if (nama.includes("kencana") || cabang.includes("kp")) {
    return logoKP;
  }

  if (nama.includes("medisa") || cabang.includes("md")) {
    return logoMD;
  }

  return logoJA;
});

/* =========================================================
 * FORMAT TANGGAL
 * ======================================================= */
const fmtDate = (val: any) => {
  if (!val) return "-";

  if (typeof val === "string" && val.includes("/")) {
    return val;
  }

  const d = new Date(val);

  if (isNaN(d.getTime())) {
    return String(val);
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/* =========================================================
 * FORMAT ANGKA
 * ======================================================= */
const num = (val: any) => {
  if (val === undefined || val === null || val === "") {
    return 0;
  }

  return Number(val).toLocaleString("id-ID");
};

const formatCurrency = (val: any) => {
  if (val === undefined || val === null || val === "") {
    return "0,00";
  }
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* =========================================================
 * PAGINATION DETAIL
 * ======================================================= */
const paginatedDetails = computed(() => {
  if (!detail.value || detail.value.length === 0) {
    return [[]];
  }

  const pages: any[][] = [];

  for (let i = 0; i < detail.value.length; i += rowsPerPage.value) {
    pages.push(detail.value.slice(i, i + rowsPerPage.value));
  }

  return pages;
});

/* =========================================================
 * SEMUA HALAMAN CETAK
 * ======================================================= */
const printPages = computed(() => {
  const result: Array<{
    copyLabel: string;
    copyIndex: number;
    pageIndex: number;
    rows: any[];
  }> = [];

  copies.value.forEach((copy, copyIndex) => {
    paginatedDetails.value.forEach((rows, pageIndex) => {
      result.push({
        copyLabel: copy.label,
        copyIndex,
        pageIndex,
        rows,
      });
    });
  });

  return result;
});

/* =========================================================
 * A4 SHEETS
 * ======================================================= */
const a4Sheets = computed(() => {
  const sheets: any[][] = [];

  for (let i = 0; i < printPages.value.length; i += 2) {
    sheets.push(printPages.value.slice(i, i + 2));
  }

  return sheets;
});

/* =========================================================
 * GRAND TOTAL
 * ======================================================= */
const totalQty = computed(() => {
  return detail.value.reduce((acc, curr) => acc + Number(curr.Qty || 0), 0);
});

const grandTotal = computed(() => {
  return detail.value.reduce(
    (acc, curr) => acc + Number(curr.Qty || 0) * Number(curr.Harga || 0),
    0,
  );
});

/* =========================================================
 * PRINT & TRIGGER
 * ======================================================= */
const doPrint = () => {
  injectPrintStyle();
  nextTick(() => {
    window.print();
  });
};

/* =========================================================
 * CLOSE
 * ======================================================= */
const doClose = () => {
  window.close();
};

/* =========================================================
 * FETCH DATA
 * ======================================================= */
const fetchData = async () => {
  if (!nomorPO.value) {
    isLoading.value = false;
    return;
  }

  try {
    // 1. Ambil data Header PO
    const resHeader = await api.get(`${API_PO_PAPER}/`, {
      params: { edtspk: nomorPO.value },
    });
    const rawList = Array.isArray(resHeader.data)
      ? resHeader.data
      : resHeader.data.data || [];
    header.value = rawList.find((item: any) => item.Nomor === nomorPO.value) ||
      rawList[0] || { Nomor: nomorPO.value };

    // 2. Ambil data Detail PO sesuai route backend /detail (mengirim nomor sebagai parameter query)
    const resDetail = await api.get(`${API_PO_PAPER}/detail`, {
      params: { nomor: nomorPO.value }, // Sesuaikan jika parameter backend bernama 'nomor', 'no_po', atau 'edtspk'
    });

    detail.value = resDetail.data?.data ?? resDetail.data ?? [];

    isReady.value = true;

    await nextTick();
    injectPrintStyle();

    setTimeout(() => {
      window.print();
    }, 700);
  } catch (error) {
    console.error("Gagal memuat data cetak PO Internal", error);
  } finally {
    isLoading.value = false;
  }
};

/* =========================================================
 * LIFECYCLE
 * ======================================================= */
onMounted(() => {
  document.title = `PO Internal - ${nomorPO.value}`;
  fetchData();
});

onUnmounted(() => {
  const oldStyle = document.getElementById("po-dynamic-print-style");
  if (oldStyle) oldStyle.remove();
});
</script>

<template>
  <div class="print-root">
    <!-- LOADING -->
    <div v-if="isLoading" class="loading-screen">
      <span>Menyiapkan dokumen Purchase Order Internal...</span>
    </div>

    <template v-else-if="isReady">
      <!-- TOOLBAR -->
      <div class="no-print toolbar">
        <span class="toolbar-title">Cetak PO Internal — {{ nomorPO }}</span>

        <!-- Pilihan Orientasi -->
        <div class="orientation-selector">
          <span class="control-label">Orientasi:</span>
          <label :class="{ active: printOrientation === 'portrait' }">
            <input
              type="radio"
              value="portrait"
              v-model="printOrientation"
              @change="injectPrintStyle"
            />
            📄 Tegak (Portrait)
          </label>
          <label :class="{ active: printOrientation === 'landscape' }">
            <input
              type="radio"
              value="landscape"
              v-model="printOrientation"
              @change="injectPrintStyle"
            />
            📑 Rotate 90° (Landscape)
          </label>
        </div>

        <div class="toolbar-actions">
          <button class="tbtn" @click="doPrint">🖨️ Cetak Dokumen</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <!-- LOOP A4 -->
      <div
        v-for="(sheet, sheetIndex) in a4Sheets"
        :key="'sheet-' + sheetIndex"
        class="a4-sheet"
        :class="{ 'rotate-sheet': printOrientation === 'landscape' }"
      >
        <!-- SLOT A5 -->
        <div
          v-for="(item, slotIndex) in sheet"
          :key="'a5-' + sheetIndex + '-' + slotIndex"
          class="a5-page"
        >
          <!-- WATERMARK -->
          <div class="watermark">
            {{ item.copyLabel }}
          </div>

          <!-- CONTENT -->
          <div class="page-content">
            <!-- HEADER -->
            <div class="header-section">
              <div class="kop-left">
                <div class="kop-nama">
                  {{ header.perush_nama || "PT. Jaya Abadi Mulia" }}
                </div>
                <div class="kop-sub">
                  {{
                    header.perush_alamat ||
                    "Padokan RT 4 RW 4 Sawahan, Ngemplak"
                  }}
                </div>
                <div class="kop-sub">
                  {{ header.perush_telp || "0271-722998" }}
                </div>
              </div>

              <!-- LOGO -->
              <div class="kop-right logo-container">
                <img
                  :src="currentLogo"
                  alt="Logo Perusahaan"
                  class="logo-img"
                />
              </div>
            </div>

            <!-- JUDUL -->
            <div class="doc-title">PURCHASE ORDER INTERNAL</div>

            <!-- NOMOR / SUPPLIER -->
            <div class="title-row">
              <!-- LEFT -->
              <div class="meta-box">
                <table class="info-tbl">
                  <tr>
                    <td class="lbl">Nomor PO</td>
                    <td>: {{ header.Nomor || nomorPO }}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Tanggal</td>
                    <td>: {{ fmtDate(header.Tanggal) }}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Keterangan</td>
                    <td>: {{ header.Keterangan || "-" }}</td>
                  </tr>
                </table>
              </div>

              <!-- RIGHT -->
              <div class="cus-box">
                <table class="info-tbl">
                  <tr>
                    <td class="lbl" style="width: 75px">Supplier</td>
                    <td style="width: 10px">:</td>
                    <td>
                      <strong class="cus-nama">
                        {{ header.Supplier || header.Nama || "-" }}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Kode</td>
                    <td>:</td>
                    <td class="cus-alamat">
                      {{ header.KodeSup || "-" }}
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- DETAIL -->
            <table class="dtbl">
              <thead>
                <tr>
                  <th style="width: 28px; text-align: center">No</th>
                  <th style="width: 110px">No. SPK</th>
                  <th>Nama SPK</th>
                  <th style="width: 75px">Ukuran</th>
                  <th style="width: 85px">Bahan</th>
                  <th style="width: 48px; text-align: right">Qty</th>
                  <th style="width: 75px; text-align: right">Harga</th>
                  <th style="width: 85px; text-align: right">Subtotal</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(r, i) in item.rows" :key="i">
                  <td style="text-align: center">
                    {{ item.pageIndex * rowsPerPage + i + 1 }}
                  </td>
                  <td>{{ r.Spk || r.Nomor_SPK || "-" }}</td>
                  <td>{{ r.NamaSpk || r.Nama_SPK || "-" }}</td>
                  <td>{{ r.Ukuran || "-" }}</td>
                  <td>{{ r.Bahan || "-" }}</td>
                  <td style="text-align: right">{{ num(r.Qty) }}</td>
                  <td style="text-align: right">
                    {{ formatCurrency(r.Harga) }}
                  </td>
                  <td style="text-align: right; font-weight: bold">
                    {{
                      formatCurrency(Number(r.Qty || 0) * Number(r.Harga || 0))
                    }}
                  </td>
                </tr>

                <!-- Baris Kosong untuk Menjaga Layout -->
                <tr
                  v-for="emptyIndex in Math.max(
                    0,
                    rowsPerPage - item.rows.length,
                  )"
                  :key="'empty-' + emptyIndex"
                  class="empty-row"
                >
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER -->
          <div class="page-footer">
            <div class="foot-row">
              <div class="foot-note">
                Mohon PO ini ditandatangani dan dikembalikan setelah
                dikonfirmasi.
              </div>
              <div class="foot-page">
                Page: {{ item.pageIndex + 1 }} of {{ paginatedDetails.length }}
                <span class="ml-2 font-weight-bold"
                  >| Total: Rp {{ formatCurrency(grandTotal) }}</span
                >
              </div>
            </div>

            <!-- TANDA TANGAN -->
            <div class="ttd-row">
              <span>Dibuat Oleh,</span>
              <span>Disetujui Oleh,</span>
              <span>Hormat Kami,</span>
            </div>

            <div class="ttd-space"></div>

            <div class="ttd-row ttd-paren">
              <span>( ....................... )</span>
              <span>( ....................... )</span>
              <span>( ....................... )</span>
            </div>
          </div>
        </div>

        <!-- SLOT KOSONG A5 -->
        <div v-if="sheet.length === 1" class="a5-page a5-empty"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* =========================================================
   SCREEN
========================================================= */

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #555;
  font-family: Arial, Helvetica, sans-serif;
}

/* =========================================================
   TOOLBAR
========================================================= */

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #1565c0;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

.toolbar-title {
  font-weight: 700;
  font-size: 14px;
}

.orientation-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-weight: bold;
  font-size: 12px;
  color: #e2e8f0;
}

.orientation-selector label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.orientation-selector label.active {
  background: #2563eb;
  font-weight: bold;
}

.orientation-selector input {
  cursor: pointer;
}

.toolbar-actions {
  display: flex;
  align-items: center;
}

.tbtn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 8px;
}

.tbtn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.tbtn-grey {
  background: rgba(0, 0, 0, 0.25);
}

/* =========================================================
   ROOT
========================================================= */

.print-root {
  background: #e0e0e0;
  min-height: 100vh;
  padding-top: 50px;
  padding-bottom: 20px;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
}

/* =========================================================
   A4 SCREEN PREVIEW
========================================================= */

.a4-sheet {
  width: 210mm;
  height: 297mm;
  background: white;
  margin: 12px auto;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* =========================================================
   A5 PAGE (210mm x 148.5mm)
========================================================= */

.a5-page {
  width: 210mm;
  height: 148.5mm;
  box-sizing: border-box;
  background: white;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5mm 10mm 4mm 10mm;
  font-size: 8.5pt;
}

.a5-page:not(:last-child) {
  border-bottom: 0.4mm dashed #aaa;
}

.a5-empty {
  background: white;
}

.page-content {
  flex: 1;
  min-height: 0;
}

/* =========================================================
   WATERMARK
========================================================= */

.watermark {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  font-size: 65pt;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.04);
  letter-spacing: 0.15em;
  pointer-events: none;
  white-space: nowrap;
  z-index: 0;
}

/* =========================================================
   HEADER
========================================================= */

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.kop-left {
  font-size: 8.5pt;
  line-height: 1.25;
}

.kop-nama {
  font-size: 10pt;
  font-weight: 800;
}

.kop-sub {
  font-size: 8pt;
}

.logo-container {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.logo-img {
  max-height: 40px;
  max-width: 170px;
  object-fit: contain;
}

/* =========================================================
   TITLE
========================================================= */

.doc-title {
  font-size: 12pt;
  font-weight: 900;
  letter-spacing: 0.05em;
  margin-top: 4px;
  margin-bottom: 6px;
}

/* =========================================================
   INFO
========================================================= */

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.meta-box {
  width: 48%;
}

.cus-box {
  width: 48%;
}

.info-tbl {
  border-collapse: collapse;
  font-size: 8.5pt;
  width: 100%;
}

.info-tbl td {
  padding: 1px 0;
  vertical-align: top;
}

.info-tbl .lbl {
  width: 70px;
}

.cus-nama {
  font-size: 9pt;
  font-weight: 800;
}

.cus-alamat {
  white-space: pre-line;
  line-height: 1.2;
}

/* =========================================================
   DETAIL TABLE
========================================================= */

.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  margin-bottom: 6px;
  position: relative;
  z-index: 1;
  border: 1.5px solid #000;
}

.dtbl th {
  border: 1.5px solid #000;
  padding: 3px;
  font-weight: 800;
  text-align: left;
  background: transparent !important;
}

.dtbl td {
  border: 1.5px solid #000;
  padding: 2.5px 3px;
  vertical-align: middle;
}

.empty-row td {
  height: 16px;
}

/* =========================================================
   FOOTER & SIGNATURE
========================================================= */

.page-footer {
  flex-shrink: 0;
  margin-top: auto;
}

.foot-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 7.5pt;
  margin-bottom: 6px;
}

.foot-note {
  line-height: 1.2;
}

.foot-page {
  font-size: 8pt;
  font-weight: 700;
}

.ttd-row {
  display: flex;
  justify-content: space-between;
  font-size: 7.5pt;
}

.ttd-row span {
  flex: 1;
  text-align: center;
}

.ttd-space {
  height: 32px;
}

.ttd-paren {
  font-size: 7.5pt;
}

/* =========================================================
   PRINT MEDIA RULES
========================================================= */

@media print {
  .no-print {
    display: none !important;
  }

  html,
  body {
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-root {
    display: block !important;
    width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  .a4-sheet {
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    background: #ffffff !important;
    position: relative !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  /* ROTASI KHUSUS 90 DERAJAT SAAT PILIHAN ROTATE AKTIF */
  .a4-sheet.rotate-sheet {
    transform: rotate(90deg) translateY(-297mm) !important;
    transform-origin: top left !important;
    width: 210mm !important;
    height: 297mm !important;
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    page-break-after: always !important;
    break-after: page !important;
  }

  .a5-page {
    width: 210mm !important;
    height: 148.5mm !important;
    min-height: 148.5mm !important;
    max-height: 148.5mm !important;
    margin: 0 !important;
    padding: 5mm 10mm 4mm 10mm !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    background: #ffffff !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    page-break-after: auto !important;
    break-after: auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .a5-page:not(:last-child) {
    border-bottom: 0.25mm dashed #999 !important;
  }

  .a5-empty {
    border: none !important;
    background: #ffffff !important;
  }

  .dtbl,
  .header-section,
  .title-row,
  .page-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>
