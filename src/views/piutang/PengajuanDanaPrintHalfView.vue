<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { pengajuanDanaFormService } from "@/services/piutang/pengajuanDanaFormService";

const route = useRoute();
const nomorParam = String(route.params.nomor);

const dataPO = ref<any>(null);
const isLoading = ref(true);

const TOTAL_ROWS = 15;

const formatTanggalPendek = (dateStr: string) => {
  if (!dateStr) return "";
  const ymd = dateStr.substring(0, 10).split("-");
  if (ymd.length === 3) return `${ymd[2]}-${ymd[1]}-${ymd[0]}`;
  return dateStr;
};

const formatNum = (n: number) => Number(n || 0).toLocaleString("id-ID");

onMounted(async () => {
  try {
    const res = await pengajuanDanaFormService.getFormDetail(nomorParam);
    const d = res.data.data;
    const h = d.header;

    const rows = (d.items || []).map((r: any) => ({
      nama: r.Nama,
      kegunaan: r.Kegunaan,
      deadline: r.Deadline,
      qty: Number(r.Qty) || 0,
      nominal: Number(r.Nilai) || 0,
      total: Number(r.Total) || 0,
    }));

    while (rows.length < TOTAL_ROWS) {
      rows.push({
        nama: "",
        kegunaan: "",
        deadline: "",
        qty: 0,
        nominal: 0,
        total: 0,
      });
    }

    dataPO.value = { header: h, items: rows };

    setTimeout(() => window.print(), 500);
  } catch (error) {
    console.error("Gagal memuat data cetak", error);
  } finally {
    isLoading.value = false;
  }
});

const grandTotal = computed(
  () => dataPO.value?.items.reduce((s: number, r: any) => s + r.total, 0) || 0,
);
</script>

<template>
  <div v-if="isLoading" class="loading-screen">Memuat Dokumen Cetak...</div>

  <div v-else class="print-page">
    <h2 class="doc-title">FORMULIR PENGAJUAN DANA</h2>

    <table class="info-table">
      <tr>
        <td width="70">No.Pengajuan</td>
        <td width="8">:</td>
        <td>{{ dataPO.header.Nomor }}</td>
        <td width="70">Nama</td>
        <td width="8">:</td>
        <td>{{ dataPO.header.Nama }}</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>:</td>
        <td>{{ formatTanggalPendek(dataPO.header.Tanggal) }}</td>
        <td>Lokasi</td>
        <td>:</td>
        <td>{{ dataPO.header.Lokasi }}</td>
      </tr>
      <tr>
        <td>Keterangan</td>
        <td>:</td>
        <td colspan="4">{{ dataPO.header.Keterangan }}</td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th width="20">No</th>
          <th>Nama (Kegunaan)</th>
          <th width="45">Deadline</th>
          <th width="32">Qty</th>
          <th width="60">Nominal</th>
          <th width="60">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in dataPO.items" :key="index">
          <td class="tc">{{ Number(index) + 1 }}</td>
          <td class="nama-cell">
            <template v-if="item.nama">
              {{ item.nama
              }}<span v-if="item.kegunaan"> ({{ item.kegunaan }})</span>
            </template>
          </td>
          <td class="tc">
            {{ item.deadline ? formatTanggalPendek(item.deadline) : "" }}
          </td>
          <td class="tr">{{ item.qty ? formatNum(item.qty) : "" }}</td>
          <td class="tr">{{ item.nominal ? formatNum(item.nominal) : "0" }}</td>
          <td class="tr">{{ formatNum(item.total) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="tr fw">Total</td>
          <td class="tr fw">{{ formatNum(grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>

    <table class="sig-table">
      <tr>
        <td class="sig-cell">Diajukan Oleh,</td>
        <td class="sig-cell">Disetujui Oleh,</td>
      </tr>
      <tr>
        <td class="sig-space"></td>
        <td class="sig-space"></td>
      </tr>
      <tr>
        <td class="sig-cell fw">{{ dataPO.header.Nama }}</td>
        <td class="sig-cell">( Atasan )</td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm 5mm;
  }
  body {
    background: white;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}

.loading-screen {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
  font-size: 14px;
  color: #555;
}
.print-page {
  font-family: "Arial", sans-serif;
  font-size: 9px;
  color: #000;
  line-height: 1.3;
  background: white;
  width: 143.5mm;
  box-sizing: border-box;
  padding: 0 4mm;
}

.doc-title {
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 6px 0;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: inherit;
  margin-bottom: 6px;
}
.info-table td {
  padding: 1.5px 4px;
  vertical-align: top;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6px;
}
.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 1.5px 4px;
  font-size: inherit;
}
.items-table th {
  text-align: center;
  font-weight: bold;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: bold;
}
.nama-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sig-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.sig-table .sig-cell {
  border: 1px solid #000;
  padding: 4px;
  text-align: center;
  font-size: inherit;
  width: 50%;
}
.sig-table .sig-space {
  border: 1px solid #000;
  border-top: none;
  border-bottom: none;
  height: 25px;
}
</style>
