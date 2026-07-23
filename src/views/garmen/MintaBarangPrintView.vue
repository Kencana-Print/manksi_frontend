<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { mintaBarangFormService } from "@/services/garmen/mintaBarangFormService";
import logoImg from "@/assets/logo.png";

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>(null);
const details = ref<any[]>([]);
const isLoading = ref(true);
const isError = ref(false);

const fetchData = async () => {
  try {
    const res = await mintaBarangFormService.getDetail(nomor);
    header.value = res.data.data.header;
    details.value = res.data.data.details || [];
    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    console.error(error);
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const docTitle = computed(() => `PERMINTAAN ${header.value?.min_jenis || ""}`);

const formatTglLong = (val: string) => {
  if (!val) return "-";
  const d = new Date(val);
  const bln = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${bln[d.getMonth()]} ${d.getFullYear()}`;
};

const num2 = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const hideImg = (e: Event) => {
  (e.target as HTMLImageElement).style.display = "none";
};

onMounted(() => {
  document.title = `Cetak Permintaan Barang - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div v-if="isLoading" class="pa-4 text-center">Memuat dokumen cetak...</div>
  <div v-else-if="isError" class="pa-4 text-center text-red">
    Gagal memuat data cetak. Pastikan nomor permintaan benar.
  </div>
  <div v-else class="print-container">
    <div v-for="copy in 2" :key="copy" class="print-block">
      <div class="head-row">
        <div class="doc-title">{{ docTitle }}</div>
        <img
          :src="logoImg"
          alt="Kencana Print"
          class="logo-img"
          @error="hideImg"
        />
      </div>

      <table class="info-table">
        <tr>
          <td class="lbl">No.Permintaan</td>
          <td class="sep">:</td>
          <td class="val">{{ header.min_nomor }}</td>
          <td class="lbl2">Cabang</td>
          <td class="sep">:</td>
          <td class="val">{{ header.min_cab }}</td>
        </tr>
        <tr>
          <td class="lbl">Tanggal</td>
          <td class="sep">:</td>
          <td class="val">{{ formatTglLong(header.min_tanggal) }}</td>
          <td class="lbl2">SPK</td>
          <td class="sep">:</td>
          <td class="val">{{ header.min_spk_nomor || "-" }}</td>
        </tr>
        <tr>
          <td class="lbl">Keterangan</td>
          <td class="sep">:</td>
          <td class="val">{{ header.min_ket || "-" }}</td>
          <td></td>
          <td></td>
          <td class="val-sub">{{ header.namaspk }}</td>
        </tr>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th style="width: 26px">No</th>
            <th style="width: 90px">Kode</th>
            <th>Nama</th>
            <th style="width: 45px">Satuan</th>
            <th style="width: 65px">Jumlah</th>
            <th style="width: 140px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in details" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td>{{ d.kode }}</td>
            <td>{{ d.nama }}</td>
            <td class="tc">{{ d.satuan }}</td>
            <td class="tr">{{ num2(d.jumlah) }}</td>
            <td>{{ d.ket }}</td>
          </tr>
          <tr v-if="details.length === 0">
            <td colspan="6" class="empty-td">Tidak ada rincian barang.</td>
          </tr>
        </tbody>
      </table>

      <div class="spacer"></div>

      <table class="sig-table">
        <tr>
          <td style="width: 33.3%">Pemohon,</td>
          <td style="width: 33.3%">Menyetujui,</td>
          <td style="width: 33.3%">Mengetahui,</td>
        </tr>
        <tr>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
        </tr>
        <tr>
          <td>
            ( <span class="u-name">{{ header.user_create }}</span> )
          </td>
          <td>
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )
            <div class="atasan-lbl">Atasan</div>
          </td>
          <td>
            (
            <span class="u-name"
              >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
            >
            )
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 10mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
.pa-4 {
  padding: 1rem;
}
.text-center {
  text-align: center;
}
.text-red {
  color: red;
}
.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #000;
  background: white;
}
.print-block {
  padding: 6mm 0;
}
.print-block:first-child {
  border-bottom: 1px dashed #999;
  padding-bottom: 10mm;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.doc-title {
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
}
.logo-img {
  max-width: 90px;
  max-height: 32px;
  object-fit: contain;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 11px;
}
.info-table td {
  padding: 1px 4px 1px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 85px;
}
.info-table .lbl2 {
  width: 55px;
}
.info-table .sep {
  width: 10px;
}
.info-table .val-sub {
  padding-left: 4px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  font-size: 10.5px;
}
.detail-table th {
  border-bottom: 1px solid #000;
  padding: 3px 5px;
  text-align: left;
  font-weight: bold;
}
.detail-table td {
  padding: 2px 5px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #757575;
  font-style: italic;
  padding: 10px !important;
}

.spacer {
  height: 40px;
}

.sig-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  font-size: 11px;
}
.sig-space {
  height: 40px;
}
.u-name {
  display: inline-block;
  min-width: 60px;
}
.atasan-lbl {
  font-size: 9.5px;
  margin-top: -2px;
}
</style>
