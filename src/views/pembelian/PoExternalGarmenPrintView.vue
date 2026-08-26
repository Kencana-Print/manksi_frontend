<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { poExternalGarmenFormService } from "@/services/pembelian/poExternalGarmenFormService";
import logoImg from "@/assets/logo.png";
import api from "@/services/api";

const route = useRoute();
const nomor = String(route.params.nomor);

const data = ref<any>(null);
const isLoading = ref(true);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
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
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatNum = (num: number) =>
  Number(num || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const imgFallbackStep = ref(0);

const gambarUrlPrimary = computed(() => {
  if (!data.value?.NomorSPK) return "";
  const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || "";
  const base = rawBase.replace(/\/api\/?$/, "");
  const cab = data.value.SpkCab || "HO-";
  return `${base}/images/${cab}/${encodeURIComponent(data.value.NomorSPK)}.jpg`;
});

const gambarUrl = ref("");
watch(
  () => data.value,
  (d) => {
    if (d?.NomorSPK) {
      imgFallbackStep.value = 0;
      gambarUrl.value = gambarUrlPrimary.value;
    }
  },
);

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (imgFallbackStep.value === 0 && data.value?.NomorSPK) {
    // fallback ke legacy /mnt/image via /file-gambar
    imgFallbackStep.value = 1;
    img.src = `/file-gambar/${encodeURIComponent(data.value.NomorSPK)}.jpg`;
    return;
  }
  img.style.display = "none";
};

onMounted(async () => {
  try {
    const res = await poExternalGarmenFormService.getCetak(nomor);
    data.value = res.data.data;
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    console.error("Gagal memuat data cetak", error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading-screen">Memuat Dokumen Cetak...</div>

  <div v-else class="print-container">
    <div class="print-page">
      <!-- Header & Logo -->
      <div class="header">
        <div class="header-text">
          <h2 class="company-title">CV. Kencana Print</h2>
          <p class="company-address">
            Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali
          </p>
          <p class="company-address">0271-740634/0271-740634</p>
        </div>
        <img :src="logoImg" alt="Kencana Print" class="print-logo" />
      </div>

      <h3 class="doc-title">PO EXTERNAL</h3>

      <div class="info-box">
        <div class="info-left">
          <table>
            <tr>
              <td width="55">Nomor</td>
              <td width="10">:</td>
              <td>{{ data.Nomor }}</td>
            </tr>
            <tr>
              <td>Tanggal</td>
              <td>:</td>
              <td>{{ formatDate(data.Tanggal) }}</td>
            </tr>
          </table>
        </div>
        <div class="info-right">
          <table>
            <tr>
              <td width="45">Vendor</td>
              <td width="10">:</td>
              <td>
                {{ data.SupNama }}<br />
                {{ data.SupAlamat
                }}<span v-if="data.SupAlamat && data.SupKota">, </span
                >{{ data.SupKota }}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="pesanan-box">
        <p class="mb-0"><b>Nama Pesanan :</b></p>
        <p class="mb-0">{{ data.NamaSPK }}</p>
        <p class="mb-0">Bahan: {{ data.Bahan }}</p>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th width="35">No</th>
            <th>Size</th>
            <th width="70">Jumlah</th>
            <th width="90">Harga</th>
            <th width="100">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in data.Detail" :key="idx">
            <td class="tc">{{ Number(idx) + 1 }}</td>
            <td>{{ item.Size }}</td>
            <td class="tr">{{ formatNum(item.Jumlah) }}</td>
            <td class="tr">{{ formatNum(item.Tarif) }}</td>
            <td class="tr">{{ formatNum(item.Total) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="tr fw">Total :</td>
            <td class="tr fw">
              {{
                formatNum(
                  data.Detail.reduce(
                    (s: number, r: any) => s + Number(r.Jumlah),
                    0,
                  ),
                )
              }}
            </td>
            <td></td>
            <td class="tr fw">{{ formatNum(data.Total) }}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer-section">
        <div class="notes-wrapper">
          <p class="mb-0">
            <b>Dateline :</b> {{ formatDate(data.DatelinePO) }}
          </p>

          <p class="mb-0 mt-2"><b>Keterangan :</b></p>
          <p class="ket-text">{{ data.Ket }}</p>

          <p v-if="data.Kain" class="mb-0 mt-2"><b>Komponen Bahan :</b></p>
          <p v-if="data.Kain" class="ket-text">{{ data.Kain }}</p>
        </div>

        <div v-if="data.AdaGambar" class="foto-wrapper">
          <img
            :src="gambarUrl"
            @error="handleImageError"
            class="foto-img foto-main"
            alt="Foto SPK"
          />
          <div class="foto-row">
            <img
              :src="gambarUrl"
              @error="handleImageError"
              class="foto-img foto-small"
              alt="Foto SPK"
            />
            <img
              :src="gambarUrl"
              @error="handleImageError"
              class="foto-img foto-small"
              alt="Foto SPK"
            />
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="sign-box">
          <p>Dibuat oleh,</p>
          <br /><br /><br />
          <p>( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</p>
        </div>
        <div class="sign-box">
          <p>Vendor,</p>
          <br /><br /><br />
          <p>( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
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
  font-size: 16px;
  color: #555;
}
.print-container {
  font-family: "Arial", sans-serif;
  font-size: 11px;
  color: #000;
  line-height: 1.3;
  background: white;
  max-width: 210mm;
  margin: 0 auto;
}
.print-page {
  padding: 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.header-text {
  flex: 1;
}
.print-logo {
  height: 40px;
  object-fit: contain;
  margin-left: 12px;
}
.company-title {
  font-size: 13px;
  font-weight: bold;
  margin: 0 0 2px 0;
}
.company-address {
  margin: 0;
  font-size: 10px;
}

.doc-title {
  font-size: 14px;
  font-weight: bold;
  margin: 12px 0 8px 0;
}

.info-box {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.info-left table,
.info-right table {
  border-collapse: collapse;
}
.info-left td,
.info-right td {
  padding: 1px 3px;
  vertical-align: top;
  font-size: 11px;
}

.pesanan-box {
  margin-bottom: 12px;
}
.pesanan-box p {
  font-size: 11px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}
.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  font-size: 10px;
}
.items-table th {
  text-align: center;
  font-weight: bold;
  background: #f5f5f5;
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
.mb-0 {
  margin: 0;
}
.mt-2 {
  margin-top: 8px;
}

.footer-section {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  gap: 16px;
}
.notes-wrapper {
  flex: 1;
  min-width: 0;
}
.ket-text {
  font-size: 10px;
  white-space: pre-wrap;
  margin: 2px 0 0 0;
}

.foto-wrapper {
  width: 200px;
  flex-shrink: 0;
}
.foto-img {
  width: 100%;
  object-fit: contain;
  border: 1px solid #ddd;
}
.foto-main {
  height: 90px;
  margin-bottom: 6px;
}
.foto-row {
  display: flex;
  gap: 6px;
}
.foto-row .foto-img {
  height: 70px;
}

.signatures {
  display: flex;
  justify-content: flex-end;
  gap: 60px;
  margin-top: 24px;
}
.sign-box {
  text-align: center;
  font-size: 11px;
}
.sign-box p {
  margin: 0;
}
</style>
