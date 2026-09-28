<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { bkmFormService } from "@/services/piutang/bkmFormService";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    const res = await bkmFormService.getPrintData(
      decodeURIComponent(route.params.nomor as string),
    );
    data.value = res.data.data;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data cetak.";
  } finally {
    isLoading.value = false;
  }
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const fmtDate = (v: string) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const terbilang = (n: number): string => {
  if (n === 0) return "NOL";
  if (n < 0) return "MINUS " + terbilang(Math.abs(n));

  const satuan = [
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
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];

  const convert = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return satuan[num] + " ";
    if (num < 100)
      return satuan[Math.floor(num / 10)] + " puluh " + convert(num % 10);
    if (num < 200) return "seratus " + convert(num - 100);
    if (num < 1000)
      return satuan[Math.floor(num / 100)] + " ratus " + convert(num % 100);
    if (num < 2000) return "seribu " + convert(num - 1000);
    if (num < 1000000)
      return convert(Math.floor(num / 1000)) + "ribu " + convert(num % 1000);
    if (num < 1000000000)
      return (
        convert(Math.floor(num / 1000000)) + "juta " + convert(num % 1000000)
      );
    return (
      convert(Math.floor(num / 1000000000)) +
      "milyar " +
      convert(num % 1000000000)
    );
  };

  return convert(n).trim().toUpperCase();
};

const totalNominal = computed(() => Number(data.value?.total) || 0);
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data cetak...</div>
  <div v-else-if="error" class="loading">{{ error }}</div>
  <div v-else-if="data" class="print-page">
    <div class="header-row">
      <div class="doc-title-wrapper">
        <div class="doc-title">BUKTI KAS MASUK</div>
      </div>
      <img :src="logoUrl" alt="Logo" class="logo" />
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">Nomor</span>
          <span class="sep">:</span>
          <span class="val">{{ data.nomor }}</span>
        </div>
        <div class="info-row">
          <span class="lbl">Tanggal</span>
          <span class="sep">:</span>
          <span class="val">{{ fmtDate(data.tanggal) }}</span>
        </div>
        <div class="info-row">
          <span class="lbl">Keterangan</span>
          <span class="sep">:</span>
          <span class="val">{{ data.keterangan || "-" }}</span>
        </div>
      </div>
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">Diterima dari</span>
          <span class="sep">:</span>
          <span class="val">{{ data.penerima || "-" }}</span>
        </div>
      </div>
    </div>

    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 30px">No</th>
          <th>Uraian</th>
          <th style="width: 110px; text-align: right">Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in data.detail" :key="d.no">
          <td class="tc">{{ d.no }}</td>
          <td>{{ d.uraian }}</td>
          <td class="tr">{{ fmt(d.nominal) }}</td>
        </tr>
        <tr v-if="!data.detail || !data.detail.length">
          <td colspan="3" class="tc" style="color: #999; font-style: italic">
            Tidak ada detail
          </td>
        </tr>
        <tr>
          <td colspan="2" class="terbilang-cell">
            Terbilang: {{ terbilang(totalNominal) }}
          </td>
          <td></td>
        </tr>
        <tr>
          <td colspan="2" class="tot-lbl">Total :</td>
          <td class="tot-val">{{ fmt(totalNominal) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="bottom-section">
      <div class="ttd-area">
        <div class="ttd-col">
          <div class="ttd-title">Diterima Dari</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( {{ data.penerima || "           " }} )</div>
        </div>
        <div class="ttd-col">
          <div class="ttd-title">Kasir</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( {{ data.kasir || "           " }} )</div>
        </div>
        <div class="ttd-col">
          <div class="ttd-title">Manager</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">
            (<span style="display: inline-block; width: 60px"></span>)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #666;
}
.print-page {
  width: 138mm;
  margin: 0 auto;
  padding: 5mm 6mm;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  color: #000;
}
.header-row {
  position: relative;
  height: 34px;
  margin-bottom: 10px;
}
.doc-title-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
}
.doc-title {
  font-size: 11pt;
  font-weight: bold;
  text-decoration: underline;
}
.logo {
  position: absolute;
  right: 0;
  top: 0;
  height: 28px;
  object-fit: contain;
}
.info-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.info-col {
  width: 60%;
}
.info-col:last-child {
  width: 38%;
}
.info-row {
  display: flex;
  margin-bottom: 3px;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: normal;
}
.sep {
  width: 10px;
  flex-shrink: 0;
}
.val {
  flex: 1;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  margin-bottom: 20px;
}
.detail-table th,
.detail-table td {
  padding: 3px 5px;
  border: 1px solid #000;
}
.detail-table th {
  background: #f0f0f0;
  font-weight: bold;
  text-align: left;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.terbilang-cell {
  font-style: italic;
  border-right: none;
}
.terbilang-cell + td {
  border-left: none;
}
.tot-lbl {
  text-align: right;
  font-weight: bold;
}
.tot-val {
  text-align: right;
  font-weight: bold;
}
.bottom-section {
  display: flex;
  justify-content: flex-start;
  margin-top: 14px;
}
.ttd-area {
  display: flex;
  gap: 20px;
  width: 100%;
  justify-content: space-around;
}
.ttd-col {
  text-align: center;
}
.ttd-title {
  font-weight: bold;
  margin-bottom: 26px;
}
.ttd-name {
  white-space: nowrap;
  border-top: 1px solid #000;
  padding-top: 4px;
}
@media print {
  @page {
    size: A5;
    margin: 5mm;
  }
  .print-page {
    width: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
