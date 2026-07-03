<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { mutasiProduksiFormService } from "@/services/garmen/mutasiProduksiFormService";

const route = useRoute();
const nomor = route.query.nomor as string;

interface DetailRow {
  nama: string;
  jumlah: number;
  satuan: string;
  size: string;
}

interface PrintData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  namaSpk: string;
  gdgAsal: string;
  namaGdgAsal: string;
  gdgTujuan: string;
  namaGdgTujuan: string;
  jumlah: number;
  detail: DetailRow[];
}

const data = ref<PrintData | null>(null);
const isLoading = ref(true);

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
};

const num = (v: any, d = 3) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });

onMounted(async () => {
  try {
    const res = await mutasiProduksiFormService.getDataCetak(nomor);
    const d = res.data.data;
    data.value = {
      nomor: d.MPH_nomor,
      tanggal: fmtDate(d.mph_tanggal),
      keterangan: d.MPH_keterangan || "",
      namaSpk: d.spk_nama || "",
      gdgAsal: d.mph_gdgasal || "",
      namaGdgAsal: d.nama_gdg_asal || "",
      gdgTujuan: d.mph_gdgtujuan || "",
      namaGdgTujuan: d.nama_gdg_tujuan || "",
      jumlah: Number(d.MPH_jumlah) || 0,
      detail: (d.detail || []).map((r: any) => ({
        nama: r.MPD_NAMA || r.mpd_nama || "",
        jumlah: Number(r.MPD_jumlah) || 0,
        satuan: r.MPD_satuan || "",
        size: r.mpd_size || "",
      })),
    };
    setTimeout(() => window.print(), 600);
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data cetak...</div>
  <div v-else-if="!data" class="loading">Data tidak ditemukan.</div>

  <div v-else class="page-wrap">
    <!-- 2 copy vertikal, dipisah garis putus -->
    <div
      v-for="copy in 2"
      :key="copy"
      class="copy"
      :class="{ 'copy-separator': copy === 1 }"
    >
      <div class="doc-title">M U T A S I &nbsp; P R O D U K S I</div>

      <!-- Info Header: 2 kolom -->
      <div class="info-grid">
        <table class="info-tbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td class="sep">:</td>
            <td class="val">{{ data.nomor }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td class="sep">:</td>
            <td class="val">{{ data.tanggal }}</td>
          </tr>
          <tr>
            <td class="lbl">Keterangan</td>
            <td class="sep">:</td>
            <td class="val">{{ data.keterangan }}</td>
          </tr>
          <tr>
            <td class="lbl">Product</td>
            <td class="sep">:</td>
            <td class="val">{{ data.namaSpk }}</td>
          </tr>
        </table>
        <table class="info-tbl">
          <tr>
            <td class="lbl">Gudang Asal</td>
            <td class="sep">:</td>
            <td class="val">{{ data.gdgAsal }}.{{ data.namaGdgAsal }}</td>
          </tr>
          <tr>
            <td class="lbl">Gudang Tujuan</td>
            <td class="sep">:</td>
            <td class="val">{{ data.gdgTujuan }}.{{ data.namaGdgTujuan }}</td>
          </tr>
          <tr>
            <td class="lbl">Jumlah</td>
            <td class="sep">:</td>
            <td class="val">{{ num(data.jumlah) }}</td>
          </tr>
        </table>
      </div>

      <div class="section-label">Bahan yang disertakan :</div>

      <table class="dtl-tbl">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-nama">Nama</th>
            <th class="col-qty">Qty</th>
            <th class="col-sat">Satuan</th>
            <th class="col-size">Size</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in data.detail" :key="i">
            <td class="col-no">{{ i + 1 }} .</td>
            <td class="col-nama">{{ row.nama }}</td>
            <td class="col-qty">{{ num(row.jumlah) }}</td>
            <td class="col-sat">{{ row.satuan }}</td>
            <td class="col-size">{{ row.size }}</td>
          </tr>
        </tbody>
      </table>

      <!-- TTD -->
      <div class="footer">
        <div class="ttd-col">
          <div class="ttd-lbl">Dibuat oleh,</div>
          <div class="ttd-space"></div>
          <div class="ttd-line">
            (
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            )
          </div>
        </div>
        <div class="ttd-col">
          <div class="ttd-lbl">Mengetahui</div>
          <div class="ttd-space"></div>
          <div class="ttd-line">
            (
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            )
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  font-size: 8.5pt;
  background: #ccc;
  color: #000;
}

.loading {
  padding: 20px;
  font-family: Arial;
  font-size: 12pt;
  background: white;
}

.page-wrap {
  width: 210mm;
  margin: 0 auto;
  background: white;
}

.copy {
  width: 100%;
  padding: 10mm 12mm 6mm 12mm;
}

/* Garis pemisah antar copy — putus-putus */
.copy-separator {
  border-bottom: 1pt dashed #888;
  padding-bottom: 8mm;
  margin-bottom: 0;
}

.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 10pt;
  letter-spacing: 2px;
  margin-bottom: 5mm;
}

/* 2 kolom info */
.info-grid {
  display: flex;
  gap: 6mm;
  margin-bottom: 4mm;
}

.info-tbl {
  flex: 1;
  border-collapse: collapse;
  font-size: 8.5pt;
}

.info-tbl td {
  padding: 0.7pt 2pt;
  vertical-align: top;
}

.info-tbl .lbl {
  white-space: nowrap;
  width: 62pt;
}

.info-tbl .sep {
  width: 8pt;
  padding: 0.7pt 3pt;
}

.section-label {
  font-size: 8.5pt;
  font-weight: bold;
  margin-bottom: 2mm;
}

/* Tabel detail */
.dtl-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}

.dtl-tbl thead tr {
  border-top: 0.5pt solid #000;
  border-bottom: 0.5pt solid #000;
}

.dtl-tbl th {
  padding: 1.5pt 4pt;
  font-weight: bold;
  text-align: left;
}

.dtl-tbl td {
  padding: 1.2pt 4pt;
  border-bottom: 0.3pt solid #ddd;
  vertical-align: middle;
}

.dtl-tbl tbody tr:last-child td {
  border-bottom: 0.5pt solid #000;
}

.col-no {
  width: 18pt;
}
.col-qty {
  width: 40pt;
  text-align: center;
}
.col-sat {
  width: 32pt;
  text-align: center;
}
.col-size {
  width: 32pt;
  text-align: center;
}

/* Footer TTD */
.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 5mm;
  padding: 0 10mm;
}
.ttd-col {
  font-size: 8.5pt;
  text-align: center;
  min-width: 80pt;
}
.ttd-lbl {
  margin-bottom: 1mm;
}

.ttd-space {
  height: 12mm;
}

.ttd-line {
  font-size: 8pt;
}

/* PRINT */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  body {
    background: white;
  }

  .page-wrap {
    width: 100%;
  }

  .copy-separator {
    border-bottom: 0.5pt dashed #888;
  }
}
</style>
