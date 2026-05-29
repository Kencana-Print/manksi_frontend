<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { mppbFormService } from "@/services/penjualan/mppbFormService";
import logoImg from "@/assets/logo.png"; // Mengambil logo dari folder assets
import api from "@/services/api";

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>({});
const isReady = ref(false);

const desainError = ref<Record<number, boolean>>({});

const fetchData = async () => {
  try {
    const res = await mppbFormService.getDetail(nomor);
    header.value = res.data.data;
    isReady.value = true;

    // Auto print setelah dirender
    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    alert("Gagal memuat data cetak MPPB.");
  }
};

const formatTgl = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  const m = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${m[d.getMonth()]} ${d.getFullYear()}`;
};

const VPS_BASE = "http://103.94.238.252:8888/file-gambar";

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

const getDesainUrl = (nomor: string) => {
  if (!nomor) return "";
  return `${getBaseUrl()}/images/mppb/${encodeURIComponent(nomor)}.jpg`;
};

const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  return `${getBaseUrl()}/images/ttd/${encodeURIComponent(kodeUser.trim().toUpperCase())}.jpg`;
};

// Fallback lokal → VPS → sembunyikan
const onDesainError = (e: Event, nomor: string) => {
  const el = e.target as HTMLImageElement;
  if (!el.src.includes("8888")) {
    el.src = `${VPS_BASE}/${encodeURIComponent(nomor)}.jpg`;
  } else {
    el.style.display = "none";
  }
};

const onTtdError = (e: Event, kodeUser: string) => {
  const el = e.target as HTMLImageElement;
  if (!el.src.includes("8888")) {
    el.src = `${VPS_BASE}/${encodeURIComponent(kodeUser.trim().toUpperCase())}.jpg`;
  } else {
    el.style.opacity = "0";
  }
};

onMounted(() => {
  document.title = `Cetak MPPB - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-container" v-if="isReady">
    <div class="half-page" v-for="i in 2" :key="i">
      <div class="kop-box">
        <div class="kop-logo">
          <img :src="logoImg" alt="Logo Kencana Print" class="logo-img" />
        </div>
        <div class="kop-title">
          BERITA ACARA<br />
          PERMINTAAN BELI BAHAN<br />
          {{ header.mpb_nomor }}
        </div>
        <div class="kop-right"></div>
      </div>

      <div class="content-box">
        <div class="content-left">
          <div class="mb-3">Mohon dibelikan bahan untuk :</div>
          <table class="rincian-table">
            <tr>
              <td class="lbl">Nama Produk</td>
              <td class="sep">:</td>
              <td class="val">{{ header.mpb_nama }}</td>
            </tr>
            <tr>
              <td class="lbl">Bahan</td>
              <td class="sep">:</td>
              <td class="val">{{ header.mpb_bahan }}</td>
            </tr>
            <tr>
              <td class="lbl">Gramasi</td>
              <td class="sep">:</td>
              <td class="val">{{ header.mpb_gramasi }}</td>
            </tr>
            <tr>
              <td class="lbl">Qty</td>
              <td class="sep">:</td>
              <td class="val">{{ header.mpb_jmlorder }}</td>
            </tr>
            <tr>
              <td class="lbl">Ukuran</td>
              <td class="sep">:</td>
              <td class="val">{{ header.mpb_ukuran }}</td>
            </tr>
          </table>
        </div>
        <div class="content-right">
          <div class="fw-bold mb-1">DESAIN :</div>
          <div class="img-wrap">
            <img
              :src="getDesainUrl(header.mpb_nomor)"
              @error="onDesainError($event, header.mpb_nomor)"
              class="desain-img"
            />
          </div>
        </div>
      </div>

      <div class="date-row">Boyolali, {{ formatTgl(header.mpb_tanggal) }}</div>

      <table class="sig-table">
        <tr>
          <td style="text-align: left">Dibuat oleh,</td>
          <td colspan="2" style="text-align: center">Mengetahui,</td>
          <td style="text-align: center">Disetujui oleh,</td>
        </tr>
        <tr>
          <td
            class="sig-space"
            style="vertical-align: bottom; text-align: left; position: relative"
          >
            <img
              :src="getSignatureUrl(header.user_create)"
              @error="onTtdError($event, header.user_create)"
              class="sig-img"
            />
          </td>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
        </tr>
        <tr>
          <td style="text-align: center">
            ( <span class="u-name">{{ header.user_create }}</span> )<br />
            MO
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )<br />
            CMO
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )<br />
            Manager marketing
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )<br />
            Direktur
          </td>
        </tr>
      </table>

      <div class="note-section">
        <div class="note-lbl">Note :</div>
        <div class="note-val">{{ header.mpb_ket || "-" }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 10mm 15mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #000;
  background: white;
  padding: 10px;
}

.half-page {
  height: 48%; /* Mengambil hampir setengah halaman per form */
  margin-bottom: 25px;
}

/* KOP */
.kop-box {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  padding: 10px;
}
.kop-logo {
  width: 120px;
}
.logo-img {
  max-width: 100px;
  max-height: 40px;
  object-fit: contain;
}
.kop-title {
  flex: 1;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
  line-height: 1.4;
}
.kop-right {
  width: 120px; /* Spacer agar title persis di tengah */
}

/* KONTEN */
.content-box {
  border: 1px solid #000;
  border-top: none;
  display: flex;
  padding: 10px;
}
.content-left {
  flex: 1;
}
.rincian-table {
  width: 100%;
  border-collapse: collapse;
}
.rincian-table td {
  padding: 2px 0;
  vertical-align: top;
}
.rincian-table .lbl {
  width: 100px;
}
.rincian-table .sep {
  width: 15px;
  text-align: center;
}
.content-right {
  width: 220px;
  padding-left: 15px;
}
.img-wrap {
  width: 100%;
  height: 90px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}
.desain-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.fw-bold {
  font-weight: bold;
}
.mb-1 {
  margin-bottom: 5px;
}
.mb-3 {
  margin-bottom: 15px;
}

/* TANGGAL & TANDA TANGAN */
.date-row {
  text-align: right;
  margin-top: 5px;
  margin-bottom: 5px;
}
.sig-table {
  width: 100%;
  border-collapse: collapse;
}
.sig-table td {
  vertical-align: bottom;
  width: 25%;
}
.sig-space {
  height: 60px;
  position: relative;
}
.sig-img {
  height: 55px;
  max-width: 100px;
  object-fit: contain;
  display: block;
  margin: 4px auto;
}
.u-name {
  display: inline-block;
  min-width: 60px;
  text-decoration: underline;
  text-transform: uppercase;
}

/* NOTE */
.note-section {
  display: flex;
  margin-top: 15px;
  font-size: 11px;
}
.note-lbl {
  width: 45px;
}
.note-val {
  flex: 1;
  white-space: pre-wrap; /* Mempertahankan format baris baru (enter) dari input pengguna */
  line-height: 1.3;
}
</style>
