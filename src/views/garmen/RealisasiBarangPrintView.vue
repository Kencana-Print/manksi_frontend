<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { realisasiBarangFormService } from "@/services/garmen/realisasiBarangFormService";
import logoSrc from "@/assets/logo.png"; // Sesuaikan path logo Anda

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>({});
const details = ref<any[]>([]);
const isReady = ref(false);

const fetchData = async () => {
  try {
    const res = await realisasiBarangFormService.getPrint(nomor);
    header.value = res.data.data.header;
    details.value = res.data.data.details;
    isReady.value = true;

    // Auto print setelah DOM dirender
    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    alert("Gagal memuat data cetak.");
  }
};

const numFmt = (val: any) => {
  if (val === null || val === undefined || val === "") return "";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

onMounted(() => {
  document.title = `Print Realisasi - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-container" v-if="isReady">
    <!-- Loop 2 kali untuk rangkap atas dan bawah -->
    <div class="half-page" v-for="part in 2" :key="part">
      <!-- HEADER -->
      <div class="header-box">
        <div class="header-text">
          <div class="title">REALISASI PERMINTAAN {{ header.re_jenis }}</div>

          <div class="info-grid">
            <!-- Kolom Kiri -->
            <div class="info-col">
              <div class="info-row">
                <span class="lbl">No. Realisasi</span><span class="sep">:</span>
                <span class="val">{{ header.re_nomor }}</span>
              </div>
              <div class="info-row">
                <span class="lbl">Tanggal</span><span class="sep">:</span>
                <span class="val">{{ header.tgl_realisasi }}</span>
              </div>
              <div class="info-row">
                <span class="lbl">SPK</span><span class="sep">:</span>
                <span class="val"
                  >{{ header.re_spk_nomor }} {{ header.NamaSpk }}</span
                >
              </div>
            </div>

            <!-- Kolom Tengah -->
            <div class="info-col">
              <div class="info-row">
                <span class="lbl">Gudang Asal</span><span class="sep">:</span>
                <span class="val">{{ header.re_cab }}</span>
              </div>
              <div class="info-row">
                <span class="lbl">Gudang Tujuan</span><span class="sep">:</span>
                <span class="val">{{ header.GdgProduksi }}</span>
              </div>
            </div>

            <!-- Kolom Kanan -->
            <div class="info-col">
              <div class="info-row">
                <span class="lbl">No. Minta</span><span class="sep">:</span>
                <span class="val">{{ header.min_nomor }}</span>
              </div>
              <div class="info-row">
                <span class="lbl">Tanggal</span><span class="sep">:</span>
                <span class="val">{{ header.tgl_minta }}</span>
              </div>
              <div class="info-row">
                <span class="lbl">Peminta</span><span class="sep">:</span>
                <span class="val">{{ header.peminta }}</span>
              </div>
            </div>
          </div>

          <div class="info-row mt-2">
            <span class="lbl">Keterangan</span><span class="sep">:</span>
            <span class="val">{{ header.re_keterangan }}</span>
          </div>
        </div>
        <img :src="logoSrc" class="logo" />
      </div>

      <!-- TABEL BARANG (Hanya memunculkan data yang ada) -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 30px" class="text-center">No</th>
            <th style="width: 100px">Kode</th>
            <th>Nama</th>
            <th style="width: 60px" class="text-center">Satuan</th>
            <th style="width: 90px" class="text-right">Jumlah</th>
            <th style="width: 150px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <!-- Hapus paddedDetails, gunakan array details asli -->
          <tr v-for="(item, index) in details" :key="index">
            <td class="text-center">{{ index + 1 }}</td>
            <td class="font-mono">{{ item.Kode }}</td>
            <td class="text-truncate" style="max-width: 250px">
              {{ item.Nama }}
            </td>
            <td class="text-center">{{ item.Satuan }}</td>
            <td class="text-right">{{ numFmt(item.Jumlah) }}</td>
            <td>{{ item.Keterangan }}</td>
          </tr>
        </tbody>
      </table>

      <!-- SPACER: Mengisi ruang kosong agar TTD terdorong ke bawah kertas -->
      <div class="flex-grow-1"></div>

      <!-- TANDA TANGAN -->
      <div class="footer-box">
        <div class="ttd-box">
          <div class="ttd-title">Diserahkan Oleh</div>
          <div class="ttd-space"></div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Diterima,</div>
          <div class="ttd-space"></div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Checkers,</div>
          <div class="ttd-space"></div>
        </div>
        <div class="ttd-box border-none">
          <div class="ttd-title">Kepala Gudang,</div>
          <div class="ttd-space"></div>
        </div>
      </div>

      <!-- Garis Gunting (Hanya tampil di Part 1 pada layar) -->
      <div class="cut-line" v-if="part === 1"></div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 8mm 10mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cut-line {
    display: none !important;
  }
}

.print-container {
  width: 100%;
  max-width: 210mm; /* Lebar A4 */
  margin: 0 auto;
  background: white;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #000;
  display: flex;
  flex-direction: column;
  min-height: 297mm; /* Tinggi A4 */
}

.half-page {
  height: 50%;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  position: relative;
  page-break-inside: avoid;
}

/* --- HEADER STRUKTUR --- */
.header-box {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.header-text {
  flex: 1;
}
.title {
  font-size: 15px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.logo {
  width: 120px;
  object-fit: contain;
  margin-top: -5px;
}

/* Perbaikan Layout Header */
.info-grid {
  display: grid;
  grid-template-columns: 1.4fr 1.2fr 1fr; /* Proporsi disesuaikan */
  gap: 15px;
  font-size: 11px; /* Font sedikit dibesarkan agar mudah dibaca */
}
.info-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 3px;
}
.info-row .lbl {
  width: 90px; /* Lebar diperbesar agar "Gudang Tujuan" tidak terpotong */
  flex-shrink: 0;
  white-space: nowrap;
}
.info-row .sep {
  width: 10px;
  text-align: center;
  flex-shrink: 0;
}
.info-row .val {
  flex: 1;
  font-weight: normal;
}
.mt-2 {
  margin-top: 6px;
  font-size: 11px;
}

/* --- TABEL --- */
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 5px;
}
.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 5px 6px;
  vertical-align: middle;
}
.items-table th {
  text-align: left;
  font-weight: bold;
}
.items-table td {
  height: 20px;
}
.text-center {
  text-align: center !important;
}
.text-right {
  text-align: right !important;
}
.font-mono {
  font-family: monospace;
  font-size: 11.5px;
}

/* Flex-grow untuk mengisi ruang kosong antar Tabel & Footer Tanda Tangan */
.flex-grow-1 {
  flex-grow: 1;
}

/* --- TANDA TANGAN --- */
.footer-box {
  display: flex;
  width: 100%;
  border-top: 1px solid #000;
}
.ttd-box {
  flex: 1;
  border-right: 1px dashed #000;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.border-none {
  border-right: none !important;
}
.ttd-title {
  font-size: 11px;
  margin-top: 4px;
}
.ttd-space {
  height: 55px; /* Tinggi Ruang Tanda Tangan */
}

/* --- PEMBATAS KERTAS --- */
.cut-line {
  border-bottom: 1px dashed #ccc;
  margin: 15px 0;
  position: absolute;
  bottom: -15px;
  left: 0;
  width: 100%;
}
</style>
