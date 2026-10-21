<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import {
  rekapPembayaranFormService,
  type RekapLoaded,
} from "@/services/piutang/rekapPembayaranFormService";
import { pesanError } from "@/services/piutang/rekapPembayaranService";

interface AgregatRow {
  supNama: string;
  bulan: string;
  nominal: number;
  rencana: Set<string>;
}
interface BarisCetak {
  supNama: string;
  bulan: string;
  nominal: number;
  rencana: string;
}
interface BlokCetak {
  kategori: string;
  baris: BarisCetak[];
}

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<RekapLoaded | null>(null);

const NAMA_BULAN = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

// Tanggal dipotong manual supaya tidak bergeser zona waktu
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "-";
};
const fmtBulan = (ym: string): string => {
  const [y, m] = ym.split("-");
  const nama = NAMA_BULAN[Number(m) - 1];
  return nama ? `${nama} ${y}` : "-";
};
const fmt = (v: number): string =>
  Number(v ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Satu baris = supplier + bulan tagihan di dalam satu kategori (seperti Excel)
const blok = computed<BlokCetak[]>(() => {
  const d = data.value;
  if (!d) return [];
  const urut = [...d.detail].sort(
    (a, b) =>
      a.kategoriUrut - b.kategoriUrut ||
      a.supNama.localeCompare(b.supNama) ||
      a.bulanTagihan.localeCompare(b.bulanTagihan),
  );
  const peta = new Map<string, Map<string, AgregatRow>>();
  for (const r of urut) {
    const baris = peta.get(r.kategori) ?? new Map<string, AgregatRow>();
    const k = `${r.supKode}|${r.bulanTagihan}`;
    const row = baris.get(k) ?? {
      supNama: r.supNama,
      bulan: r.bulanTagihan,
      nominal: 0,
      rencana: new Set<string>(),
    };
    row.nominal += r.nominal;
    if (r.tglRencana) row.rencana.add(r.tglRencana);
    baris.set(k, row);
    peta.set(r.kategori, baris);
  }
  return [...peta.entries()].map(([kategori, baris]) => ({
    kategori,
    baris: [...baris.values()].map((x) => ({
      supNama: x.supNama,
      bulan: fmtBulan(x.bulan),
      nominal: round2(x.nominal),
      rencana: [...x.rencana].sort().map(fmtTgl).join(", ") || "",
    })),
  }));
});

const printedAt = new Date().toLocaleString("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

onMounted(async () => {
  try {
    const res = await rekapPembayaranFormService.getById(
      String(route.params.nomor),
    );
    data.value = res.data.data;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat data cetak."));
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <div class="print-page">
      <!-- Header -->
      <div class="print-header">
        <div class="company-info">
          <div class="company-name">CV. Kencana Print</div>
          <div class="company-addr">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="company-telp">0271-740634</div>
        </div>
        <div class="doc-title-wrap">
          <div class="doc-title">REKAP PEMBAYARAN</div>
        </div>
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Logo" class="print-logo" />
        </div>
      </div>

      <!-- Info -->
      <div class="info-section">
        <div class="info-left">
          <table>
            <tr>
              <td width="80">Nomor</td>
              <td>: {{ data.nomor }}</td>
            </tr>
            <tr>
              <td>Tanggal</td>
              <td>: {{ fmtTgl(data.tanggal) }}</td>
            </tr>
          </table>
        </div>
        <div class="info-right">
          <table>
            <tr>
              <td width="80">Keterangan</td>
              <td>: {{ data.keterangan || "-" }}</td>
            </tr>
            <tr v-if="data.status === 'BATAL'">
              <td>Status</td>
              <td class="txt-batal">: DIBATALKAN</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Tabel (format Excel) -->
      <table class="detail-table">
        <thead>
          <tr>
            <th>NAMA</th>
            <th width="120" class="tc">BULAN TAGIHAN</th>
            <th width="130" class="tr">NOMINAL</th>
            <th width="170" class="tc">RENCANA PEMBAYARAN</th>
          </tr>
        </thead>
        <tbody v-for="b in blok" :key="b.kategori">
          <tr class="grp-row">
            <td colspan="4">{{ b.kategori }}</td>
          </tr>
          <tr v-for="(r, i) in b.baris" :key="i">
            <td>{{ r.supNama }}</td>
            <td class="tc">{{ r.bulan }}</td>
            <td class="tr">{{ fmt(r.nominal) }}</td>
            <td class="tc">{{ r.rencana }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="tr fw-bold">TOTAL</td>
            <td class="tr fw-bold">{{ fmt(data.total) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Footer tanda tangan -->
      <div class="print-footer">
        <div class="sign-box">
          <div>Dibuat Oleh,</div>
          <div class="sign-space"></div>
          <div>( {{ data.userCreate }} )</div>
        </div>
        <div class="sign-box">
          <div>Manager Finance,</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
      </div>

      <div class="print-meta">Dicetak {{ printedAt }}</div>
    </div>
  </div>

  <div v-else class="print-loading">Data cetak tidak ditemukan.</div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}
.print-container {
  width: 21cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}
.print-page {
  width: 21cm;
  min-height: 29.7cm;
  padding: 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.company-name {
  font-weight: bold;
  font-size: 11pt;
}
.doc-title {
  font-weight: bold;
  font-size: 13pt;
  text-decoration: underline;
  text-align: center;
}
.print-logo {
  height: 35px;
}
.info-section {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  margin-bottom: 10px;
}
.info-left,
.info-right {
  flex: 1;
}
.info-section table {
  width: 100%;
  border-collapse: collapse;
}
.info-section td {
  vertical-align: top;
  padding: 1px 0;
}
.txt-batal {
  color: #c62828;
  font-weight: bold;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 3px 6px;
}
.detail-table th {
  background: #f0f0f0;
  font-size: 8pt;
}
.detail-table thead {
  display: table-header-group; /* header diulang tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}
.detail-table .grp-row td {
  background: #fafafa;
  font-weight: bold;
  font-size: 8pt;
  text-transform: uppercase;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: bold;
}
.print-footer {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  page-break-inside: avoid;
}
.sign-box {
  text-align: center;
  width: 30%;
}
.sign-space {
  height: 55px;
  border-bottom: 1px dashed #ccc;
  margin-bottom: 5px;
}
.print-meta {
  font-size: 7pt;
  color: #666;
  font-style: italic;
  margin-top: 10px;
}

@media print {
  body {
    background: white;
  }
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    width: 100%;
    min-height: 0;
    padding: 0;
    box-shadow: none;
  }
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}
</style>
