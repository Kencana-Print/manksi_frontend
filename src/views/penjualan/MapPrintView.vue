<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const rawData = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

const printNomor = route.params.nomor as string;
// Ambil parameter layout dari URL (default vertikal)
const layoutMode = (route.query.layout as string) || "vertikal";

// 1. Fungsi Normalisasi Data
const getVal = (key: string) => {
  if (!rawData.value) return "";
  // Cari key yang cocok tanpa mempedulikan huruf besar/kecil
  const foundKey = Object.keys(rawData.value).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return foundKey ? rawData.value[foundKey] : "";
};

onMounted(async () => {
  try {
    const res = await api.get(
      `/penjualan/map-form/print/${encodeURIComponent(printNomor)}`,
    );
    rawData.value = res.data.data;

    setTimeout(() => {
      // Set page size sebelum print
      if (layoutMode === "horizontal") {
        const style = document.createElement("style");
        style.textContent = "@page { size: A4 landscape; margin: 10mm; }";
        document.head.appendChild(style);
      } else {
        const style = document.createElement("style");
        style.textContent = "@page { size: A4 portrait; margin: 10mm; }";
        document.head.appendChild(style);
      }
      window.print();
    }, 800);
  } catch (error: any) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
});

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

// URL Builder Utama
const mainImageUrl = computed(() => {
  if (!rawData.value) return "";
  const nomor = getVal("mspk_nomor");
  const cab = getVal("mspk_cab") || "HO-";
  const base = getBaseUrl();
  // Prioritas: backend lokal dulu
  return `${base}/images/${cab}/map/${encodeURIComponent(nomor)}.jpg`;
});

// Handler Fallback jika gambar gagal dimuat
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (img.dataset.tried === "true") {
    img.style.display = "none";
    return;
  }
  img.dataset.tried = "true";

  // Fallback 1: VPS folder map
  const nomor = getVal("mspk_nomor");
  const mhNomor = getVal("mspk_mh_nomor");

  if (!img.src.includes("8888")) {
    img.src = `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(nomor)}.jpg`;
  } else if (mhNomor && !img.src.includes("mintaharga")) {
    // Fallback 2: VPS mintaharga
    img.src = `http://103.94.238.252:8888/file-gambar/mintaharga/${encodeURIComponent(mhNomor)}.jpg`;
  } else {
    img.style.display = "none";
  }
};

