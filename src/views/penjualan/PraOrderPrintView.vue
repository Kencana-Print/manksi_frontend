<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const rawData = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);
const imageLoaded = ref(false);

const printNomor = route.params.nomor as string;

const getVal = (key: string) => {
  if (!rawData.value) return "";
  const foundKey = Object.keys(rawData.value).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return foundKey ? rawData.value[foundKey] : "";
};

const waitForImage = () => {
  return new Promise<void>((resolve) => {
    if (imageLoaded.value) {
      resolve();
      return;
    }
    const stop = watch(imageLoaded, (val) => {
      if (val) {
        stop();
        resolve();
      }
    });
    setTimeout(() => {
      stop();
      resolve();
    }, 4000);
  });
};

const handlePrint = () => {
  window.print();
};

onMounted(async () => {
  try {
    const res = await api.get(
      `/penjualan/pra-order-form/print/${encodeURIComponent(printNomor)}`,
    );
    rawData.value = res.data.data;
    isLoading.value = false;

    await nextTick();
    if (mainImageUrl.value) {
      await waitForImage();
    } else {
      imageLoaded.value = true;
    }

    const style = document.createElement("style");
    style.textContent = "@page { size: A4 landscape; margin: 10mm; }";
    document.head.appendChild(style);
  } catch (error: any) {
    isError.value = true;
    isLoading.value = false;
  }
});

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

// prog_file_path sudah tersimpan sebagai path relatif lengkap
// (/file-gambar/praorder/xxx.jpg), tidak perlu tebak-tebak folder
// cabang seperti MAP — cukup pakai apa adanya.
const mainImageUrl = computed(() => {
  const imgPath = getVal("ImageUrl");
  return imgPath || "";
});

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = "none";
  imageLoaded.value = true; // Unblock print
};

const handleImageLoad = () => {
  imageLoaded.value = true;
};

const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  const cleanName = kodeUser.trim().toUpperCase();
  return `/file-gambar/${encodeURIComponent(cleanName)}.jpg`;
};

