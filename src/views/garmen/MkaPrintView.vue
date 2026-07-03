<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import logoUrl from "@/assets/logo.png";

interface MkaPrintHeader {
  mkb_nomor: string;
  mkb_tanggal: string;
  mkb_note: string;
  mkb_spk_nomor: string;
  spk_nama: string;
  spk_jumlah: number;
}

interface MkaPrintRow {
  mkbd_brg_kode: string;
  nama: string;
  brg_satuan: string;
  mkbd_jumlah: number;
  mkbd_jumlah_po: number;
  mkbd_keterangan: string;
}

interface MkaPrintData {
  header: MkaPrintHeader;
  detail: MkaPrintRow[];
}

const route = useRoute();
const nomor = decodeURIComponent(route.params.nomor as string);

const data = ref<MkaPrintData | null>(null);
const loading = ref(true);
const error = ref("");

const fmtTanggal = (val: string): string => {
  if (!val) return "-";
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
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtNum = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

onMounted(async () => {
  try {
    const res = await api.get("/garmen/mka-form/detail", { params: { nomor } });
    const d = res.data;
    data.value = {
      header: {
        mkb_nomor: d.mkb_nomor,
        mkb_tanggal: d.mkb_tanggal,
        mkb_note: d.mkb_note,
        mkb_spk_nomor: d.mkb_spk_nomor,
        spk_nama: d.spk_nama,
        spk_jumlah: Number(d.spk_jumlah) || 0,
      },
      detail: (d.detail ?? []).map((row: any) => ({
        mkbd_brg_kode: row.kode,
        nama: row.nama,
        brg_satuan: row.satuan,
        mkbd_jumlah: Number(row.jumlah) || 0,
        mkbd_jumlah_po: Number(row.po) || 0,
        mkbd_keterangan: row.keterangan || "",
      })),
    };
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Gagal memuat data cetak";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="screen-wrapper">
    <div v-if="loading" class="print-state">Memuat data cetak...</div>
    <div v-else-if="error" class="print-state error">{{ error }}</div>

    <!-- A4 paper — berisi 2 copy sekaligus, dipisah garis tengah -->
    <div v-else-if="data" class="a4-paper">
      <div
        v-for="copy in 2"
        :key="copy"
        class="copy-block"
        :class="{ 'copy-divider': copy === 1 }"
      >
        <!-- HEADER -->
        <div class="doc-header">
          <div class="doc-title">MEMO KEBUTUHAN ACCESORIES</div>
          <img :src="logoUrl" alt="Kencana Print" class="logo-img" />
        </div>

        <!-- INFO -->
        <div class="info-grid">
          <div class="info-col">
            <div class="info-row">
              <span class="info-lbl">Nomor</span>
              <span class="info-sep">:</span>
              <span class="info-val fw">{{ data.header.mkb_nomor }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Tanggal</span>
              <span class="info-sep">:</span>
              <span class="info-val">{{
                fmtTanggal(data.header.mkb_tanggal)
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Keterangan</span>
              <span class="info-sep">:</span>
              <span class="info-val">{{ data.header.mkb_note || "" }}</span>
            </div>
          </div>
          <div class="info-col">
            <div class="info-row">
              <span class="info-lbl">No SPK</span>
              <span class="info-sep">:</span>
              <span class="info-val fw">{{ data.header.mkb_spk_nomor }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Nama</span>
              <span class="info-sep">:</span>
              <span class="info-val">{{ data.header.spk_nama }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">Jumlah</span>
              <span class="info-sep">:</span>
              <span class="info-val fw">{{
                data.header.spk_jumlah.toLocaleString("id-ID")
              }}</span>
            </div>
          </div>
        </div>

        <!-- TABEL -->
        <table class="detail-table">
          <thead>
            <tr>
              <th class="tc" style="width: 26px">No</th>
              <th style="width: 88px">Kode</th>
              <th>Nama</th>
              <th class="tc" style="width: 50px">Satuan</th>
              <th class="tr" style="width: 60px">Jumlah</th>
              <th class="tr" style="width: 50px">Ready</th>
              <th class="tr" style="width: 58px">Jumlah PO</th>
              <th style="width: 90px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in data.detail"
              :key="idx"
              :class="{ 'row-alt': idx % 2 === 1 }"
            >
              <td class="tc">{{ idx + 1 }}</td>
              <td class="kode">{{ row.mkbd_brg_kode }}</td>
              <td>{{ row.nama }}</td>
              <td class="tc">{{ row.brg_satuan }}</td>
              <td class="tr">{{ fmtNum(row.mkbd_jumlah) }}</td>
              <td class="tr"></td>
              <td class="tr">
                <span v-if="row.mkbd_jumlah_po > 0">{{
                  fmtNum(row.mkbd_jumlah_po)
                }}</span>
              </td>
              <td>{{ row.mkbd_keterangan }}</td>
            </tr>
          </tbody>
        </table>

        <!-- TTD -->
        <div class="ttd-row">
          <div class="ttd-box">
            <div class="ttd-label">Dibuat Oleh,</div>
            <div class="ttd-space"></div>
            <div class="ttd-line"></div>
          </div>
          <div class="ttd-box">
            <div class="ttd-label">Mengetahui,</div>
            <div class="ttd-space"></div>
            <div class="ttd-line"></div>
          </div>
          <div class="ttd-box">
            <div class="ttd-label">Kepala Gudang,</div>
            <div class="ttd-space"></div>
            <div class="ttd-line"></div>
          </div>
          <div class="ttd-box">
            <div class="ttd-label">Disetujui,</div>
            <div class="ttd-space"></div>
            <div class="ttd-line"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Screen wrapper — center A4 di layar ── */
.screen-wrapper {
  min-height: 100vh;
  background: #9e9e9e;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 0;
  box-sizing: border-box;
}

.print-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  font-family: "Segoe UI", sans-serif;
  font-size: 14px;
  color: #fff;
}
.print-state.error {
  color: #ffcdd2;
}

/* ── A4 paper ── */
.a4-paper {
  width: 210mm;
  min-height: 297mm;
  background: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
  padding: 10mm 12mm;
  display: flex;
  flex-direction: column;
}

/* ── Copy block — 2 copy dalam 1 A4, flex sama rata ── */
.copy-block {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Garis pemisah antar copy — hanya di screen */
.copy-divider {
  border-bottom: 1.5px dashed #bdbdbd;
  padding-bottom: 6mm;
  margin-bottom: 6mm;
}

/* ── Header ── */
.doc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 5px;
}
.doc-title {
  font-size: 15pt;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-family: Arial, Helvetica, sans-serif;
}
.logo-img {
  height: 30px;
  object-fit: contain;
}

/* ── Info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
  margin-bottom: 5px;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.info-row {
  display: flex;
  gap: 4px;
  font-size: 8.5pt;
  line-height: 1.55;
}
.info-lbl {
  width: 62px;
  flex-shrink: 0;
}
.info-sep {
  flex-shrink: 0;
}
.info-val {
  flex: 1;
}
.fw {
  font-weight: 700;
}

/* ── Detail table ── */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 6px;
}
.detail-table thead tr {
  border-top: 1.5px solid #000;
  border-bottom: 1px solid #000;
}
.detail-table th {
  padding: 2px 4px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  font-size: 8pt;
}
.detail-table td {
  padding: 1.5px 4px;
  border-bottom: 0.5px solid #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 8pt;
}
.detail-table tbody tr:last-child td {
  border-bottom: 1px solid #000;
}
.row-alt td {
  background: #f5f5f5;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.kode {
  font-family: monospace;
  font-size: 7.5pt;
  color: #1a237e;
}

/* ── TTD ── */
.ttd-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.ttd-box {
  flex: 1;
  border: 1px dashed #aaa;
  padding: 3px 5px 2px;
  display: flex;
  flex-direction: column;
}
.ttd-label {
  font-size: 7.5pt;
  font-weight: 600;
}
.ttd-space {
  height: 24px;
}
.ttd-line {
  border-bottom: 1px solid #000;
  margin: 0 4px;
}

/* ── Print media ── */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  /* Hilangkan background abu-abu saat print */
  .screen-wrapper {
    background: none !important;
    padding: 0 !important;
    display: block !important;
    min-height: unset !important;
  }

  .a4-paper {
    width: 210mm;
    min-height: 297mm;
    box-shadow: none !important;
    padding: 10mm 12mm !important;
    /* TIDAK ada page-break — 2 copy dalam 1 halaman */
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  /* Hapus dashed line saat print — diganti garis tipis */
  .copy-divider {
    border-bottom: 0.5px solid #ccc !important;
  }

  .row-alt td {
    background: #f5f5f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
