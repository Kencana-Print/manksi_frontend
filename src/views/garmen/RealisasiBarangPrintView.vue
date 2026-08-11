<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { realisasiBarangFormService } from "@/services/garmen/realisasiBarangFormService";
import logoSrc from "@/assets/logo.png";

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
    <!-- Copy 1 -->
    <div class="copy-block">
      <div class="header-box">
        <div class="header-text">
          <div class="title">REALISASI PERMINTAAN {{ header.re_jenis }}</div>
          <div class="info-grid">
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
    </div>

    <!-- Garis potong -->
    <div class="cut-line">
      <span class="cut-icon">✂</span>
      <span class="cut-text"
        >- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        - - - - - - - - - - - - - - - - - - - - - - - -</span
      >
    </div>

    <!-- Copy 2 -->
    <div class="copy-block">
      <div class="header-box">
        <div class="header-text">
          <div class="title">REALISASI PERMINTAAN {{ header.re_jenis }}</div>
          <div class="info-grid">
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
}

.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  background: white;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #000;
}

.copy-block {
  height: 132mm;
  display: block;
  overflow: hidden;
  page-break-inside: avoid;
}

.cut-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 2px 0;
  color: #555;
  font-size: 10px;
}
.cut-icon {
  transform: rotate(90deg);
  font-size: 11px;
}
.cut-text {
  letter-spacing: 1px;
  overflow: hidden;
  white-space: nowrap;
}
@media print {
  .cut-line {
    color: #000;
  }
}

.header-box {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.header-text {
  flex: 1;
}
.title {
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.logo {
  width: 100px;
  object-fit: contain;
  margin-top: -5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1.4fr 1.2fr 1fr;
  gap: 15px;
  font-size: 10.5px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 2px;
}
.info-row .lbl {
  width: 85px;
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
  margin-top: 5px;
  font-size: 10.5px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
  margin-bottom: 4px;
}
.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 3px 6px;
  vertical-align: middle;
}
.items-table th {
  text-align: left;
  font-weight: bold;
}
.items-table td {
  height: 16px;
}
.text-center {
  text-align: center !important;
}
.text-right {
  text-align: right !important;
}
.font-mono {
  font-family: monospace;
  font-size: 11px;
}

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
  font-size: 10px;
  margin-top: 3px;
}
.ttd-space {
  height: 32px;
}
</style>
