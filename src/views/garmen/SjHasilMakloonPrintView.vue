<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { sjHasilMakloonService } from "@/services/garmen/sjHasilMakloonService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = decodeURIComponent((route.params.nomor as string) || "");

const data = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

onMounted(async () => {
  try {
    const res = await sjHasilMakloonService.getPrintData(nomor);
    data.value = res.data.data;
    isLoading.value = false;

    await nextTick();

    const style = document.createElement("style");
    style.textContent = "@page { size: A4 portrait; margin: 12mm; }";
    document.head.appendChild(style);

    await waitForImages();
    window.print();
  } catch (error) {
    isError.value = true;
    isLoading.value = false;
  }
});

const waitForImages = () => {
  const imgs = Array.from(document.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // tetap lanjut walau 1 gambar gagal load
      });
    }),
  );
};

const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
const tglIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>
  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak SJ Hasil Maklon. Pastikan nomor benar.
  </div>

  <div v-else-if="data" class="print-wrapper">
    <div class="print-container">
      <div class="header-row">
        <div class="company-info">
          <div class="font-weight-bold">CV. Kencana Print</div>
          <div>Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali</div>
          <div>0271-740634/0271-740634</div>
        </div>
        <img :src="logoKP" alt="Logo" class="company-logo" />
      </div>

      <div class="doc-title">SURAT JALAN HASIL MAKLON</div>

      <table class="info-table">
        <tr>
          <td class="lbl">No. Maklon</td>
          <td class="sep">:</td>
          <td class="val">{{ data.header.sjm_mkl_nomor }}</td>
        </tr>
        <tr>
          <td class="lbl">No. Surat Jalan</td>
          <td class="sep">:</td>
          <td class="val">{{ data.header.sjm_nomor }}</td>
        </tr>
        <tr>
          <td class="lbl">Tanggal Terima</td>
          <td class="sep">:</td>
          <td class="val">{{ tglIndo(data.header.sjm_tanggal) }}</td>
        </tr>
        <tr>
          <td class="lbl">Gudang Asal (Proses)</td>
          <td class="sep">:</td>
          <td class="val">
            {{ data.header.mkl_cab_tujuan }} — {{ data.header.NamaCabTujuan }}
          </td>
        </tr>
        <tr>
          <td class="lbl">Gudang Penerima</td>
          <td class="sep">:</td>
          <td class="val">
            {{ data.header.sjm_cab_penerima }} — {{ data.header.NamaCabAsal }}
          </td>
        </tr>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th style="width: 28px">No.</th>
            <th>Item Barang Jadi</th>
            <th style="width: 70px">Qty Diterima</th>
            <th style="width: 60px">BS</th>
            <th style="width: 60px">Satuan</th>
            <th>No. LHK DTF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.details" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td>{{ d.sjmd_kode_jadi }} - {{ d.NamaJadi }}</td>
            <td class="tr">{{ num(d.sjmd_qty_terima) }}</td>
            <td class="tr">{{ num(d.sjmd_qty_bs) }}</td>
            <td class="tc">{{ d.Satuan }}</td>
            <td class="mono">{{ d.LhkNomor || "-" }}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        DOKUMEN INI MENJADI BUKTI PENERIMAAN HASIL MAKLON DAN DASAR PENAMBAHAN
        STOCK ITEM DI ATAS.
      </div>

      <div class="sign-row">
        <div class="sign-col">
          <div class="sign-lbl">Dibuat oleh,</div>
          <div class="sign-space"></div>
          <div class="sign-name">
            ( {{ data.header.sjm_user_create || "-" }} )
          </div>
        </div>
        <div class="sign-col">
          <div class="sign-lbl">Diterima oleh,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( &#160; )</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 16px;
}
.error-state {
  color: red;
}
.print-wrapper {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
}
.print-container {
  border: 2px solid #2e7d32;
  padding: 14px 18px;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  box-sizing: border-box;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.company-info {
  font-size: 10px;
  line-height: 1.4;
  color: #000;
}
.company-logo {
  max-height: 40px;
  width: auto;
  object-fit: contain;
}
.doc-title {
  font-size: 15px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}
.info-table {
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 10px;
  width: 100%;
}
.info-table td {
  padding: 2px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 130px;
  font-weight: 600;
}
.info-table .sep {
  width: 10px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 12px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.detail-table th {
  text-align: left;
  font-weight: bold;
  background: #f5f5f5;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
}
.footer-note {
  font-size: 10px;
  font-weight: bold;
  color: #2e7d32;
  margin-bottom: 14px;
}
.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.sign-col {
  flex: 1;
  text-align: center;
  font-size: 10px;
}
.sign-space {
  height: 34px;
}
.font-weight-bold {
  font-weight: bold;
}
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
