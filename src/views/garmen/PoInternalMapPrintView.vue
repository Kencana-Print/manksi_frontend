<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const nomorPO = route.params.nomor as string;

const printData = ref<any>(null);
const isLoading = ref(true);
const errorMsg = ref("");

onMounted(async () => {
  try {
    const res = await api.get(
      `/garmen/po-internal-map/form/print/${encodeURIComponent(nomorPO)}`,
    );
    printData.value = res.data.data;

    // Auto print ketika data selesai dimuat (delay sebentar agar gambar sempat dirender)
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (e: any) {
    errorMsg.value = "Gagal memuat data cetak: " + e.message;
  } finally {
    isLoading.value = false;
  }
});

// Fallback gambar (sama seperti logika di MAP Form)
const handleFallbackImage = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (img.dataset.fallbackTried === "true") return;
  const currentSrc = img.src;
  if (currentSrc.includes("/file-gambar/mintaharga/")) {
    img.src = currentSrc.replace("/file-gambar/mintaharga/", "/file-gambar/");
    img.dataset.fallbackTried = "true";
  } else if (
    currentSrc.includes("/file-gambar/") &&
    !currentSrc.includes("blob:")
  ) {
    // ✅ FIX: path relatif, gak hardcode host/port
    const filename = currentSrc.split("/").pop();
    img.src = `/file-gambar/mintaharga/${filename}`;
    img.dataset.fallbackTried = "true";
  }
};
</script>

<template>
  <div v-if="isLoading" class="d-flex justify-center align-center h-100vh">
    Memuat dokumen cetak...
  </div>
  <div
    v-else-if="errorMsg"
    class="d-flex justify-center align-center h-100vh text-error font-weight-bold"
  >
    {{ errorMsg }}
  </div>
  <div v-else class="print-container">
    <div class="print-header">
      <div class="company-info">
        <h3>CV. Kencana Print</h3>
        <p>
          Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali<br />0271-740634/0271-740634
        </p>
      </div>
      <div class="company-logo">
        <img src="@/assets/logo.png" alt="Kencana Print Logo" />
      </div>
    </div>

    <div class="po-title">PO Internal MAP</div>
    <table class="info-table">
      <tr>
        <td style="width: 80px">Nomor PO</td>
        <td style="width: 10px">:</td>
        <td>{{ printData.header.Nomor }}</td>
        <td style="width: 80px">Cabang</td>
        <td style="width: 10px">:</td>
        <td>{{ printData.header.GudangAsal }}</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>:</td>
        <td>{{ printData.header.Tanggal }}</td>
        <td>Tujuan</td>
        <td>:</td>
        <td>{{ printData.header.Tujuan }}</td>
      </tr>
    </table>

    <table class="detail-table">
      <thead>
        <tr>
          <th style="width: 30px">No</th>
          <th>Detail MAP</th>
          <th style="width: 60px">Qty PO</th>
          <th style="width: 150px">Desain</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in printData.details" :key="idx">
          <td class="text-center" style="vertical-align: top; padding-top: 8px">
            {{ Number(idx) + 1 }}.
          </td>
          <td style="vertical-align: top; padding: 8px; line-height: 1.4">
            Kode : {{ item.Kode }}<br />
            Nama : {{ item.Nama }}<br />
            Bahan : {{ item.Bahan }}<br />
            Ukuran : {{ item.Ukuran }}<br />
            Qty : {{ item.Qty }}<br />
            Dateline : {{ item.Dateline }}<br />
            Keterangan: {{ item.Keterangan }}
          </td>
          <td
            class="text-center font-weight-bold"
            style="vertical-align: middle; font-size: 14px"
          >
            {{ item.Qty }}
          </td>
          <td class="text-center p-1" style="vertical-align: middle">
            <img
              :src="`/file-gambar/${item.Kode}.jpg`"
              class="map-image"
              @error="handleFallbackImage"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <table class="ttd-table">
      <tr>
        <td>Dibuat Oleh,</td>
        <td>Mengetahui,</td>
        <td>Diterima Oleh,</td>
      </tr>
      <tr>
        <td style="height: 70px"></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>
          ( <b>{{ printData.header.User || "ADMIN" }}</b> )
        </td>
        <td>
          (
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          )
        </td>
        <td>
          (
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          )
        </td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
/* Reset dasar untuk cetak */
@media print {
  @page {
    margin: 1cm;
    size: portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.h-100vh {
  height: 100vh;
}
.text-error {
  color: red;
}
.text-center {
  text-align: center;
}
.font-weight-bold {
  font-weight: bold;
}
.p-1 {
  padding: 4px;
}

.print-container {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #000;
  max-width: 800px;
  margin: 0 auto;
  padding: 10px;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.company-info h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
}
.company-info p {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
}

.company-logo img {
  height: 40px;
  object-fit: contain;
}

.po-title {
  font-size: 14px;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 10px;
}

.info-table {
  width: 100%;
  margin-bottom: 10px;
  border-collapse: collapse;
}
.info-table td {
  padding: 2px 0;
  font-size: 12px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 4px;
}
.detail-table th {
  text-align: center;
  font-weight: normal;
}

.map-image {
  width: 130px;
  height: auto;
  max-height: 130px;
  object-fit: contain;
}

.ttd-table {
  width: 60%;
  text-align: center;
  border-collapse: collapse;
}
.ttd-table td {
  width: 33.33%;
  font-size: 12px;
}
</style>