// Gambar Tanda Tangan
const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  const cleanName = kodeUser.trim().toUpperCase();
  // Karena ttd ada di root \image, kita arahkan ke root /file-gambar/
  return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(cleanName)}.jpg`;
};

const tglIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (d.getFullYear() <= 1900) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>

  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak MAP. Pastikan nomor benar.
  </div>

  <div v-else-if="rawData" class="print-container" :class="[layoutMode]">
    <table class="outer-table">
      <tbody>
        <tr>
          <td class="left-panel">
            <h2 class="form-title">MEMO APPROVAL PRODUK</h2>

            <table class="info-table">
              <tr>
                <td class="lbl">Nomor Memo</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ getVal("mspk_nomor") }}
                  <span
                    v-if="
                      getVal('mspk_statuskerja') &&
                      getVal('mspk_statuskerja') !== 'Normal'
                    "
                    class="status-kerja"
                    >{{ getVal("mspk_statuskerja") }}</span
                  >
                </td>
              </tr>
              <tr>
                <td class="lbl">Tanggal</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ tglIndo(getVal("mspk_tanggal")) }}
                  <span style="float: right"
                    >Nomer PO: {{ getVal("mspk_nomor_po") || "-" }}</span
                  >
                </td>
              </tr>
              <tr>
                <td class="lbl">Jenis Order</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("jo_nama") }}</td>
              </tr>
              <tr>
                <td class="lbl">Nama Desain</td>
                <td class="sep">:</td>
                <td class="val font-weight-bold">{{ getVal("mspk_nama") }}</td>
              </tr>
              <tr>
                <td class="lbl">Jumlah</td>
                <td class="sep">:</td>
                <td class="val">
                  {{
                    new Intl.NumberFormat("id-ID").format(
                      getVal("mspk_jumlah") || 0,
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Ukuran</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ getVal("mspk_ukuran") || getVal("mspk_rencana_size") }}
                </td>
              </tr>
              <tr v-if="getVal('mspk_gramasi')">
                <td class="lbl">Gramasi</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("mspk_gramasi") }}</td>
              </tr>
              <tr>
                <td class="lbl">Kain</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("mspk_kain") }}</td>
              </tr>
              <tr>
                <td class="lbl">Finishing</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("mspk_finishing") }}</td>
              </tr>
              <tr>
                <td class="lbl">Date Line</td>
                <td class="sep">:</td>
                <td class="val">{{ tglIndo(getVal("mspk_dateline")) }}</td>
              </tr>
              <tr>
                <td class="lbl">Rencana Order</td>
                <td class="sep">:</td>
                <td class="val">
                  {{
                    new Intl.NumberFormat("id-ID").format(
                      getVal("mspk_rencana_order") || 0,
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Workshop</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ getVal("mspk_cab") }} ( {{ getVal("mspk_workshop") }} )
                </td>
              </tr>
              <tr>
                <td class="lbl">Status client</td>
                <td class="sep">:</td>
                <td class="val">
                  <span class="highlight-yellow">{{
                    getVal("cus_perfect") === "Y" ? "PERFECT" : "REGULER"
                  }}</span>
                </td>
              </tr>
            </table>

            <div v-if="layoutMode === 'vertikal'" class="bottom-left-content">
              <div class="image-area">
                <img :src="mainImageUrl" alt="" @error="handleImageError" />
              </div>
              <div class="details-area">
                <div v-if="getVal('ketkomponen')" class="komponen-box">
                  <div class="box-title">Keterangan Komponen :</div>
                  <pre>{{ getVal("ketkomponen") }}</pre>
                </div>
                <div v-if="getVal('size_detail')" class="size-box mt-2">
                  <div class="box-title">Size : LEBAR & PANJANG BADAN</div>
                  <pre>{{ getVal("size_detail") }}</pre>
                </div>
              </div>
            </div>

            <div v-if="layoutMode === 'horizontal'" class="horizontal-details">
              <div v-if="getVal('ketkomponen')" class="komponen-box w-50">
                <div class="box-title">Keterangan Komponen :</div>
                <pre>{{ getVal("ketkomponen") }}</pre>
              </div>
              <div v-if="getVal('size_detail')" class="size-box w-50 pl-2">
                <div class="box-title">Size : LEBAR & PANJANG BADAN</div>
                <pre>{{ getVal("size_detail") }}</pre>
              </div>
            </div>

            <table class="ttd-table">
              <tr>
                <td class="ttd-box">
                  <div class="ttd-title">MO</div>
                  <img
                    :src="getSignatureUrl(getVal('user_create'))"
                    class="ttd-img"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).style.opacity = '0')
                    "
                  />
                  <div class="ttd-name">{{ getVal("user_create") }}</div>
                </td>
                <td class="ttd-box">
                  <div class="ttd-title">CMO</div>
                  <img
                    :src="getSignatureUrl(getVal('mspk_cmo'))"
                    class="ttd-img"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).style.opacity = '0')
                    "
                  />
                  <div class="ttd-name">{{ getVal("mspk_cmo") || "-" }}</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="ttd-footer">
                  Dibuat Oleh: {{ getVal("sal_nama") }}
                  {{
                    getVal("created_formatted")
                      ? getVal("created_formatted").substring(0, 11)
                      : ""
                  }}
                </td>
              </tr>
            </table>

            <div class="footer-note">
              Note : SETIAP MEMO WAJIB MEMBUAT 2 ALTERNATIF<br />PRINTING DALAM
              POTONGAN KAIN.
            </div>
          </td>

          <td class="right-panel">
            <div class="catatan-wrap">
              <div class="lbl">Catatan :</div>
              <div class="val">
                <span
                  v-if="getVal('mspk_revisi') === 'Y'"
                  class="font-weight-bold"
                >
                  Memo {{ getVal("mspk_nomor") }} = PERMAK SAJA tidak usah buat
                  BARU !!<br /><br />
                </span>
                <pre class="catatan-text">{{ getVal("mspk_keterangan") }}</pre>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="layoutMode === 'horizontal'" class="horizontal-image-container">
      <img
        :src="mainImageUrl"
        alt=""
        class="img-horizontal"
        @error="handleImageError"
      />
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

.print-container {
  width: 100%;
  margin: 0 auto;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  padding: 10px;
  box-sizing: border-box;
}

.print-container.vertikal {
  max-width: 210mm;
}
.print-container.horizontal {
  max-width: 297mm;
}

.outer-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
}

.outer-table > tbody > tr > td {
  border: 1px solid #000;
  vertical-align: top;
  padding: 8px;
}

.left-panel {
  width: 50%;
}
.right-panel {
  width: 50%;
}

.form-title {
  text-decoration: underline;
  font-size: 13px;
  font-weight: bold;
  margin: 0 0 12px 0;
  text-transform: uppercase;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 12px;
}
.info-table td {
  padding: 3px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 90px;
}
.info-table .sep {
  width: 10px;
  text-align: center;
}

.font-weight-bold {
  font-weight: bold;
}
.status-kerja {
  color: red;
  font-weight: bold;
  margin-left: 10px;
  text-transform: uppercase;
}
.highlight-yellow {
  background-color: yellow;
  padding: 2px 4px;
  font-weight: bold;
  border: 1px solid #000;
}

.bottom-left-content {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.image-area {
  width: 130px;
  flex-shrink: 0;
}
.image-area img {
  width: 100%;
  object-fit: contain;
}
.details-area {
  flex: 1;
  font-size: 9px;
  line-height: 1.3;
}

.horizontal-details {
  display: flex;
  font-size: 9px;
  line-height: 1.3;
  margin-bottom: 10px;
  border-bottom: 1px dashed #ccc;
  padding-bottom: 10px;
}
.w-50 {
  width: 50%;
}
.pl-2 {
  padding-left: 8px;
}

.horizontal-image-container {
  margin-top: 5px;
  text-align: center;
  border: 1px solid #000;
  border-top: none;
  padding: 5px;
}
.img-horizontal {
  max-width: 100%;
  max-height: 380px;
  object-fit: contain;
}

pre {
  font-family: inherit;
  font-size: 9px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 2px 0 0 0;
  line-height: 1.2;
}
.box-title {
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 3px;
  font-size: 9px;
}
.mt-2 {
  margin-top: 8px;
}

.ttd-table {
  width: 180px;
  border-collapse: collapse;
  text-align: center;
  margin-left: auto;
  border: 1px solid #000;
  margin-bottom: 10px;
}
.ttd-box {
  border: 1px solid #000;
  width: 50%;
  padding: 2px;
}
.ttd-img {
  height: 40px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
.ttd-title,
.ttd-name {
  font-size: 10px;
  font-weight: bold;
}
.ttd-footer {
  font-size: 9px;
  text-align: left;
  padding: 2px 4px;
  border-top: 1px solid #000;
}

.footer-note {
  font-size: 9px;
  font-weight: bold;
  margin-top: 5px;
  font-style: italic;
}

.catatan-wrap {
  display: flex;
  font-size: 10px;
  line-height: 1.4;
}
.catatan-wrap .lbl {
  width: 55px;
  font-weight: bold;
}
.catatan-wrap .val {
  flex: 1;
}
.catatan-text {
  font-family: inherit;
  font-size: 10px;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.4;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<style>
/* @page dikontrol via JS di onMounted — tidak ada di sini */
</style>
