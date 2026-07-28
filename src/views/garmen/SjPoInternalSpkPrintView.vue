<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { sjPoInternalSpkFormService } from "@/services/garmen/sjPoInternalSpkFormService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = decodeURIComponent((route.params.nomor as string) || "");

const data = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

onMounted(async () => {
  try {
    const res = await sjPoInternalSpkFormService.getPrintData(nomor);
    data.value = res.data.data;
    isLoading.value = false;

    // ✅ FIX: tunggu DOM beneran ke-render (nextTick) + 2 frame
    // tambahan biar layout/logo final ke-paint, sebelum trigger print.
    // Tanpa ini, dialog print browser sempat ambil snapshot halaman
    // masih kosong (Vue render itu async, gak instan).
    await nextTick();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

    const style = document.createElement("style");
    style.textContent = "@page { size: A4 portrait; margin: 10mm; }";
    document.head.appendChild(style);
    window.print();
  } catch (error) {
    isError.value = true;
    isLoading.value = false;
  }
});

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
    Gagal memuat data cetak Surat Jalan PO Internal. Pastikan nomor benar.
  </div>

  <div v-else-if="data" class="print-wrapper">
    <div class="print-container">
      <template v-for="copyIdx in 2" :key="copyIdx">
        <div class="sj-copy">
          <div class="header-row">
            <div class="company-info">
              <div class="font-weight-bold">CV. Kencana Print</div>
              <div>Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali</div>
              <div>0271-740634/0271-740634</div>
            </div>
            <img :src="logoKP" alt="Logo" class="company-logo" />
          </div>

          <div class="doc-title">Surat Jalan PO Internal</div>

          <div class="body-row">
            <div class="left-col">
              <table class="info-table">
                <tr>
                  <td class="lbl">Nomor</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.Nomor }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td class="sep">:</td>
                  <td class="val">{{ tglIndo(data.header.Tanggal) }}</td>
                </tr>
                <tr v-if="data.header.Keterangan">
                  <td class="lbl">Keterangan</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.Keterangan }}</td>
                </tr>
              </table>

              <table class="info-table mt-2">
                <tr>
                  <td class="lbl">Jasa</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.JasaNama }}</td>
                </tr>
                <tr>
                  <td class="lbl">Cabang</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.NamaCab }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tujuan</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.NamaTujuan }}</td>
                </tr>
              </table>
            </div>

            <div class="right-col">
              <div class="spk-info">
                <div class="spk-row">
                  <span class="spk-lbl">No.SPK</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.NomorSPK }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Nama SPK</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.NamaSpk }}</span>
                </div>
                <div class="spk-row mt-1">
                  <span class="spk-lbl">Jumlah</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ num(data.header.JumlahSpk) }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Bahan</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.Bahan }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Ukuran</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.Ukuran }}</span>
                </div>
              </div>
            </div>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 24px">No</th>
                <th>Nama</th>
                <th style="width: 65px">Size</th>
                <th style="width: 65px" class="tr">Jumlah</th>
                <th style="width: 45px" class="tr">Bs</th>
                <th style="width: 65px" class="tr">Bs.Sablon</th>
                <th style="width: 55px" class="tr">Bs.Kain</th>
                <th style="width: 45px" class="tr">Koli</th>
                <th style="width: 130px">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in data.detail" :key="idx">
                <td class="tc">{{ Number(idx) + 1 }}</td>
                <td>{{ d.Nama }}</td>
                <td class="tc">{{ d.Size || "-" }}</td>
                <td class="tr">{{ num(d.Jumlah) }}</td>
                <td class="tr">{{ num(d.BsLini) }}</td>
                <td class="tr">{{ num(d.BsSablon) }}</td>
                <td class="tr">{{ num(d.BsKain) }}</td>
                <td class="tr">{{ num(d.Koli) }}</td>
                <td>{{ d.Keterangan }}</td>
              </tr>
            </tbody>
          </table>

          <div class="sign-row">
            <div class="sign-col">
              <div class="sign-lbl">Dibuat oleh,</div>
              <div class="sign-space"></div>
              <div class="sign-name">( {{ data.header.Usr || "-" }} )</div>
            </div>
            <div class="sign-col">
              <div class="sign-lbl">Disiapkan oleh,</div>
              <div class="sign-space"></div>
              <div class="sign-name">( &#160; )</div>
            </div>
            <div class="sign-col">
              <div class="sign-lbl">Kepala gudang,</div>
              <div class="sign-space"></div>
              <div class="sign-name">( &#160; )</div>
            </div>
            <div class="sign-col">
              <div class="sign-lbl">Pengantar,</div>
              <div class="sign-space"></div>
              <div class="sign-name">( &#160; )</div>
            </div>
            <div class="sign-col">
              <div class="sign-lbl">Diterima oleh,</div>
              <div class="sign-space"></div>
              <div class="sign-name">( &#160; )</div>
            </div>
          </div>
        </div>

        <div v-if="copyIdx === 1" class="copy-divider"></div>
      </template>
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
  border: 2px solid #eca100;
  padding: 14px 18px;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  box-sizing: border-box;
}

.sj-copy {
  padding: 6px 0;
}
.copy-divider {
  border-top: 1px solid #000;
  margin: 8px 0;
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
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 6px;
}

.body-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 8px;
}
.left-col {
  flex: 1;
  min-width: 0;
}
.right-col {
  width: 260px;
  flex-shrink: 0;
}

.info-table {
  border-collapse: collapse;
  font-size: 10px;
}
.info-table.mt-2 {
  margin-top: 8px;
}
.info-table td {
  padding: 1px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 68px;
  font-weight: 600;
}
.info-table .sep {
  width: 10px;
}
.info-table .val {
  color: #000;
}

.spk-info {
  font-size: 10px;
  line-height: 1.5;
}
.spk-row {
  display: flex;
  gap: 4px;
}
.spk-lbl {
  width: 62px;
  flex-shrink: 0;
}
.spk-val {
  flex: 1;
}
.mt-1 {
  margin-top: 5px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 3px 5px;
}
.detail-table th {
  text-align: left;
  font-weight: bold;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 4px;
}
.sign-col {
  flex: 1;
  text-align: center;
  font-size: 9.5px;
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
