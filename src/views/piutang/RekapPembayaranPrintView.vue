<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import {
  rekapPembayaranFormService,
  type RekapLoaded,
} from "@/services/piutang/rekapPembayaranFormService";
import { pesanError } from "@/services/piutang/rekapPembayaranService";

interface BarisCetak {
  tanggal: string; // sudah diformat, kosong bila belum ada rencana
  nominal: number;
}
interface GrupCetak {
  supNama: string;
  rekening: string;
  bank: string;
  atasNama: string;
  bulan: string;
  total: number;
  baris: BarisCetak[];
}
interface BlokCetak {
  kategori: string;
  grup: GrupCetak[];
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

// Satu kelompok = supplier + bulan tagihan di dalam satu kategori (seperti Excel).
// Di dalamnya dipecah per tanggal rencana, masing-masing dengan nominalnya.
const blok = computed<BlokCetak[]>(() => {
  const d = data.value;
  if (!d) return [];
  const urut = [...d.detail].sort(
    (a, b) =>
      a.kategoriUrut - b.kategoriUrut ||
      a.supNama.localeCompare(b.supNama) ||
      a.bulanTagihan.localeCompare(b.bulanTagihan) ||
      (a.tglRencana ?? "9999-99-99").localeCompare(
        b.tglRencana ?? "9999-99-99",
      ),
  );
  const peta = new Map<string, Map<string, GrupCetak>>();
  for (const r of urut) {
    const perKategori = peta.get(r.kategori) ?? new Map<string, GrupCetak>();
    const k = `${r.supKode}|${r.bulanTagihan}`;
    const g: GrupCetak = perKategori.get(k) ?? {
      supNama: r.supNama,
      rekening: r.supRekening,
      bank: r.supBank,
      atasNama: r.supAtasnama,
      bulan: fmtBulan(r.bulanTagihan),
      total: 0,
      baris: [],
    };
    const tgl = r.tglRencana ? fmtTgl(r.tglRencana) : "";
    const ada = g.baris.find((x) => x.tanggal === tgl);
    if (ada) ada.nominal = round2(ada.nominal + r.nominal);
    else g.baris.push({ tanggal: tgl, nominal: r.nominal });
    g.total = round2(g.total + r.nominal);
    perKategori.set(k, g);
    peta.set(r.kategori, perKategori);
  }
  return [...peta.entries()].map(([kategori, grup]) => ({
    kategori,
    grup: [...grup.values()],
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

      <table class="detail-table">
        <thead>
          <tr>
            <th>NAMA</th>
            <th width="220" class="tc">NO REKENING</th>
            <th width="120" class="tc">BULAN TAGIHAN</th>
            <th width="130" class="tr">NOMINAL</th>
            <th width="140" class="tc">RENCANA PEMBAYARAN</th>
          </tr>
        </thead>
        <tbody v-for="b in blok" :key="b.kategori">
          <tr class="grp-row">
            <td colspan="5">{{ b.kategori }}</td>
          </tr>
          <template v-for="(g, gi) in b.grup" :key="gi">
            <tr v-for="(r, i) in g.baris" :key="i">
              <td v-if="i === 0" :rowspan="g.baris.length">{{ g.supNama }}</td>
              <td v-if="i === 0" :rowspan="g.baris.length">
                <div class="rek-no">{{ g.rekening || "-" }}</div>
                <div v-if="g.bank || g.atasNama" class="rek-sub">
                  {{ [g.bank, g.atasNama].filter(Boolean).join(" a.n. ") }}
                </div>
              </td>
              <td v-if="i === 0" :rowspan="g.baris.length" class="tc">
                {{ g.bulan }}
              </td>
              <td class="tr">{{ fmt(r.nominal) }}</td>
              <td class="tc">{{ r.tanggal }}</td>
            </tr>
            <tr v-if="g.baris.length > 1" class="sub-row">
              <td colspan="3" class="tr">Subtotal {{ g.supNama }}</td>
              <td class="tr">{{ fmt(g.total) }}</td>
              <td></td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="tr fw-bold">TOTAL</td>
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
  width: 29.7cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}
.print-page {
  width: 29.7cm;
  min-height: 21cm;
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
.detail-table td {
  vertical-align: top;
}
.rek-no {
  font-weight: bold;
  letter-spacing: 0.3px;
}
.rek-sub {
  font-size: 7.5pt;
  color: #444;
}
.detail-table .sub-row td {
  font-style: italic;
  font-size: 8pt;
  background: #fafafa;
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
    size: A4 landscape;
    margin: 1cm;
  }
}
</style>
