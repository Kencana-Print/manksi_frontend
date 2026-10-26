<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import {
  getPrintData,
  pesanError,
} from "@/services/spanduk/bastMapSpandukFormService";
import type {
  BastMapPrintData,
  BastMapPrintHeader,
} from "@/services/spanduk/bastMapSpandukFormService";

// Teks footer (belum dikonfirmasi; ubah di sini bila perlu)
const LEMBAR_1 = "Arsip Spanduk";
const LEMBAR_2 = "Marketing Officer";
const TTD_1 = "PIC Proofing";
const TTD_2 = "Manager Spanduk";
const KOTA = "";

const route = useRoute();
const nomorMap = String(route.params.nomor ?? "");

const printData = ref<BastMapPrintData | null>(null);
const isLoading = ref(true);
const pesanGalat = ref("");
const finalImageUrl = ref("");

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

const gambarBisaDimuat = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

// Pola sama dengan garmen: folder cabang dulu, lalu fallback file-gambar
const cariGambar = async (h: BastMapPrintHeader) => {
  const cab = (h.mspk_cab ?? "").trim() || "HO-";
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? "";
  const nomor = encodeURIComponent(h.mspk_nomor);
  const primary = `${base}/images/${cab}/map/${nomor}.jpg`;
  const fallback = `/file-gambar/${nomor}.jpg`;
  if (await gambarBisaDimuat(primary)) return primary;
  if (await gambarBisaDimuat(fallback)) return fallback;
  return "";
};

onMounted(async () => {
  try {
    const data = await getPrintData(nomorMap);
    printData.value = data;
    finalImageUrl.value = await cariGambar(data.header);
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
    <div class="print-wrapper">
      <div v-for="copy in 2" :key="copy" class="print-column">
        <div class="header-title">BERITA ACARA SERAH TERIMA MAP</div>
        <table class="w-100 info-table">
          <tr>
            <td width="22%">Nomor Memo</td>
            <td width="2%">:</td>
            <td>{{ printData.header.mspk_nomor }}</td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>{{ fmtTanggal(printData.header.mspk_tanggal) }}</td>
          </tr>
          <tr>
            <td>Nama Desain</td>
            <td>:</td>
            <td>{{ printData.header.mspk_nama }}</td>
          </tr>
          <tr>
            <td>Ukuran</td>
            <td>:</td>
            <td>{{ printData.header.mspk_ukuran }}</td>
          </tr>
          <tr>
            <td>Kain</td>
            <td>:</td>
            <td>{{ printData.header.mspk_kain }}</td>
          </tr>
          <tr>
            <td>Finishing</td>
            <td>:</td>
            <td>{{ printData.header.mspk_finishing }}</td>
          </tr>
          <tr>
            <td class="align-top">Catatan</td>
            <td class="align-top">:</td>
            <td style="white-space: pre-wrap">
              {{ printData.header.mspk_keterangan }}
            </td>
          </tr>
          <tr>
            <td class="align-top">Keterangan</td>
            <td class="align-top">:</td>
            <td style="white-space: pre-wrap">
              {{ printData.header.mspk_kendala || "-" }}
            </td>
          </tr>
        </table>

        <div
          class="d-flex justify-space-between mt-2 font-weight-bold"
          style="font-size: 11px"
        >
          <div>Jumlah : {{ printData.header.mspk_jumlah_jadi ?? 0 }}</div>
          <div>{{ printData.header.mspk_tipe }}</div>
        </div>

        <table class="detail-table mt-1 w-100">
          <thead>
            <tr>
              <th width="8%">No</th>
              <th width="35%">Kesesuaian</th>
              <th width="10%">Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in printData.details" :key="d.no">
              <td class="text-center">{{ i + 1 }}</td>
              <td>{{ d.kesesuaian }}</td>
              <td
                class="text-center font-weight-bold"
                :class="{ 'status-n': d.status === 'N' }"
              >
                {{ d.status }}
              </td>
              <td>{{ d.keterangan }}</td>
            </tr>
          </tbody>
        </table>

        <div class="image-box mt-2">
          <img v-if="finalImageUrl" :src="finalImageUrl" class="map-image" />
          <span
            v-else
            class="text-grey"
            style="font-size: 10px; font-style: italic"
          >
            (Tidak ada gambar desain)
          </span>
        </div>

        <div class="footer-section mt-4 d-flex justify-space-between align-end">
          <div class="lembar-text">
            Lembar 1 : {{ LEMBAR_1 }}<br />
            Lembar 2 : {{ LEMBAR_2 }}
          </div>
          <div class="ttd-box">
            <div class="text-center mb-1">
              {{ KOTA ? `${KOTA}, ` : "" }}{{ hariIni() }}
            </div>
            <table class="w-100 ttd-table">
              <tr>
                <th width="50%">{{ TTD_1 }}</th>
                <th width="50%">{{ TTD_2 }}</th>
              </tr>
              <tr>
                <td class="ttd-space"></td>
                <td class="ttd-space"></td>
              </tr>
            </table>
          </div>
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
    size: A4 landscape;
    margin: 5mm;
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
  .print-wrapper {
    width: 100% !important;
    height: 195mm !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }
  .print-column {
    height: 100%;
    overflow: hidden;
  }
}

.print-wrapper {
  width: 297mm;
  height: 210mm;
  margin: 0 auto;
  padding: 8mm;
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  font-family: "Arial", sans-serif;
  color: #000;
  box-sizing: border-box;
  overflow: hidden;
}

.print-column {
  width: 48%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-title {
  border: 1px solid #000;
  padding: 4px;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 4px;
  text-align: center;
}

.info-table {
  font-size: 10px;
  line-height: 1.25;
}
.info-table td {
  padding: 1px 0;
}
.align-top {
  vertical-align: top;
}

.detail-table {
  border-collapse: collapse;
  font-size: 10px;
  flex-shrink: 0;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 2px 4px;
}
.detail-table th {
  font-weight: bold;
}
.status-n {
  background: #d9d9d9;
}

.image-box {
  border: 1px solid #000;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin-top: 6px;
}

.map-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.footer-section {
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 8px;
}
.lembar-text {
  line-height: 1.3;
}

.ttd-box {
  width: 210px;
}
.ttd-table {
  border-collapse: collapse;
}
.ttd-table th,
.ttd-table td {
  border: 1px solid #000;
  text-align: center;
  font-weight: normal;
}
.ttd-space {
  height: 45px;
}
.w-100 {
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-4 {
  margin-top: 12px;
}
.mb-1 {
  margin-bottom: 4px;
}
</style>
