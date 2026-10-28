<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { planningSpkService } from "@/services/ppic/planningSpkService";
import { formatTanggal } from "@/utils/dateFormat";

interface ActualHarian {
  tgl: string; // YYYY-MM-DD
  nomor?: string; // No. Mutasi Produksi (hanya Sewing)
  qty: number;
}
interface DetailRow {
  NomorSPK: string;
  NamaSPK: string;
  TglJadwal: string;
  Wip: number;
  WipBahan?: number;
  WipQty?: number;
  WipSatuan?: string;
  WipCatatan?: string;
  StatusBahan?: string;
  EstimasiKedatangan?: string;
  QtyPo: number;
  QtyJadwal: number;
  LineKelompok: string;
  Keterangan: string;
  Format?: "BARU" | "LAMA";
  Mp?: number;
  Smv?: number;
  Hari?: number;
  Jam?: number;
  Target?: number;
  ActualOutput?: number;
  ActualJam?: number | null;
  WaktuProduksi?: number;
  Resume?: number | null;
  Output?: number;
  ActualHarian?: ActualHarian[];
  OutputHarian?: ActualHarian[];
}
interface DetailCache {
  cutting: DetailRow[];
  sewing: DetailRow[];
}
interface SewingGroup {
  line: string;
  items: DetailRow[];
  totalTarget: number;
  totalActual: number;
  totalTargetWaktu: number;
}

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const detail = ref<DetailCache>({ cutting: [], sewing: [] });

const nomor = String(route.params.nomor ?? "");
const divisi = route.query.divisi === "sewing" ? "sewing" : "cutting";
const tglAwal = String(route.query.awal ?? "");
const tglAkhir = String(route.query.akhir ?? "");
const cabang = String(route.query.cab ?? "");

const printedAt = new Date().toLocaleString("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// ⚠️ Nilai sementara — ganti sesuai yang benar-benar tanda tangan di Planning SPK
const ttd = [
  { aksi: "Dibuat,", jabatan: "Admin PPIC" },
  { aksi: "Menyetujui,", jabatan: "Kepala PPIC" },
  { aksi: "Diketahui,", jabatan: "Manager Produksi" },
];

onMounted(async () => {
  try {
    const res = await planningSpkService.getDetail(nomor);
    detail.value = (res.data.data as DetailCache | undefined) ?? {
      cutting: [],
      sewing: [],
    };
  } catch {
    toast.error("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
    setTimeout(() => window.print(), 700);
  }
});

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const fmtDec = (n: number | null | undefined, d = 2) =>
  n == null
    ? "-"
    : Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });

// ── Cutting ──
const totalCutting = computed(() => ({
  target: detail.value.cutting.reduce(
    (s, r) => s + (Number(r.QtyJadwal) || 0),
    0,
  ),
  output: detail.value.cutting.reduce((s, r) => s + (Number(r.Output) || 0), 0),
}));

// ── Sewing ──
const sewingBaru = computed(() =>
  detail.value.sewing.filter((r) => r.Format === "BARU"),
);
const sewingLama = computed(() =>
  detail.value.sewing.filter((r) => r.Format !== "BARU"),
);

const sewingGroups = computed<SewingGroup[]>(() => {
  const map = new Map<string, SewingGroup>();
  for (const r of sewingBaru.value) {
    const k = r.LineKelompok || "";
    if (!map.has(k))
      map.set(k, {
        line: k,
        items: [],
        totalTarget: 0,
        totalActual: 0,
        totalTargetWaktu: 0,
      });
    const g = map.get(k)!;
    g.items.push(r);
    g.totalTarget += Number(r.Target) || 0;
    g.totalActual += Number(r.ActualOutput) || 0;
    g.totalTargetWaktu +=
      r.Smv != null && r.Smv > 0 ? r.Smv * (Number(r.Target) || 0) : 0;
  }
  const rank = (l: string) =>
    !l ? "0" : l === "LINE EXTERNAL" ? "2" : "1" + l;
  return [...map.values()].sort((a, b) =>
    rank(a.line).localeCompare(rank(b.line)),
  );
});

const outputMenit = (d: DetailRow): number | null =>
  d.Smv != null && d.Smv > 0 ? d.Smv * (Number(d.ActualOutput) || 0) : null;
// Resume minus = output sudah melebihi waktu produksi line
const isOver = (d: DetailRow) => d.Resume != null && d.Resume < 0;

