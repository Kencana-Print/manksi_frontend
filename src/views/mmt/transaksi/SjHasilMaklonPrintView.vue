<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { sjHasilMaklonService } from "@/services/sjHasilMaklonService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = decodeURIComponent((route.params.nomor as string) || "");

const data = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

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

const waitForImages = () => {
  const imgs = Array.from(document.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if ((img as HTMLImageElement).complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve());
        img.addEventListener("error", () => resolve());
      });
    }),
  );
};

onMounted(async () => {
  try {
    const res = await sjHasilMaklonService.getPrintData(nomor);
    data.value = res.data?.data ?? res.data;
    isLoading.value = false;

    await nextTick();
    await waitForImages();
    setTimeout(() => window.print(), 350);
  } catch (error) {
    isError.value = true;
    isLoading.value = false;
  }
});
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
          <div>0271-740634 / 0271-740634</div>
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
            <th style="width: 75px" class="tr">Qty Diterima</th>
            <th style="width: 60px" class="tr">BS</th>
            <th style="width: 60px" class="tc">Satuan</th>
            <th style="width: 140px">No. LHK</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in data.details" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td>{{ d.sjmd_kode_jadi }} - {{ d.NamaJadi }}</td>
            <td class="tr font-weight-bold">{{ num(d.sjmd_qty_terima) }}</td>
            <td class="tr">{{ num(d.sjmd_qty_bs) }}</td>
            <td class="tc">{{ d.Satuan || "-" }}</td>
            <td class="mono">{{ d.LhkNomor || "-" }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-weight-bold" style="background: #f9f9f9">
            <td colspan="2" class="tr">TOTAL:</td>
            <td class="tr">{{ num(data.details.reduce((s: number, r: any) => s + Number(r.sjmd_qty_terima || 0), 0)) }}</td>
            <td class="tr">{{ num(data.details.reduce((s: number, r: any) => s + Number(r.sjmd_qty_bs || 0), 0)) }}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <div class="footer-note">
        DOKUMEN INI MENJADI BUKTI PENERIMAAN HASIL MAKLON DAN DASAR PENAMBAHAN STOCK ITEM DI ATAS.
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
  margin: 0 auto;
  box-sizing: border-box;
}

.print-container {
  width: 190mm;
  margin: 0 auto;
  background: white;
  border: 1px solid #1565c0;
  padding: 14px 18px;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  font-size: 10px;
  color: #000;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.company-info {
  font-size: 9.5px;
  line-height: 1.4;
}
.company-logo {
  max-height: 36px;
  width: auto;
  object-fit: contain;
}
.doc-title {
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  text-decoration: underline;
}

.info-table {
  border-collapse: collapse;
  font-size: 9.5px;
  margin-bottom: 10px;
  width: 100%;
}
.info-table td {
  padding: 2px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 140px;
  font-weight: 600;
}
.info-table .sep {
  width: 10px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5px;
  margin-bottom: 8px;
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
.font-weight-bold {
  font-weight: bold;
}

.footer-note {
  font-size: 8.5px;
  font-weight: bold;
  color: #c62828;
  margin-bottom: 14px;
}

.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}
.sign-col {
  flex: 1;
  text-align: center;
  font-size: 9.5px;
}
.sign-space {
  height: 40px;
}
.sign-name {
  font-weight: bold;
}

@media screen {
  body {
    background: #555;
    padding: 20px;
  }
  .print-container {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
