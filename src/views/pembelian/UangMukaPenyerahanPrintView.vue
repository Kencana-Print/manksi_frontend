<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { pengajuanUangMukaService } from "@/services/pembelian/pengajuanUangMukaService";
import logoUrl from "@/assets/logo.png";

interface PenyerahanItem {
  uraian: string;
  satuan: string;
  qty: number;
}
interface PenyerahanData {
  tanggal_fmt: string;
  keterangan: string;
  cabang: string;
  penyerah: string;
  total: number;
  detail: PenyerahanItem[];
}

const route = useRoute();
const data = ref<PenyerahanData | null>(null);
const errorMsg = ref("");

const numFmt = (v: number) => Number(v || 0).toLocaleString("id-ID");

const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];
const terbilangAngka = (n: number): string => {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangAngka(n - 10)} belas`;
  if (n < 100)
    return `${terbilangAngka(Math.floor(n / 10))} puluh ${terbilangAngka(n % 10)}`;
  if (n < 200) return `seratus ${terbilangAngka(n - 100)}`;
  if (n < 1000)
    return `${terbilangAngka(Math.floor(n / 100))} ratus ${terbilangAngka(n % 100)}`;
  if (n < 2000) return `seribu ${terbilangAngka(n - 1000)}`;
  if (n < 1_000_000)
    return `${terbilangAngka(Math.floor(n / 1000))} ribu ${terbilangAngka(n % 1000)}`;
  if (n < 1_000_000_000)
    return `${terbilangAngka(Math.floor(n / 1_000_000))} juta ${terbilangAngka(n % 1_000_000)}`;
  return `${terbilangAngka(Math.floor(n / 1_000_000_000))} miliar ${terbilangAngka(n % 1_000_000_000)}`;
};
const terbilang = (n: number): string => {
  const v = Math.floor(Math.abs(Number(n) || 0));
  if (v === 0) return "NOL";
  return terbilangAngka(v).replace(/\s+/g, " ").trim().toUpperCase();
};

onMounted(async () => {
  try {
    const res = await pengajuanUangMukaService.getPrintPenyerahan(
      String(route.params.nomor),
    );
    data.value = res.data;
    await nextTick();
    setTimeout(() => window.print(), 300);
  } catch (e: unknown) {
    errorMsg.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Gagal memuat data penyerahan dana.";
  }
});
</script>

<template>
  <div class="pnyr-page">
    <div v-if="errorMsg" class="pnyr-error">{{ errorMsg }}</div>
    <div v-else-if="!data" class="pnyr-loading">Memuat...</div>

    <div v-else class="pnyr-sheet">
      <div class="pnyr-head">
        <div class="pnyr-title">PENYERAHAN DANA BELANJA</div>
        <img :src="logoUrl" alt="Logo" class="pnyr-logo" />
      </div>

      <div class="pnyr-meta">
        <div class="pnyr-row">
          <span class="pnyr-lbl">Tanggal</span>
          <span>: {{ data.tanggal_fmt }}</span>
        </div>
        <div class="pnyr-row">
          <span class="pnyr-lbl">Keterangan</span>
          <span>: {{ data.keterangan || "-" }}</span>
        </div>
      </div>

      <table class="pnyr-table">
        <thead>
          <tr>
            <th style="width: 40px">No</th>
            <th>Uraian</th>
            <th style="width: 110px" class="tr">Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.detail" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td>{{ d.uraian }}</td>
            <td class="tr">{{ numFmt(d.qty) }} {{ d.satuan }}</td>
          </tr>
          <tr v-if="!data.detail.length">
            <td colspan="3" class="tc">Tidak ada item.</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="pnyr-total">
            <td colspan="2" class="tr">Total Dana Diserahkan</td>
            <td class="tr">{{ numFmt(data.total) }}</td>
          </tr>
          <tr>
            <td colspan="3" class="pnyr-terbilang">
              Terbilang: <i>{{ terbilang(data.total) }} RUPIAH</i>
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="pnyr-sign">
        <div class="pnyr-sign-col">
          <div class="pnyr-sign-title">Diserahkan Oleh</div>
          <div class="pnyr-sign-line" />
          <div class="pnyr-sign-name">({{ data.penyerah }})</div>
        </div>
        <div class="pnyr-sign-col">
          <div class="pnyr-sign-title">Diterima Oleh</div>
          <div class="pnyr-sign-line" />
          <div class="pnyr-sign-name pnyr-sign-blank">(<span />)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pnyr-page {
  background: #fff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  padding: 24px;
  min-height: 100vh;
}
.pnyr-sheet {
  max-width: 720px;
  margin: 0 auto;
}
.pnyr-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.pnyr-title {
  font-size: 20px;
  font-weight: 700;
}
.pnyr-logo {
  height: 36px;
  object-fit: contain;
}
.pnyr-meta {
  margin-bottom: 12px;
}
.pnyr-row {
  display: flex;
  margin-bottom: 4px;
}
.pnyr-lbl {
  width: 90px;
  font-weight: 700;
}
.pnyr-table {
  width: 100%;
  border-collapse: collapse;
}
.pnyr-table th,
.pnyr-table td {
  border: 1px solid #222;
  padding: 6px 8px;
  vertical-align: top;
}
.pnyr-table thead th {
  background: #eee;
  text-align: left;
}
.pnyr-total td {
  font-weight: 700;
}
.pnyr-terbilang {
  font-size: 11px;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.pnyr-sign {
  display: flex;
  justify-content: space-around;
  margin-top: 28px;
}
.pnyr-sign-col {
  text-align: center;
  width: 200px;
}
.pnyr-sign-title {
  font-weight: 700;
}
.pnyr-sign-line {
  border-bottom: 1px solid #222;
  margin: 48px 16px 4px;
}
.pnyr-sign-name {
  font-size: 11px;
}
.pnyr-sign-blank span {
  display: inline-block;
  width: 110px;
}
.pnyr-error,
.pnyr-loading {
  text-align: center;
  padding: 40px;
}
.pnyr-error {
  color: #c62828;
}

@media print {
  .pnyr-page {
    padding: 0;
  }
}
</style>
