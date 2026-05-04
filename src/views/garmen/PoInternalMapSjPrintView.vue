<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const nomorSJ = route.params.nomor as string;
const printData = ref<any>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const res = await api.get(
      `/garmen/po-internal-map/surat-jalan/form/print/${encodeURIComponent(nomorSJ)}`,
    );
    printData.value = res.data.data;
    setTimeout(() => {
      window.print();
    }, 800);
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="!isLoading && printData" class="print-container">
    <div class="header-co">
      <div class="co-info">
        <h2 class="m-0">CV. Kencana Print</h2>
        <p class="m-0 text-small">
          Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali
        </p>
        <p class="m-0 text-small">0271-740634 / 0271-740634</p>
      </div>
      <img src="@/assets/logo.png" class="logo-print" />
    </div>

    <h3 class="text-center text-underline mb-4">Surat Jalan PO Internal MAP</h3>

    <table class="w-100 info-table mb-2">
      <tr>
        <td width="15%">Nomor</td>
        <td width="2%">:</td>
        <td width="33%">
          <b>{{ printData.header.Nomor }}</b>
        </td>
        <td width="15%">Cabang</td>
        <td width="2%">:</td>
        <td width="33%">{{ printData.header.GudangAsal }}</td>
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

    <table class="detail-table w-100">
      <thead>
        <tr>
          <th width="5%">No</th>
          <th width="20%">MAP</th>
          <th width="35%">NAMA</th>
          <th width="10%">Jumlah</th>
          <th width="10%">Koli</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in printData.details" :key="i">
          <td class="text-center">{{ Number(i) + 1 }}.</td>
          <td>{{ d.MAP }}</td>
          <td>{{ d.Nama_MAP }}</td>
          <td class="text-center">{{ d.Jumlah }}</td>
          <td class="text-center">{{ d.Koli }}</td>
          <td>{{ d.Keterangan }}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer-ttd mt-6">
      <table class="w-100 ttd-table">
        <tr class="text-center">
          <td>Dibuat oleh,</td>
          <td>Disiapkan oleh,</td>
          <td>Kepala gudang,</td>
          <td>Pengantar,</td>
          <td>Diterima oleh,</td>
        </tr>
        <tr class="space-ttd">
          <td colspan="5"></td>
        </tr>
        <tr class="text-center">
          <td>
            ( <b>{{ printData.header.User || "ADMIN" }}</b> )
          </td>
          <td>
            ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )
          </td>
          <td>
            ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )
          </td>
          <td>
            ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )
          </td>
          <td>
            ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: portrait;
    margin: 0.5cm;
  }
}
.print-container {
  font-family: "Arial", sans-serif;
  font-size: 12px;
  color: #000;
  padding: 10px;
}
.header-co {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 5px;
  margin-bottom: 10px;
}
.logo-print {
  height: 45px;
}
.text-underline {
  text-decoration: underline;
}
.info-table td {
  padding: 2px;
}
.detail-table {
  border-collapse: collapse;
  margin-top: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 5px;
}
.ttd-table td {
  width: 20%;
  vertical-align: bottom;
}
.space-ttd td {
  height: 60px;
}
.m-0 {
  margin: 0;
}
.text-small {
  font-size: 10px;
}
.mt-6 {
  margin-top: 40px;
}
</style>
