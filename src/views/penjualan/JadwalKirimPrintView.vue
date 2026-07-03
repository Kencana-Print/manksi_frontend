<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { jadwalKirimService } from "@/services/penjualan/jadwalKirimService";

const route = useRoute();
const isLoading = ref(true);
const rows = ref<any[]>([]);

const tglAwal = route.query.tglAwal as string;
const tglAkhir = route.query.tglAkhir as string;
const gudang = (route.query.gudang as string) || "";

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtDateShort = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const months = [
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
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
};

const num = (val: any) =>
  val ? new Intl.NumberFormat("id-ID").format(Number(val) || 0) : "0";

const grandTotalJml = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);
const grandTotalKoli = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.Koli || 0), 0),
);
const grandTotalKirim = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.Kirim || 0), 0),
);

const namaGudang = computed(() => rows.value[0]?.Nama_Gudang || gudang || "");

const printedAt = new Date().toLocaleString("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

onMounted(async () => {
  try {
    const res = await jadwalKirimService.getCetak({
      tglAwal,
      tglAkhir,
      gudang,
    });
    rows.value = res.data.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
    setTimeout(() => window.print(), 700);
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading-wrap">
    <div>Memuat data cetak...</div>
  </div>

  <div v-else class="print-root">
    <!--
      SATU tabel utama:
      - thead → repeat di tiap halaman (header perusahaan + header kolom)
      - tbody → data rows
      - tfoot → repeat di tiap halaman (footer)
    -->
    <table class="main-table">
      <!-- ══ THEAD: repeat tiap halaman ══ -->
      <thead>
        <!-- Baris 1: Header perusahaan -->
        <tr>
          <td colspan="14" class="td-header-company">
            <div class="page-header">
              <div class="header-left">
                <div class="company-name">CV. Kencana Print</div>
                <div class="company-addr">
                  Padokan RT 04 / 04 Sawahan Ngemplak
                </div>
                <div class="company-addr">Boyolali</div>
              </div>
              <div class="header-right">
                <img src="@/assets/logo.png" class="logo-img" alt="Logo" />
              </div>
            </div>
            <div class="report-title">JADWAL &amp; REALISASI PENGIRIMAN</div>
            <div class="report-sub">
              <span
                >Periode:
                <strong
                  >{{ fmtDate(tglAwal) }} s/d {{ fmtDate(tglAkhir) }}</strong
                ></span
              >
              <span class="ml-6"
                >Gudang: <strong>{{ namaGudang }}</strong></span
              >
            </div>
            <div class="gudang-banner">{{ namaGudang.toUpperCase() }}</div>
          </td>
        </tr>

        <!-- Baris 2: Header kolom tabel — baris 1 (rowspan) -->
        <tr class="th-top">
          <th rowspan="2" style="width: 24px">NO.</th>
          <th rowspan="2" style="width: 95px">NO SPK</th>
          <th rowspan="2" style="width: 130px">NAMA SPK</th>
          <th rowspan="2" style="width: 80px">UKURAN</th>
          <th rowspan="2" style="width: 80px">JENIS KAIN</th>
          <th rowspan="2" style="width: 52px">TANGGAL</th>
          <th rowspan="2" style="width: 140px">URAIAN</th>
          <th rowspan="2" style="width: 38px">CUST</th>
          <th colspan="3" class="tc th-group">JADWAL</th>
          <th colspan="2" class="tc th-group">REALISASI</th>
          <th rowspan="2" style="width: 72px">EXPEDISI</th>
        </tr>

        <!-- Baris 3: Sub-header kolom -->
        <tr class="th-sub">
          <th style="width: 48px" class="tc">JML PCS</th>
          <th style="width: 40px" class="tc">JML KOLI</th>
          <th style="width: 52px" class="tc">JAM BRG READY</th>
          <th style="width: 92px" class="tc">NOMOR SJ</th>
          <th style="width: 46px" class="tc">JML KIRIM</th>
        </tr>
      </thead>

      <!-- ══ TFOOT: repeat tiap halaman ══ -->
      <tfoot>
        <tr>
          <td colspan="14" class="td-footer">
            <div class="page-footer">
              <span>Dicetak: {{ printedAt }}</span>
              <span>MANKSI ERP</span>
            </div>
          </td>
        </tr>
      </tfoot>

      <!-- ══ TBODY: data rows ══ -->
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="idx"
          :class="idx % 2 === 1 ? 'row-stripe' : ''"
        >
          <td class="tc td-nowrap">{{ idx + 1 }}</td>
          <td class="td-spk td-nowrap">{{ row.No_SPK }}</td>
          <td class="td-wrap">{{ row.Nama_Spk }}</td>
          <td class="td-wrap">{{ row.Ukuran }}</td>
          <td class="td-wrap">{{ row.Kain }}</td>
          <td class="tc td-nowrap td-sm">{{ fmtDateShort(row.Tanggal) }}</td>
          <td class="td-wrap">{{ row.Uraian }}</td>
          <td class="tc td-nowrap td-sm">{{ row.Cus_Kode }}</td>
          <td class="tr td-nowrap">{{ num(row.Jumlah) }}</td>
          <td class="tr td-nowrap">{{ num(row.Koli) }}</td>
          <td class="tc td-nowrap">{{ row.Jam }}</td>
          <td class="td-sj td-nowrap">{{ row.Nomor_SJ }}</td>
          <td class="tr td-nowrap">{{ row.Kirim ? num(row.Kirim) : "0" }}</td>
          <td class="td-wrap">{{ row.Expedisi }}</td>
        </tr>

        <tr v-if="!rows.length">
          <td colspan="14" class="empty-row">
            Tidak ada data untuk periode ini
          </td>
        </tr>

        <!-- Grand total di akhir tbody -->
        <tr class="grand-total">
          <td colspan="8" class="grand-lbl">JUMLAH:</td>
          <td class="tr grand-val">{{ num(grandTotalJml) }}</td>
          <td class="tr grand-val">{{ num(grandTotalKoli) }}</td>
          <td></td>
          <td></td>
          <td class="tr grand-val">{{ num(grandTotalKirim) }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body {
  background: white;
}
</style>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: #555;
}

.print-root {
  font-family: "Arial Narrow", Arial, sans-serif;
  font-size: 7.5pt;
  color: #000;
  background: white;
}

/* ── Tabel utama ── */
.main-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* thead dan tfoot repeat tiap halaman saat print */
.main-table thead {
  display: table-header-group;
}
.main-table tfoot {
  display: table-footer-group;
}
.main-table tbody {
  display: table-row-group;
}

/* ── Cell header perusahaan ── */
.td-header-company {
  padding: 0;
  border: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 8px 4px;
}
.header-left {
  flex: 1;
}
.company-name {
  font-size: 10pt;
  font-weight: 700;
}
.company-addr {
  font-size: 7.5pt;
  color: #222;
  margin-top: 1px;
}
.header-right {
  flex-shrink: 0;
}
.logo-img {
  height: 36px;
  object-fit: contain;
}

.report-title {
  text-align: center;
  font-size: 10.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 0 2px;
  border-bottom: 1.5px solid #000;
  margin: 0 0 2px;
}

.report-sub {
  font-size: 7.5pt;
  padding: 2px 0 2px 4px;
  color: #333;
}
.ml-6 {
  margin-left: 24px;
}

.gudang-banner {
  font-size: 8pt;
  font-weight: 700;
  padding: 2px 4px;
  border-bottom: 1px solid #000;
  border-top: 1px solid #000;
  margin: 2px 0 0;
  color: #000;
  letter-spacing: 0.03em;
}

/* ── Header kolom ── */
.main-table thead tr.th-top th,
.main-table thead tr.th-sub th {
  background: white;
  color: #000;
  font-size: 6.5pt;
  font-weight: 700;
  padding: 3px 3px;
  border: 0.5px solid #000;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.th-group {
  text-align: center !important;
  border-bottom: none !important;
}

/* ── Data rows ── */
.main-table tbody td {
  padding: 2px 3px;
  border-bottom: 0.3px solid #ccc;
  font-size: 7.5pt;
  vertical-align: top;
}

/* Wrap — boleh multi-baris */
.td-wrap {
  white-space: normal;
  word-break: break-word;
}

/* Nowrap — satu baris */
.td-nowrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-stripe td {
  background: #f9f9f9;
}

/* Kolom khusus */
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.td-sm {
  font-size: 7pt;
}

.td-spk {
  font-size: 7pt;
  font-weight: 600;
  color: #0d47a1;
  font-family: monospace;
}
.td-sj {
  font-size: 7pt;
  color: #2e7d32;
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px !important;
}

/* ── Grand total ── */
.grand-total td {
  border-top: 1.5px solid #000;
  border-bottom: 1px solid #000;
  padding: 3px 3px;
  font-size: 8pt;
  background: white;
}
.grand-lbl {
  font-weight: 700;
  text-align: right;
  padding-right: 8px !important;
}
.grand-val {
  font-weight: 700;
  text-align: right;
}

/* ── Footer ── */
.td-footer {
  padding: 0;
  border: none;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  font-size: 7pt;
  color: #666;
  border-top: 0.5px solid #ccc;
  padding: 3px 4px;
}

/* ── Print ── */
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  /* Pastikan hitam putih */
  .main-table thead tr.th-top th,
  .main-table thead tr.th-sub th {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .row-stripe td {
    background: white !important;
  }
  .grand-total td {
    background: white !important;
  }
  .td-spk {
    color: black !important;
  }
  .td-sj {
    color: black !important;
  }
}

@media screen {
  .print-root {
    padding: 10px;
    max-width: 1400px;
    margin: 0 auto;
  }
}
</style>
