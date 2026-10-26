<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  getPrintData,
  pesanError,
} from "@/services/spanduk/mutasiMarketingSpandukFormService";
import type {
  MutasiMarketingPrintData,
  MutasiMarketingPrintRow,
} from "@/services/spanduk/mutasiMarketingSpandukFormService";

// Teks cetak (belum dikonfirmasi; ubah di sini bila perlu)
const JUDUL = "SERAH TERIMA SAMPEL KE MARKETING";
const LABEL_SERAH = "Menyerahkan";
const LABEL_MO = "Penerima (MO)";
const LABEL_CMO = "Mengetahui CMO";

const route = useRoute();
const nomorDok = String(route.params.nomor ?? "");

const printData = ref<MutasiMarketingPrintData | null>(null);
const isLoading = ref(true);
const pesanGalat = ref("");

const fmtTanggal = (v: string | null | undefined) => {
  const [y, m, d] = String(v ?? "")
    .slice(0, 10)
    .split("-");
  return y && m && d ? `${d}-${m}-${y}` : "";
};

const hariIni = () => {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(n.getDate())}-${p(n.getMonth() + 1)}-${n.getFullYear()}`;
};

const fmtQty = (v: number) =>
  Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

interface Kelompok {
  mo: string;
  rows: MutasiMarketingPrintRow[];
  total: number;
}

// Satu tabel per MO, urutan mengikuti kemunculan pertama di dokumen
const kelompok = computed<Kelompok[]>(() => {
  const peta = new Map<string, Kelompok>();
  for (const r of printData.value?.maps ?? []) {
    let k = peta.get(r.mo);
    if (!k) {
      k = { mo: r.mo, rows: [], total: 0 };
      peta.set(r.mo, k);
    }
    k.rows.push(r);
    k.total += r.qty;
  }
  return [...peta.values()];
});

const totalQty = computed(() =>
  (printData.value?.maps ?? []).reduce((s, r) => s + r.qty, 0),
);

onMounted(async () => {
  try {
    printData.value = await getPrintData(nomorDok);
    isLoading.value = false;
    // Beri waktu Vue merender DOM sebelum dialog cetak muncul
    setTimeout(() => window.print(), 300);
  } catch (e) {
    pesanGalat.value = pesanError(e, "Gagal memuat data cetak.");
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="print-state">Memuat data cetak...</div>
  <div v-else-if="!printData" class="print-state">{{ pesanGalat }}</div>

  <div v-else class="print-container">
    <div class="print-page">
      <div v-for="copy in 2" :key="copy" class="copy">
        <div class="header-title">{{ JUDUL }}</div>

        <table class="info-table">
          <tr>
            <td width="18%">Nomor</td>
            <td width="2%">:</td>
            <td>{{ printData.header.nomor }}</td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>{{ fmtTanggal(printData.header.tanggal) }}</td>
          </tr>
          <tr>
            <td>Lokasi</td>
            <td>:</td>
            <td>{{ printData.header.cab }}</td>
          </tr>
          <tr v-if="printData.header.keterangan">
            <td class="align-top">Keterangan</td>
            <td class="align-top">:</td>
            <td style="white-space: pre-wrap">
              {{ printData.header.keterangan }}
            </td>
          </tr>
        </table>

        <div v-for="k in kelompok" :key="k.mo" class="mo-block">
          <div class="mo-title">MO : {{ k.mo }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="6%">No</th>
                <th width="22%">Nomor MAP</th>
                <th>Nama Pekerjaan</th>
                <th width="18%">Ukuran</th>
                <th width="10%">Tipe</th>
                <th width="9%">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in k.rows" :key="r.nomor">
                <td class="text-center">{{ i + 1 }}</td>
                <td>{{ r.nomor }}</td>
                <td>{{ r.nama }}</td>
                <td>{{ r.ukuran }}</td>
                <td class="text-center">{{ r.tipe }}</td>
                <td class="text-right">{{ fmtQty(r.qty) }}</td>
              </tr>
            </tbody>
          </table>

          <table class="ttd-table">
            <thead>
              <tr>
                <th width="33.3%">{{ LABEL_SERAH }}</th>
                <th width="33.3%">{{ LABEL_MO }}</th>
                <th width="33.3%">{{ LABEL_CMO }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="ttd-space"></td>
                <td class="ttd-space"></td>
                <td class="ttd-space"></td>
              </tr>
              <tr>
                <td class="ttd-name">( {{ printData.header.pembuat }} )</td>
                <td class="ttd-name">( {{ k.mo }} )</td>
                <td class="ttd-name">( ......................... )</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="doc-foot">
          <div>
            Total keseluruhan : <b>{{ fmtQty(totalQty) }}</b> ({{
              printData.maps.length
            }}
            MAP)
          </div>
          <div>Dicetak : {{ hariIni() }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-state {
  padding: 40px;
  text-align: center;
  font-family: "Arial", sans-serif;
  font-size: 13px;
  color: #555;
}

.print-container {
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background-color: #525659;
  padding: 20px 0;
  box-sizing: border-box;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
  }
  .print-container {
    width: auto;
    height: auto;
    overflow: visible;
    background-color: transparent;
    padding: 0;
  }
  .print-page {
    width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 1mm !important;
    box-shadow: none !important;
  }
}

.print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm;
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  font-family: "Arial", sans-serif;
  color: #000;
  box-sizing: border-box;
}

.header-title {
  border: 1px solid #000;
  padding: 5px;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  text-align: center;
}

.info-table {
  width: 100%;
  font-size: 11px;
  line-height: 1.35;
  margin-bottom: 10px;
}
.info-table td {
  padding: 1px 0;
}
.align-top {
  vertical-align: top;
}

.mo-block {
  margin-bottom: 14px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.mo-title {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 3px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 3px 5px;
}
.detail-table th {
  font-weight: bold;
  text-align: center;
}

.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

.ttd-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 10.5px;
}
.ttd-table th,
.ttd-table td {
  border: none;
  text-align: center;
}
.ttd-table th {
  font-weight: bold;
  padding: 3px 4px;
}
.ttd-table .ttd-space {
  height: 34px;
}
.ttd-table .ttd-name {
  padding: 3px 4px;
  font-weight: bold;
}

.doc-foot {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 11px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.ttd-cmo {
  width: 200px;
  font-size: 10.5px;
}

.copy {
  min-height: 133mm;
  box-sizing: border-box;
}
.copy + .copy {
  border-top: 1px dashed #000;
  margin-top: 4mm;
  padding-top: 4mm;
}
</style>
