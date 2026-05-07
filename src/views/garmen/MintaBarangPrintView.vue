<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { mppbFormService } from "@/services/penjualan/mppbFormService";
import logoImg from "@/assets/logo.png";

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

const fetchData = async () => {
  try {
    const res = await mppbFormService.getDetail(nomor);
    header.value = res.data.data;

    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    console.error(error);
    isError.value = true;
  } finally {
    isLoading.value = false;
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

// Menyembunyikan icon broken image jika TTD tidak ditemukan di VPS
const hideImg = (e: Event) => {
  (e.target as HTMLImageElement).style.display = "none";
};

// Ambil TTD berdasarkan nama pembuat (MO) sesuai format DB
const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  const cleanName = kodeUser.trim();
  return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(cleanName)}.jpg`;
};

const getDesainUrl = (nomorMpb: string) => {
  if (!nomorMpb) return "";
  return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(nomorMpb)}.jpg`;
};

onMounted(() => {
  document.title = `Cetak MPPB - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div v-if="isLoading" class="pa-4 text-center">Memuat dokumen cetak...</div>
  <div v-else-if="isError" class="pa-4 text-center text-red">
    Gagal memuat data cetak. Pastikan nomor MPPB benar.
  </div>

  <div v-else class="print-container">
    <div v-for="copy in 2" :key="copy" class="print-block">
      <div class="kop-box">
        <div class="kop-logo">
          <img
            :src="logoImg"
            alt="Kencana Print"
            class="logo-img"
            @error="hideImg"
          />
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
          <div class="mb-3" style="font-size: 11px">
            Mohon dibelikan bahan untuk :
          </div>
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
              @error="hideImg"
              class="desain-img"
            />
          </div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="date-row">Boyolali, {{ formatTgl(header.mpb_tanggal) }}</div>

      <table class="sig-table">
        <tr>
          <td style="width: 25%; text-align: left">Dibuat oleh,</td>
          <td style="width: 50%; text-align: center" colspan="2">
            Mengetahui,
          </td>
          <td style="width: 25%; text-align: center">Disetujui oleh,</td>
        </tr>
        <tr>
          <td class="sig-space" style="vertical-align: bottom">
            <img
              :src="getSignatureUrl(header.user_create)"
              class="sig-img"
              @error="hideImg"
            />
          </td>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
        </tr>
        <tr>
          <td style="text-align: left; padding-left: 5px">
            ( <span class="u-name">{{ header.user_create }}</span> )<br />
            <div style="margin-left: 15px">MO</div>
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )<br />
            CMO
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )<br />
            Manager marketing
          </td>
          <td style="text-align: center">
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
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
    margin: 10mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.pa-4 {
  padding: 1rem;
}
.text-center {
  text-align: center;
}
.text-red {
  color: red;
}

.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #000;
  background: white;
}

.print-block {
  height: 140mm;
  padding: 10mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.print-block:first-child {
  border-bottom: 1px dashed #000;
}

/* KOP */
.kop-box {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  padding: 8px 10px;
}
.kop-logo {
  width: 130px;
}
.logo-img {
  max-width: 110px;
  max-height: 40px;
  object-fit: contain;
}
.kop-title {
  flex: 1;
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  line-height: 1.4;
}
.kop-right {
  width: 130px;
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
  padding: 3px 0;
  vertical-align: top;
  font-size: 11px;
}
.rincian-table .lbl {
  width: 90px;
}
.rincian-table .sep {
  width: 15px;
  text-align: center;
}

/* AREA DESAIN KANAN */
.content-right {
  width: 200px;
  padding-left: 15px;
  border-left: 1px dashed #eee;
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
.spacer {
  flex-grow: 1;
}

/* TANGGAL & TANDA TANGAN */
.date-row {
  text-align: right;
  margin-top: 5px;
  margin-bottom: 10px;
}
.sig-table {
  width: 100%;
  border-collapse: collapse;
}
.sig-table td {
  vertical-align: bottom;
}
.sig-space {
  height: 50px;
}

/* KUNCI PERBAIKAN TTD: z-index positif & margin disesuaikan agar menimpa teks dengan natural */
.sig-img {
  max-height: 55px;
  max-width: 90px;
  object-fit: contain;
  display: block;
  margin-bottom: 2px;
}
.u-name {
  display: inline-block;
  min-width: 60px;
  text-decoration: underline;
  text-transform: uppercase;
}

/* NOTE (KETERANGAN MULTILINE) */
.note-section {
  display: flex;
  margin-top: 25px;
  font-size: 11px;
}
.note-lbl {
  width: 45px;
}
.note-val {
  flex: 1;
  white-space: pre-wrap;
  line-height: 1.3;
}
</style>
