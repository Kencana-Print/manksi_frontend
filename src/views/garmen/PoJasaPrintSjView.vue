<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const nomor = (route.params.nomor || route.query.nomor) as string;

const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

const fmt = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const fmtDate = (s: string) => {
  if (!s) return "-";
  const d = new Date(s);
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
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const komponen = (detail: any[]) =>
  (detail || []).filter((r) => r.pojd_statuspotong !== 1);

onMounted(async () => {
  try {
    const res = await api.get(
      `/garmen/po-jasa/cetak/${encodeURIComponent(nomor)}`,
    );
    const d = res.data.data;
    if (d.pojh_jasa_kode === "J08" && Number(d.pojh_cetak) !== 1) {
      error.value = "PO ini belum di approve, tidak dapat dicetak.";
      isLoading.value = false;
      return;
    }
    data.value = d;
    isLoading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message || "Gagal memuat data cetak.";
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="state">Memuat data cetak...</div>
  <div v-else-if="error" class="state err">{{ error }}</div>

  <div v-else-if="data" class="page">
    <div class="judul">LEMBAR SERAH TERIMA BARANG</div>

    <div class="info-wrap">
      <table class="itbl">
        <tr>
          <td class="lbl">Nomor</td>
          <td class="sep">:</td>
          <td>{{ data.pojh_nomor }}</td>
        </tr>
        <tr>
          <td class="lbl">Tanggal</td>
          <td class="sep">:</td>
          <td>{{ fmtDate(data.pojh_tanggal) }}</td>
        </tr>
        <tr>
          <td class="lbl">No. SPK</td>
          <td class="sep">:</td>
          <td>{{ data.pojh_spk_nomor }}</td>
        </tr>
      </table>
      <table class="itbl">
        <tr>
          <td class="lbl">Dari</td>
          <td class="sep">:</td>
          <td>{{ data.comp_nama || "Kencana Print" }}</td>
        </tr>
        <tr>
          <td class="lbl">Kepada</td>
          <td class="sep">:</td>
          <td class="sup-n">{{ data.sup_nama }}</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td class="sup-a">{{ data.sup_alamat }} {{ data.sup_kota }}</td>
        </tr>
      </table>
    </div>

    <table class="dtbl">
      <thead>
        <tr>
          <th class="c-no">No</th>
          <th class="c-nama">Nama Barang</th>
          <th class="c-qty">Qty</th>
          <th class="c-sat">Satuan</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in komponen(data.detail)" :key="i">
          <td class="tc">{{ i + 1 }} .</td>
          <td>{{ r.bhn_name }}</td>
          <td class="tr">{{ fmt(r.pojd_jumlah) }}</td>
          <td>{{ r.pojd_bhn_satuan }}</td>
        </tr>
      </tbody>
    </table>

    <table class="ttd-tbl">
      <tr>
        <td>Hormat Kami,</td>
        <td>Penerima,</td>
        <td>Adm Logistik,</td>
        <td>Adm Produksi,</td>
      </tr>
      <tr class="ttd-space">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>(________________)</td>
        <td>(________________)</td>
        <td>(________________)</td>
        <td>(________________)</td>
      </tr>
    </table>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: Arial, sans-serif;
  font-size: 9pt;
  background: white;
  color: #000;
}
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #555;
}
.err {
  color: #c62828;
}
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 15mm;
  margin: 0 auto;
}

.judul {
  text-align: center;
  font-size: 11pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 6mm;
  letter-spacing: 1px;
}
.info-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  margin-bottom: 4mm;
}
.itbl {
  border-collapse: collapse;
  font-size: 9pt;
  width: 100%;
}
.itbl td {
  padding: 0.5mm 1mm;
  vertical-align: top;
}
.lbl {
  white-space: nowrap;
  min-width: 50px;
}
.sep {
  padding: 0 2mm;
  width: 5px;
}
.sup-n {
  font-weight: bold;
  text-transform: uppercase;
}
.sup-a {
  text-transform: uppercase;
  font-size: 8.5pt;
}

.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 8mm;
  border: 1px solid black;
}
.dtbl th {
  border: 1px solid black;
  padding: 1.5mm 2mm;
  font-weight: bold;
  text-align: left;
}
.dtbl td {
  border: 1px solid black;
  padding: 1.2mm 2mm;
}
.c-no {
  width: 12mm;
}
.c-qty {
  width: 25mm;
  text-align: right;
}
.c-sat {
  width: 25mm;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.ttd-tbl {
  width: 75%;
  border-collapse: collapse;
  border: 1px solid black;
  font-size: 9pt;
}
.ttd-tbl td {
  border: 1px solid black;
  padding: 2mm 3mm;
  width: 25%;
  text-align: center;
}
.ttd-space td {
  height: 20mm;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    margin: 0;
  }
  .page {
    page-break-inside: avoid;
  }
}
</style>
