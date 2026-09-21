<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { maklonBarangService } from "@/services/garmen/maklonBarangService";
import { maklonBarangFormService } from "@/services/garmen/maklonBarangFormService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = String(route.params.nomor);
const sjkNomor = decodeURIComponent((route.params.sjkNomor as string) || "");

const isLoading = ref(true);
const isError = ref(false);
const sjData = ref<any>(null);
const refData = ref<any>(null);

const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
const tglIndoShort = (val: string) => {
  if (!val) return "-";
  const s = String(val).substring(0, 10);
  const [y, m, d] = s.split("-");
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
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
};
const tglIndoSlash = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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
    const [sjRes, refRes] = await Promise.all([
      maklonBarangFormService.getSjKeluarPrintData(sjkNomor),
      maklonBarangService.getPrintData(nomor),
    ]);
    sjData.value = sjRes.data.data;
    refData.value = refRes.data.data;
    isLoading.value = false;

    await nextTick();
    await waitForImages();
    setTimeout(() => window.print(), 300);
  } catch {
    isError.value = true;
    isLoading.value = false;
  }
});

const allGambar = (details: any[]) => {
  const result: any[] = [];
  for (const d of details || []) {
    for (const t of d.target_jadi || []) {
      for (const g of t.gambar || []) {
        result.push(g);
      }
    }
  }
  return result;
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>
  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak. Pastikan nomor benar.
  </div>

  <div v-else-if="sjData && refData" class="page">
    <!-- ── DOKUMEN 1: SJ MAKLON KELUAR ── -->
    <div class="doc-box">
      <div class="header-row">
        <div class="company-info">
          <div class="font-weight-bold">CV. Kencana Print</div>
          <div>Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali</div>
          <div>0271-740634/0271-740634</div>
        </div>
        <img :src="logoKP" alt="Logo" class="company-logo" />
      </div>

      <div class="doc-title">SURAT JALAN MAKLON</div>

      <table class="info-table">
        <tr>
          <td class="lbl">No. Maklon</td>
          <td class="sep">:</td>
          <td class="val">{{ sjData.header.sjk_mkl_nomor }}</td>
        </tr>
        <tr>
          <td class="lbl">No. Surat Jalan</td>
          <td class="sep">:</td>
          <td class="val">{{ sjData.header.sjk_nomor }}</td>
        </tr>
        <tr>
          <td class="lbl">Tanggal</td>
          <td class="sep">:</td>
          <td class="val">{{ tglIndoSlash(sjData.header.sjk_tanggal) }}</td>
        </tr>
        <tr>
          <td class="lbl">Gudang Asal</td>
          <td class="sep">:</td>
          <td class="val">
            {{ sjData.header.mkl_cab_asal }} — {{ sjData.header.NamaCabAsal }}
          </td>
        </tr>
        <tr>
          <td class="lbl">Gudang Tujuan</td>
          <td class="sep">:</td>
          <td class="val">
            {{ sjData.header.mkl_cab_tujuan }} —
            {{ sjData.header.NamaCabTujuan }}
          </td>
        </tr>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th style="width: 24px">No.</th>
            <th>Item Barang</th>
            <th style="width: 60px">Qty</th>
            <th style="width: 55px">Satuan</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in sjData.details" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td>{{ d.KodePolos }} - {{ d.NamaPolos }}</td>
            <td class="tr">{{ num(d.sjkd_qty_kirim) }}</td>
            <td class="tc">{{ d.Satuan }}</td>
            <td>{{ d.Keterangan || "-" }}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        DOKUMEN INI MENJADI BUKTI SERAH TERIMA DAN DASAR PENGURANGAN STOCK ITEM
        DI ATAS.
      </div>

      <div class="sign-row">
        <div class="sign-col">
          <div class="sign-lbl">Dibuat oleh,</div>
          <div class="sign-space"></div>
          <div class="sign-name">
            ( {{ sjData.header.sjk_user_create || "-" }} )
          </div>
        </div>
        <div class="sign-col">
          <div class="sign-lbl">Diterima oleh,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( &#160; )</div>
        </div>
      </div>
    </div>

    <!-- ── DOKUMEN 2: REFERENSI PRODUKSI ── -->
    <div class="doc-box mt-gap">
      <h1 class="title-ref">MAKLON BARANG</h1>

      <table class="info-table-ref">
        <tbody>
          <tr>
            <td class="w-label">No. Maklon</td>
            <td class="w-colon">:</td>
            <td>{{ refData.header.mkl_nomor }}</td>
          </tr>
          <tr>
            <td class="w-label">Tanggal</td>
            <td class="w-colon">:</td>
            <td>{{ tglIndoShort(refData.header.mkl_tanggal) }}</td>
          </tr>
          <tr>
            <td class="w-label">Deadline</td>
            <td class="w-colon">:</td>
            <td>
              {{
                refData.header.mkl_deadline
                  ? tglIndoShort(refData.header.mkl_deadline)
                  : "-"
              }}
            </td>
          </tr>
          <tr>
            <td class="w-label">Dikerjakan di</td>
            <td class="w-colon">:</td>
            <td>
              {{ refData.header.mkl_cab_tujuan }} —
              {{ refData.header.NamaCabTujuan }}
            </td>
          </tr>
          <tr>
            <td class="w-label">Kembali ke</td>
            <td class="w-colon">:</td>
            <td>
              {{ refData.header.mkl_cab_asal }} —
              {{ refData.header.NamaCabAsal }}
            </td>
          </tr>
          <tr>
            <td class="w-label align-top">Keterangan</td>
            <td class="w-colon align-top">:</td>
            <td>
              <pre class="val-pre">{{
                refData.header.mkl_keterangan || "-"
              }}</pre>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="ref-body">
        <div class="spk-list">
          <h2 class="spk-list-title">
            DETAIL BAHAN &amp; TARGET BARANG JADI :
          </h2>
          <div v-for="(d, di) in refData.details" :key="di" class="polos-block">
            <div class="polos-title">
              {{ d.mkld_kode_polos }} — {{ d.NamaPolos }}
              <span class="polos-qty"
                >({{ num(d.mkld_qty_kirim) }} {{ d.mkld_satuan_kirim }})</span
              >
            </div>
            <div v-for="(t, ti) in d.target_jadi" :key="ti" class="target-line">
              {{ t.mkldj_kode_jadi }} — {{ t.NamaJadi }} · Est.
              {{ num(t.mkldj_estimasi_qty) }} pcs
            </div>
          </div>
        </div>

        <div v-if="allGambar(refData.details).length" class="gambar-col">
          <div class="gambar-title">REFERENSI GAMBAR :</div>
          <div class="gambar-grid">
            <img
              v-for="(g, gi) in allGambar(refData.details)"
              :key="gi"
              :src="g.mklg_file_path"
              class="gambar-img"
            />
          </div>
        </div>
      </div>

      <div class="bottom-ttd-wrapper">
        <table class="ttd-table">
          <tr>
            <td width="50%">Dibuat Oleh,</td>
            <td width="50%">Diterima Oleh,</td>
          </tr>
          <tr>
            <td class="sign-space-simple"></td>
            <td class="sign-space-simple"></td>
          </tr>
          <tr>
            <td class="sign-name-static">
              {{ refData.header.mkl_user_create }}
            </td>
            <td class="sign-name-static">&#160;</td>
          </tr>
        </table>
      </div>

      <div class="footer-note-ref">
        Dokumen ini adalah referensi produksi — bukan bukti serah terima barang.
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

.page {
  page: mklpage;
}
@page mklpage {
  size: A4 portrait;
  margin: 10mm;
}

.doc-box {
  border: 2px solid #1565c0;
  padding: 10px 14px;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 10px;
  color: #000;
  box-sizing: border-box;
  max-width: 190mm;
  margin: 0 auto;
}
.mt-gap {
  margin-top: 6mm;
}

/* ── SJ ── */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 5px;
}
.company-info {
  font-size: 9.5px;
  line-height: 1.4;
  color: #000;
}
.company-logo {
  max-height: 32px;
  width: auto;
  object-fit: contain;
}
.doc-title {
  font-size: 13px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 6px;
}
.info-table {
  border-collapse: collapse;
  font-size: 9.5px;
  margin-bottom: 6px;
  width: 100%;
}
.info-table td {
  padding: 1.5px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 105px;
  font-weight: 600;
}
.info-table .sep {
  width: 10px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5px;
  margin-bottom: 6px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 3px 6px;
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
.footer-note {
  font-size: 9px;
  font-weight: bold;
  color: #c62828;
  margin-bottom: 8px;
}
.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.sign-col {
  flex: 1;
  text-align: center;
  font-size: 9.5px;
}
.sign-space {
  height: 24px;
}
.font-weight-bold {
  font-weight: bold;
}

/* ── Referensi Produksi ── */
.title-ref {
  font-size: 12px;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 6px 0;
}
.info-table-ref {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}
.info-table-ref td {
  padding: 1.5px 0;
  vertical-align: top;
  font-size: 9.5px;
}
.w-label {
  width: 95px;
}
.w-colon {
  width: 12px;
  text-align: center;
}
.align-top {
  vertical-align: top;
}
.val-pre {
  font-family: inherit;
  font-size: 9.5px;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.3;
}

.ref-body {
  display: flex;
  gap: 12px;
}
.spk-list {
  flex: 1.4;
  min-width: 0;
}
.spk-list-title {
  font-size: 10px;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 4px 0;
}
.polos-block {
  margin-bottom: 4px;
}
.polos-title {
  font-size: 9.5px;
  font-weight: bold;
  background: #f3e5f5;
  padding: 2px 6px;
  margin-bottom: 2px;
}
.polos-qty {
  font-weight: normal;
  color: #6a1b9a;
}
.target-line {
  font-size: 9px;
  padding: 1px 0 1px 8px;
}

.gambar-col {
  flex: 1;
  min-width: 0;
}
.gambar-title {
  font-size: 9.5px;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 4px;
}
.gambar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.gambar-img {
  width: 55px;
  height: 55px;
  object-fit: cover;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.bottom-ttd-wrapper {
  margin-top: 8px;
}
.ttd-table {
  width: 220px;
  border-collapse: collapse;
  text-align: center;
  font-size: 9px;
  border: 1px solid #000;
  color: #000;
}
.ttd-table td {
  border: 1px solid #000;
  padding: 3px;
  font-weight: bold;
  color: #000 !important;
}
.sign-space-simple {
  height: 26px;
}
.sign-name-static {
  font-size: 8.5px;
}
.footer-note-ref {
  font-size: 7.5px;
  color: #6a1b9a;
  margin-top: 4px;
}

@media screen {
  .page {
    background: #555;
    padding: 20px;
  }
  .doc-box {
    background: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