// Pencapaian (%) = Target Waktu / Waktu Produksi line
const pencapaian = (g: SewingGroup): number | null => {
  const wp = Number(g.items[0]?.WaktuProduksi) || 0;
  return wp > 0 ? (g.totalTargetWaktu / wp) * 100 : null;
};
// 2026-10-19 -> 19/10
const tglPendek = (t: string) => {
  const [, m, d] = t.split("-");
  return `${d}/${m}`;
};
// Output menit untuk satu hari = SMV x qty hari itu (kosong kalau SMV belum ada)
const outputMenitHari = (d: DetailRow, qty: number): number | null =>
  d.Smv != null && d.Smv > 0 ? d.Smv * qty : null;
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else class="print-container">
    <div class="print-page">
      <!-- ═════ KOP (gaya cetakan Jadwal Kirim) ═════ -->
      <div class="page-header">
        <div class="header-left">
          <div class="company-name">CV. Kencana Print</div>
          <div class="company-addr">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="company-addr">Boyolali</div>
        </div>
        <div class="header-right">
          <img src="@/assets/logo.png" class="logo-img" alt="Logo" />
        </div>
      </div>
      <div class="report-title">PLANNING SPK PPIC</div>
      <div class="report-sub">
        <span
          >Nomor: <strong>{{ nomor }}</strong></span
        >
        <span class="ml-6"
          >Periode:
          <strong
            >{{ formatTanggal(tglAwal) }} s/d
            {{ formatTanggal(tglAkhir) }}</strong
          ></span
        >
        <span class="ml-6"
          >Cabang: <strong>{{ cabang || "-" }}</strong></span
        >
      </div>
      <div class="divisi-banner">
        {{ divisi === "cutting" ? "DIVISI CUTTING" : "DIVISI SEWING" }}
      </div>

      <!-- ═════ CUTTING ═════ -->
      <table v-if="divisi === 'cutting'" class="detail-table">
        <thead>
          <tr>
            <th rowspan="2" width="28">No</th>
            <th rowspan="2" width="120">Nomor SPK</th>
            <th rowspan="2">Nama SPK</th>
            <th colspan="2">WIP Bahan</th>
            <th rowspan="2" width="105">Status Bahan</th>
            <th rowspan="2" width="70">Est. Kedatangan</th>
            <th rowspan="2" width="70">Qty Target</th>
            <th rowspan="2" width="90">Proses Produksi</th>
            <th rowspan="2" width="70">Output</th>
            <th rowspan="2" width="170">Output per Tanggal</th>
          </tr>
          <tr>
            <th width="70">Qty</th>
            <th width="50">Satuan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in detail.cutting" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td class="tc">{{ d.NomorSPK }}</td>
            <td>{{ d.NamaSPK || "-" }}</td>
            <td class="tr">
              {{ d.WipSatuan ? fmt(d.WipBahan) : "-"
              }}<span v-if="d.WipCatatan">*</span>
            </td>
            <td class="tc">{{ d.WipSatuan || "-" }}</td>
            <td class="tc">{{ d.StatusBahan || "-" }}</td>
            <td class="tc">
              {{
                d.EstimasiKedatangan ? formatTanggal(d.EstimasiKedatangan) : "-"
              }}
            </td>
            <td class="tr">{{ fmt(d.QtyJadwal) }}</td>
            <td class="tc">{{ d.LineKelompok || "-" }}</td>
            <td class="tr">{{ d.Output ? fmt(d.Output) : "-" }}</td>
            <td class="hr-cell">
              <template v-if="d.OutputHarian?.length">
                <span v-for="h in d.OutputHarian" :key="h.tgl" class="hr-item">
                  {{ tglPendek(h.tgl) }}: {{ fmt(h.qty) }}
                </span>
              </template>
              <template v-else>-</template>
            </td>
          </tr>
          <tr v-if="!detail.cutting.length">
            <td colspan="11" class="tc">Tidak ada data cutting</td>
          </tr>
          <tr v-else class="row-total">
            <td colspan="7">Total</td>
            <td class="tr">{{ fmt(totalCutting.target) }}</td>
            <td></td>
            <td class="tr">{{ fmt(totalCutting.output) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- ═════ SEWING ═════ -->
      <template v-else>
        <table v-if="sewingBaru.length" class="detail-table">
          <thead>
            <tr>
              <th width="28">No</th>
              <th width="120">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="60">SMV (mnt)</th>
              <th width="60">Target</th>
              <th width="65">Act. Output</th>
              <th width="70">Output (mnt)</th>
              <th width="270">Mutasi / Act. Output per Tanggal</th>
              <th width="70">Resume (mnt)</th>
              <th width="150">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in sewingGroups" :key="g.line || '_blank'">
              <tr class="grp-row">
                <td colspan="10">
                  <b>{{ g.line || "(Tanpa line)" }}</b>
                  &nbsp;|&nbsp; MP {{ fmtDec(g.items[0].Mp, 0) }} &nbsp;|&nbsp;
                  Hari {{ fmtDec(g.items[0].Hari, 1) }} &nbsp;|&nbsp; Jam
                  {{ fmtDec(g.items[0].Jam, 1) }}
                  &nbsp;|&nbsp; Waktu Prod
                  {{
                    (g.items[0].WaktuProduksi ?? 0) > 0
                      ? fmtDec(g.items[0].WaktuProduksi, 0)
                      : "-"
                  }}
                  mnt &nbsp;|&nbsp; Target Waktu
                  {{
                    g.totalTargetWaktu > 0 ? fmtDec(g.totalTargetWaktu, 0) : "-"
                  }}
                  mnt &nbsp;|&nbsp; Pencapaian
                  {{
                    pencapaian(g) === null
                      ? "-"
                      : fmtDec(pencapaian(g), 1) + "%"
                  }}
                  &nbsp;|&nbsp; Σ Target {{ fmt(g.totalTarget) }} &nbsp;|&nbsp;
                  Σ Act. Output {{ fmt(g.totalActual) }}
                </td>
              </tr>
              <tr v-for="(d, n) in g.items" :key="n">
                <td class="tc">{{ n + 1 }}</td>
                <td class="tc">{{ d.NomorSPK }}</td>
                <td>{{ d.NamaSPK || "-" }}</td>
                <td class="tr">{{ fmtDec(d.Smv, 3) }}</td>
                <td class="tr">{{ fmt(d.Target) }}</td>
                <td class="tr">{{ fmt(d.ActualOutput) }}</td>
                <td class="tr">{{ fmtDec(outputMenit(d), 1) }}</td>
                <td class="hr-cell">
                  <template v-if="d.ActualHarian?.length">
                    <span
                      v-for="h in d.ActualHarian"
                      :key="h.nomor ?? h.tgl"
                      class="hr-item blok"
                    >
                      {{ tglPendek(h.tgl) }} {{ h.nomor ?? "" }}:
                      {{ fmt(h.qty) }}
                      <template v-if="outputMenitHari(d, h.qty) != null">
                        ({{ fmtDec(outputMenitHari(d, h.qty), 0) }} mnt)
                      </template>
                    </span>
                  </template>
                  <template v-else>-</template>
                </td>
                <td class="tr" :class="{ over: isOver(d) }">
                  {{ fmtDec(d.Resume, 1) }}
                </td>
                <td>{{ d.Keterangan }}</td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- Format lama -->
        <table v-if="sewingLama.length" class="detail-table">
          <thead>
            <tr>
              <th width="120">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="70">Tgl Jadwal</th>
              <th width="55">WIP</th>
              <th width="55">Qty PO</th>
              <th width="65">Qty Jadwal</th>
              <th width="90">Line/Kelompok</th>
              <th width="150">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in sewingLama" :key="i">
              <td class="tc">{{ d.NomorSPK }}</td>
              <td>{{ d.NamaSPK || "-" }}</td>
              <td class="tc">{{ formatTanggal(d.TglJadwal) }}</td>
              <td class="tr">{{ fmt(d.Wip) }}</td>
              <td class="tr">{{ fmt(d.QtyPo) }}</td>
              <td class="tr">{{ fmt(d.QtyJadwal) }}</td>
              <td class="tc">{{ d.LineKelompok || "-" }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="!detail.sewing.length" class="tc empty">
          Tidak ada data sewing
        </div>
      </template>

      <div class="ttd-wrap">
        <div v-for="t in ttd" :key="t.aksi" class="ttd-col">
          <div class="ttd-aksi">{{ t.aksi }}</div>
          <div class="ttd-line">(.........................)</div>
          <div class="ttd-jabatan">{{ t.jabatan }}</div>
        </div>
      </div>
      <div class="cetak">Dicetak: {{ printedAt }}</div>
    </div>
  </div>
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

/* ── Kop ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0 0 4px;
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
.logo-img {
  height: 36px;
  object-fit: contain;
}
.report-title {
  text-align: center;
  font-size: 10.5pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 0 2px;
  border-bottom: 1.5px solid #000;
  margin-bottom: 2px;
}
.report-sub {
  font-size: 8pt;
  padding: 2px 0 2px 4px;
  color: #333;
}
.ml-6 {
  margin-left: 24px;
}
.divisi-banner {
  font-size: 8.5pt;
  font-weight: 700;
  padding: 2px 4px;
  border-top: 1px solid #000;
  border-bottom: 1px solid #000;
  margin: 2px 0 8px;
  letter-spacing: 0.03em;
}

/* ── Tabel ── */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 2px 4px;
}
.detail-table th {
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
.detail-table thead {
  display: table-header-group; /* header kolom diulang tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}
.row-total td {
  font-weight: bold;
}
.grp-row td {
  background: #e0e0e0;
  font-size: 8.5pt;
}
.over {
  font-weight: bold;
  text-decoration: underline;
}
.hr-cell {
  font-size: 7.5pt;
  line-height: 1.3;
}
.hr-item {
  display: inline-block;
  margin-right: 6px;
  white-space: nowrap;
}
.hr-item.blok {
  display: block;
  margin-right: 0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty {
  padding: 10px;
  font-style: italic;
}

/* ── Tanda tangan / validasi ── */
.ttd-wrap {
  display: flex;
  margin-top: 24px;
  border-top: 1px solid #000;
  padding-top: 8px;
  page-break-inside: avoid;
}
.ttd-col {
  flex: 1;
  text-align: center;
  font-size: 8pt;
}
.ttd-line {
  margin-top: 40px;
  font-size: 8pt;
}
.ttd-jabatan {
  margin-top: 4px;
  font-size: 7.5pt;
  color: #1a4f8b;
}
.cetak {
  margin-top: 8px;
  text-align: right;
  font-size: 7pt;
  color: #666;
}

@media print {
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
  .grp-row td {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 landscape;
    margin: 1cm;
  }
}
</style>
