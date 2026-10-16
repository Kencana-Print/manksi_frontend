<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import * as lhkForm from "@/services/spanduk/lhk/lhkProofFormService";

type LhkProofCetak = Awaited<ReturnType<typeof lhkForm.getById>>;
type BarisCetak = LhkProofCetak["Detail"][number];

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<LhkProofCetak | null>(null);

const loadData = async () => {
  try {
    data.value = await lhkForm.getById(String(route.params.nomor));
    setTimeout(() => window.print(), 600);
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data cetak."));
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// Tanggal dari server berformat YYYY-MM-DD; dipotong manual agar tidak bergeser zona waktu
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "-";
};

const fmt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// Qty kosong/0 dicetak kosong supaya tabel ukuran mudah dibaca
const fmtQty = (v: number | null | undefined): string =>
  Number(v ?? 0) > 0 ? fmtInt(v) : "";

const INDEKS_WARNA = [0, 1, 2, 3, 4, 5, 6];

const warna = (r: BarisCetak): string[] => [
  r.U1 ?? "",
  r.U2 ?? "",
  r.U3 ?? "",
  r.U4 ?? "",
  r.U5 ?? "",
  r.U6 ?? "",
  r.U7 ?? "",
];

const rows = computed(() => data.value?.Detail ?? []);

// Daftar 15 ukuran selalu sama di tiap baris, ambil dari baris pertama
const daftarUkuran = computed(() =>
  (rows.value[0]?.Plangkan ?? []).map((p) => p.Ukuran),
);

const qtyUkuran = (idx: number, i: number): number =>
  Number(rows.value[idx]?.Plangkan?.[i]?.Qty ?? 0);

// Total qty satu SPK = jumlah semua ukuran (tabel Detail Plangkan)
const jumlahQtyBaris = (r: BarisCetak): number =>
  (r.Plangkan ?? []).reduce((s, p) => s + Number(p.Qty ?? 0), 0);

const total = computed(() => ({
  plangkan: rows.value.reduce((s, r) => s + Number(r.J_Plangkan ?? 0), 0),
  proof: rows.value.reduce((s, r) => s + Number(r.J_Proof ?? 0), 0),
  qty: rows.value.reduce((s, r) => s + jumlahQtyBaris(r), 0),
}));

const totalPerUkuran = computed(() =>
  daftarUkuran.value.map((_, i) =>
    rows.value.reduce((s, r) => s + Number(r.Plangkan?.[i]?.Qty ?? 0), 0),
  ),
);
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <div class="print-page">
      <div class="doc-title">Laporan Hasil Kerja Proof</div>

      <table class="info">
        <tr>
          <td width="60">Tanggal</td>
          <td>: {{ fmtTgl(data.Tanggal) }}</td>
        </tr>
        <tr>
          <td>Nomor</td>
          <td>: {{ data.Nomor }}</td>
        </tr>
        <tr>
          <td>Lokasi</td>
          <td>: {{ data.Nama_Pabrik || data.Kode_Pabrik || "-" }}</td>
        </tr>
      </table>

      <!-- Tabel 1: data SPK -->
      <table class="detail-table">
        <thead>
          <tr>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2" width="65">Jumlah<br />Order (Pcs)</th>
            <th colspan="2">Spesifikasi</th>
            <th rowspan="2" width="105">Nomor SPK</th>
            <th rowspan="2" width="55">J<br />Plangkan</th>
            <th rowspan="2" width="50">J<br />Proof</th>
            <th v-for="i in INDEKS_WARNA" :key="i" rowspan="2" width="62">
              Warna<br />{{ i + 1 }}
            </th>
          </tr>
          <tr>
            <th width="42">P</th>
            <th width="42">L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td>{{ r.Nama_SPK }}</td>
            <td class="tr">{{ fmtInt(r.Jumlah_Order) }}</td>
            <td class="tr">{{ fmt(r.Panjang) }}</td>
            <td class="tr">{{ fmt(r.Lebar) }}</td>
            <td class="tc">{{ r.Nomor_SPK }}</td>
            <td class="tr">{{ fmtInt(r.J_Plangkan) }}</td>
            <td class="tr">{{ fmtInt(r.J_Proof) }}</td>
            <td v-for="(w, i) in warna(r)" :key="i" class="tc warna">
              {{ w }}
            </td>
          </tr>
          <tr class="row-total">
            <td colspan="5">Total</td>
            <td class="tr">{{ fmtInt(total.plangkan) }}</td>
            <td class="tr">{{ fmtInt(total.proof) }}</td>
            <td :colspan="INDEKS_WARNA.length"></td>
          </tr>
        </tbody>
      </table>

      <!-- Tabel 2: Detail Plangkan (ukuran x qty) -->
      <div class="sub-title">Detail Plangkan (Qty per Ukuran)</div>
      <table class="detail-table">
        <thead>
          <tr>
            <th width="110">Nomor SPK</th>
            <th v-for="(u, i) in daftarUkuran" :key="i">{{ fmtInt(u) }}</th>
            <th width="50">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="tc">{{ r.Nomor_SPK }}</td>
            <td v-for="(_, i) in daftarUkuran" :key="i" class="tr">
              {{ fmtQty(qtyUkuran(idx, i)) }}
            </td>
            <td class="tr">{{ fmtInt(jumlahQtyBaris(r)) }}</td>
          </tr>
          <tr class="row-total">
            <td>Total</td>
            <td v-for="(t, i) in totalPerUkuran" :key="i" class="tr">
              {{ fmtQty(t) }}
            </td>
            <td class="tr">{{ fmtInt(total.qty) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="sign">Mengetahui: 1 <span class="line"></span></div>
        <div class="sign">Mengetahui: 2 <span class="line"></span></div>
      </div>
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
  font-size: 8pt;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 14pt;
  margin-bottom: 10px;
}

.sub-title {
  font-weight: bold;
  font-size: 9pt;
  margin: 14px 0 4px;
}

.info {
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 9pt;
}
.info td {
  padding: 1px 0;
  vertical-align: top;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
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
  display: table-header-group; /* header diulang tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}
.row-total td {
  font-weight: bold;
}
.warna {
  font-size: 7pt;
  word-break: break-word;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.print-footer {
  display: flex;
  gap: 60px;
  margin-top: 30px;
  padding-left: 40px;
  font-size: 9pt;
  page-break-inside: avoid;
}
.sign .line {
  display: inline-block;
  width: 160px;
  border-bottom: 1px solid black;
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
  @page {
    size: A4 landscape;
    margin: 1cm;
  }
}
</style>
