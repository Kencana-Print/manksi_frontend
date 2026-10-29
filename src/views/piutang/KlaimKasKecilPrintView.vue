<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  klaimKasKecilFormService as svc,
  type KlaimPrint,
} from "@/services/piutang/klaimKasKecilFormService";
import { formatTanggal } from "@/utils/dateFormat";
import { terbilang } from "@/utils/terbilang";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const data = ref<KlaimPrint | null>(null);
const isLoading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    const nomor = decodeURIComponent(String(route.params.nomor ?? ""));
    const res = await svc.getPrintData(nomor);
    data.value = res.data.data;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    error.value = pesanError(e, "Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
});

const fmt = (v: number): string =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v || 0);

const total = computed<number>(() =>
  (data.value?.detail ?? []).reduce((s, d) => s + (Number(d.nominal) || 0), 0),
);
</script>

<template>
  <div v-if="isLoading" class="loading">Memuat data cetak...</div>
  <div v-else-if="error" class="loading">{{ error }}</div>
  <div v-else-if="data" class="print-page">
    <div class="header-row">
      <div class="doc-title-wrapper">
        <div class="doc-title">KLAIM KAS KECIL</div>
      </div>
      <img :src="logoUrl" alt="Logo" class="logo" />
    </div>

    <div class="info-grid">
      <div class="info-row">
        <span class="lbl">Nomor</span><span class="sep">:</span>
        <span class="val">{{ data.nomor }}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Tanggal</span><span class="sep">:</span>
        <span class="val">{{ formatTanggal(data.tanggal) }}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Cabang</span><span class="sep">:</span>
        <span class="val">{{ data.cabang }}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Rek. Tujuan</span><span class="sep">:</span>
        <span class="val"
          >{{ data.rekTujuan.kode }} - {{ data.rekTujuan.nama }}</span
        >
      </div>
      <div v-if="data.rekTujuan.rekening" class="info-row">
        <span class="lbl">No. Rekening</span><span class="sep">:</span>
        <span class="val">{{ data.rekTujuan.rekening }}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Keterangan</span><span class="sep">:</span>
        <span class="val">{{ data.keterangan || "-" }}</span>
      </div>
    </div>

    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 28px">No</th>
          <th style="width: 118px">No. BKK</th>
          <th style="width: 66px">Tanggal</th>
          <th>Uraian</th>
          <th style="width: 90px; text-align: right">Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in data.detail" :key="d.no">
          <td class="tc">{{ d.no }}</td>
          <td>{{ d.bkk }}</td>
          <td class="tc">{{ formatTanggal(d.tanggal) }}</td>
          <td>
            {{ d.uraian }}
            <div v-if="d.manual" class="sub-manual">
              Akun: {{ d.akun }}<br />CC: {{ d.costCenter }}
            </div>
          </td>
          <td class="tr">{{ fmt(d.nominal) }}</td>
        </tr>
        <tr v-if="!data.detail.length">
          <td colspan="5" class="tc empty">Tidak ada detail</td>
        </tr>
        <tr>
          <td colspan="4" class="terbilang-cell">
            Terbilang: {{ terbilang(total) }} RUPIAH
          </td>
          <td></td>
        </tr>
        <tr>
          <td colspan="4" class="tot-lbl">Total :</td>
          <td class="tot-val">{{ fmt(total) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="ttd-area">
      <div class="ttd-col">
        <div class="ttd-title">Diterima Oleh</div>
        <div class="ttd-name">(<span class="blank"></span>)</div>
      </div>
      <div class="ttd-col">
        <div class="ttd-title">Kasir</div>
        <div class="ttd-name">( {{ data.kasir || "&nbsp;" }} )</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
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
  margin-bottom: 10px;
}
.info-row {
  display: flex;
  margin-bottom: 3px;
}
.lbl {
  width: 82px;
  flex-shrink: 0;
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
  margin-bottom: 18px;
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
.empty {
  color: #999;
  font-style: italic;
}
.sub-manual {
  font-size: 7.5pt;
  color: #444;
}
.terbilang-cell {
  font-style: italic;
  border-right: none;
}
.terbilang-cell + td {
  border-left: none;
}
.tot-lbl,
.tot-val {
  text-align: right;
  font-weight: bold;
}
.ttd-area {
  display: flex;
  justify-content: space-around;
  margin-top: 14px;
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
.blank {
  display: inline-block;
  width: 80px;
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