const tglIndo = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1900) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ukuranRows = computed(() => rawData.value?.Ukuran || []);
const totalQty = computed(() =>
  ukuranRows.value.reduce((s: number, u: any) => s + (Number(u.Qty) || 0), 0),
);
const bahanNames = computed(() =>
  (rawData.value?.Bahan || []).map((b: any) => b.Nama).filter(Boolean),
);
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>

  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak Pra Order. Pastikan nomor benar.
  </div>

  <div v-else-if="rawData" class="print-container">
    <div class="no-print print-actions">
      <button @click="handlePrint">🖨️ Cetak Pra Order</button>
    </div>
    <table class="outer-table">
      <tbody>
        <tr>
          <td class="left-panel">
            <h2 class="form-title">PRA ORDER</h2>

            <table class="info-table">
              <tr>
                <td class="lbl">Nomor</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ getVal("pro_nomor") }}
                  <span
                    v-if="getVal('pro_sampel') === 'Y'"
                    class="highlight-yellow"
                    style="margin-left: 8px"
                    >SAMPEL</span
                  >
                </td>
              </tr>
              <tr>
                <td class="lbl">Tanggal</td>
                <td class="sep">:</td>
                <td class="val">{{ tglIndo(getVal("TanggalFormat")) }}</td>
              </tr>
              <tr>
                <td class="lbl">Divisi</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("DivisiNama") }}</td>
              </tr>
              <tr>
                <td class="lbl">Customer</td>
                <td class="sep">:</td>
                <td class="val">
                  {{ getVal("pro_cus_kode") }} — {{ getVal("pro_cus_nama") }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Sales</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("SalesNama") }}</td>
              </tr>
              <tr>
                <td class="lbl">Nama Pekerjaan</td>
                <td class="sep">:</td>
                <td class="val font-weight-bold">
                  {{ getVal("pro_nama_pekerjaan") }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Qty Rencana</td>
                <td class="sep">:</td>
                <td class="val">
                  {{
                    new Intl.NumberFormat("id-ID").format(
                      getVal("pro_qty_rencana") || 0,
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Finishing</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("pro_finishing") }}</td>
              </tr>
              <tr v-if="getVal('pro_spesifikasi')">
                <td class="lbl">Spesifikasi</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("pro_spesifikasi") }}</td>
              </tr>
              <tr>
                <td class="lbl">Tgl Kirim</td>
                <td class="sep">:</td>
                <td class="val">{{ tglIndo(getVal("TglKirimFormat")) }}</td>
              </tr>
              <tr v-if="getVal('pro_catatan_deadline')">
                <td class="lbl">Ket. Deadline</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("pro_catatan_deadline") }}</td>
              </tr>
              <tr>
                <td class="lbl">Cabang</td>
                <td class="sep">:</td>
                <td class="val">{{ getVal("pro_cabang") }}</td>
              </tr>
            </table>

            <div class="bottom-left-content">
              <div class="image-area">
                <img
                  v-if="mainImageUrl"
                  :src="mainImageUrl"
                  alt=""
                  @error="handleImageError"
                  @load="handleImageLoad"
                />
                <div v-else class="no-image-placeholder">
                  (Tidak ada gambar)
                </div>
              </div>
              <div class="details-area">
                <div v-if="bahanNames.length" class="komponen-box">
                  <div class="box-title">Alternatif Bahan :</div>
                  <ul class="bahan-list">
                    <li v-for="(b, i) in bahanNames" :key="i">{{ b }}</li>
                  </ul>
                </div>
                <div v-if="ukuranRows.length" class="size-box mt-2">
                  <div class="box-title">Breakdown Ukuran :</div>
                  <table class="ukuran-table">
                    <thead>
                      <tr>
                        <th>Ukuran</th>
                        <th class="tr">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(u, i) in ukuranRows" :key="i">
                        <td>{{ u.Nama }}</td>
                        <td class="tr">
                          {{ new Intl.NumberFormat("id-ID").format(u.Qty) }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td class="font-weight-bold">Total</td>
                        <td class="tr font-weight-bold">
                          {{ new Intl.NumberFormat("id-ID").format(totalQty) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <table class="ttd-table">
              <tr>
                <td class="ttd-box">
                  <div class="ttd-title">Pembuat</div>
                  <img
                    :src="getSignatureUrl(getVal('user_create'))"
                    class="ttd-img"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).style.opacity = '0')
                    "
                  />
                  <div class="ttd-name">{{ getVal("user_create") || "-" }}</div>
                </td>
              </tr>
              <tr>
                <td class="ttd-footer">
                  Dibuat: {{ getVal("user_create") }}
                  {{
                    getVal("CreatedFormat")
                      ? getVal("CreatedFormat").substring(0, 10)
                      : ""
                  }}
                </td>
              </tr>
            </table>
          </td>

          <td class="right-panel">
            <div class="catatan-wrap">
              <div class="lbl">Keterangan :</div>
              <div class="val">
                <pre class="catatan-text">{{ getVal("pro_keterangan") }}</pre>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.print-actions {
  text-align: right;
  padding: 10px 15px;
  background-color: #f5f5f5;
  margin-bottom: 10px;
}
.print-actions button {
  padding: 8px 16px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
}
.print-actions button:hover {
  background-color: #1565c0;
}

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
  max-width: 297mm;
  margin: 0 auto;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  padding: 10px;
  box-sizing: border-box;
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
.highlight-yellow {
  background-color: yellow;
  padding: 2px 4px;
  font-weight: bold;
  border: 1px solid #000;
  font-size: 9px;
}

.bottom-left-content {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.image-area {
  width: 210px;
  max-height: 170px;
  flex-shrink: 0;
  overflow: hidden;
}
.image-area img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.no-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bdbdbd;
  font-size: 9px;
  font-style: italic;
  border: 1px dashed #ccc;
}
.details-area {
  flex: 1;
  font-size: 9px;
  line-height: 1.3;
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
.bahan-list {
  margin: 2px 0 0 14px;
  padding: 0;
  font-size: 9px;
  line-height: 1.4;
}
.ukuran-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  margin-top: 2px;
}
.ukuran-table th,
.ukuran-table td {
  border: 1px solid #ccc;
  padding: 2px 5px;
  text-align: left;
}
.ukuran-table .tr {
  text-align: right;
}
.ukuran-table tfoot td {
  border-top: 1.5px solid #000;
}

.ttd-table {
  width: 100px;
  border-collapse: collapse;
  text-align: center;
  margin-left: auto;
  border: 1px solid #000;
}
.ttd-box {
  border: 1px solid #000;
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

.catatan-wrap {
  display: flex;
  font-size: 10px;
  line-height: 1.4;
}
.catatan-wrap .lbl {
  width: 65px;
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
</style>

<style>
@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
