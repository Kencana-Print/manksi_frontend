<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { uangMukaPenyelesaianFormService as uangMukaPenyelesaianApi } from "@/services/pembelian/uangMukaPenyelesaianFormService";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    const res = await uangMukaPenyelesaianApi.getFormData(
      decodeURIComponent(route.params.nomor as string),
    );
    data.value = res;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data cetak.";
  } finally {
    isLoading.value = false;
  }
});

const printDetails = computed(() => {
  if (!data.value) return [];
  return data.value.detail.filter((d: any) => d.verified && d.total > 0);
});

const totalTerpakai = computed(() => {
  return printDetails.value.reduce((sum: number, d: any) => sum + d.total, 0);
});

const kasbonNominal = computed(() => data.value?.nominal || 0);
const sisaKasbon = computed(() => kasbonNominal.value - totalTerpakai.value);

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
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data cetak...</div>
  <div v-else-if="error" class="loading">{{ error }}</div>
  <div v-else-if="data" class="print-page">
    <div class="header-row">
      <div class="doc-title-wrapper">
        <div class="doc-title">PENYELESAIAN KASBON</div>
      </div>
      <img :src="logoUrl" alt="Logo" class="logo" />
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">No.Bon</span>
          <span class="sep">:</span>
          <span class="val">{{ data.nomor }}</span>
        </div>
        <div class="info-row">
          <span class="lbl">Tanggal</span>
          <span class="sep">:</span>
          <span class="val">{{ fmtDate(data.tanggal) }}</span>
        </div>
      </div>
      <div class="info-col">
        <div class="info-row">
          <span class="lbl">No.BKK</span>
          <span class="sep">:</span>
          <span class="val">{{ data.no_bkk || "-" }}</span>
        </div>
        <div class="info-row" style="display: flex">
          <div style="flex: 1; display: flex">
            <span class="lbl">Tanggal</span>
            <span class="sep">:</span>
            <span class="val">{{ fmtDate(data.tgl_bkk) }}</span>
          </div>
          <div style="margin-left: 10px">
            <span class="lbl" style="width: auto; margin-right: 4px"
              >Nota :</span
            >
            <span class="val">{{ data.nota || "-" }}</span>
          </div>
        </div>
      </div>
    </div>

    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 25px">No</th>
          <th style="width: 100px">No.Pengajuan</th>
          <th>Uraian</th>
          <th style="width: 90px; text-align: right">Qty</th>
          <th style="width: 90px; text-align: right">Nominal</th>
          <th style="width: 100px; text-align: right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in printDetails" :key="i">
          <td class="tc">{{ Number(i) + 1 }}</td>
          <td>{{ d.pjh || d.pmt || "-" }}</td>
          <td>{{ d.uraian }}{{ d.spesifikasi ? " " + d.spesifikasi : "" }}</td>
          <td class="tr">{{ d.qty }} {{ d.satuan }}</td>
          <td class="tr">{{ fmt(d.harga) }}</td>
          <td class="tr">{{ fmt(d.total) }}</td>
        </tr>
        <tr v-if="!printDetails.length">
          <td colspan="6" class="tc" style="color: #999; font-style: italic">
            Tidak ada detail
          </td>
        </tr>
      </tbody>
    </table>

    <table class="footer-table">
      <tr>
        <td class="terbilang-col" rowspan="2" valign="top">
          Terbilang: {{ terbilang(totalTerpakai).toUpperCase() }}
        </td>
        <td class="tot-lbl">Total</td>
        <td class="tot-sep">:</td>
        <td class="tot-val">{{ fmt(totalTerpakai) }}</td>
      </tr>
    </table>

    <div class="bottom-section">
      <div class="ttd-area">
        <div class="ttd-col">
          <div class="ttd-title">Diterima Oleh</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">
            ({{ data.pum_user_create || "           " }})
          </div>
        </div>
        <div class="ttd-col">
          <div class="ttd-title">Kasir</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">
            ({{ data.pum_user_realisasi || "           " }})
          </div>
        </div>
        <div class="ttd-col">
          <div class="ttd-title">Manager</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">
            (<span style="display: inline-block; width: 60px"></span>)
          </div>
        </div>
      </div>

      <div class="summary-area">
        <div class="sum-row">
          <span class="sum-lbl">Kasbon</span>
          <span class="sum-sep">:</span>
          <span class="sum-val">{{ fmt(kasbonNominal) }}</span>
        </div>
        <div class="sum-row">
          <span class="sum-lbl">Sisa</span>
          <span class="sum-sep">:</span>
          <span class="sum-val">{{ fmt(sisaKasbon) }}</span>
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
  width: 190mm;
  margin: 0 auto;
  padding: 10mm 10mm;
  font-family: Arial, sans-serif;
  font-size: 9.5pt;
  color: #000;
}
.header-row {
  display: flex;
  position: relative;
  margin-bottom: 15px;
}
.doc-title-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.doc-title {
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  margin-left: 100px;
}
.logo {
  position: absolute;
  right: 0;
  top: 0;
  height: 40px;
  object-fit: contain;
}
.info-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.info-col {
  width: 48%;
}
.info-row {
  display: flex;
  margin-bottom: 2px;
}
.lbl {
  width: 90px;
  font-weight: normal;
}
.sep {
  width: 10px;
}
.val {
  flex: 1;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid #000;
  border-bottom: 1px solid #000;
  margin-bottom: 2px;
}
.detail-table th,
.detail-table td {
  padding: 3px 4px;
}
.detail-table th {
  border-bottom: 1px solid #000;
  font-weight: normal;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.footer-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
}
.terbilang-col {
  width: 70%;
  padding: 4px;
}
.tot-lbl {
  text-align: right;
  width: 60px;
  padding: 4px;
}
.tot-sep {
  width: 10px;
  text-align: center;
}
.tot-val {
  text-align: right;
  width: 110px;
  padding: 4px;
}
.bottom-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 15px;
}
.ttd-area {
  display: flex;
  gap: 40px;
  width: 60%;
}
.ttd-col {
  text-align: center;
}
.ttd-title {
  margin-bottom: 40px;
}
.ttd-name {
  white-space: nowrap;
}
.summary-area {
  width: 30%;
}
.sum-row {
  display: flex;
  margin-bottom: 4px;
}
.sum-lbl {
  width: 80px;
}
.sum-sep {
  width: 10px;
}
.sum-val {
  flex: 1;
  text-align: right;
}
@media print {
  @page {
    size: A4;
    margin: 10mm;
  }
  .print-page {
    width: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
