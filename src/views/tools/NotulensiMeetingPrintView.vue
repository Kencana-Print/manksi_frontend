<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import {
  notulensiMeetingFormService,
  type NotulensiCetakData,
} from "@/services/tools/notulensiMeetingFormService";
import { formatTanggal } from "@/utils/dateFormat";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<NotulensiCetakData | null>(null);

const nomor = String(route.params.nomor ?? "");

const printedAt = new Date().toLocaleString("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

onMounted(async () => {
  try {
    const res = await notulensiMeetingFormService.getCetak(nomor);
    data.value = res.data.data;
  } catch {
    toast.error("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
    setTimeout(() => window.print(), 700);
  }
});
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="!data" class="print-loading">Data tidak ditemukan.</div>

  <div v-else class="print-container">
    <div class="print-page">
      <!-- Kop (gaya cetakan Jadwal Kirim) -->
      <div class="page-header">
        <div class="header-left">
          <div class="company-name">CV. Kencana Print</div>
          <div class="company-addr">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="company-addr">Boyolali</div>
        </div>
        <div class="header-right">
          <img src="@/assets/logo.png" class="logo-img" alt="Logo" />
        </div>
      </div>
      <div class="report-title">NOTULENSI MEETING</div>

      <table class="info-table">
        <tbody>
          <tr>
            <td class="lbl">Nomor</td>
            <td>: {{ data.nomor }}</td>
            <td class="lbl">Lokasi</td>
            <td>: {{ data.lokasi || "-" }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td>: {{ formatTanggal(data.tanggal) }}</td>
            <td class="lbl">Agenda</td>
            <td>: {{ data.agenda }}</td>
          </tr>
          <tr>
            <td class="lbl">Peserta</td>
            <td colspan="3" class="peserta">: {{ data.peserta || "-" }}</td>
          </tr>
        </tbody>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th width="28">No</th>
            <th>Hasil / Tindak Lanjut</th>
            <th width="130">PIC</th>
            <th width="75">Deadline</th>
            <th width="62">Status User</th>
            <th width="62">Status Sistem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in data.detail" :key="d.noUrut">
            <td class="tc">{{ d.noUrut }}</td>
            <td class="wrap">{{ d.hasil }}</td>
            <td>{{ d.pic || "-" }}</td>
            <td class="tc">
              {{ d.deadline ? formatTanggal(d.deadline) : "-" }}
              <div v-if="d.terlambat" class="late">TERLAMBAT</div>
            </td>
            <td class="tc">{{ d.statusUser }}</td>
            <td class="tc">{{ d.statusSistem }}</td>
          </tr>
          <tr v-if="!data.detail.length">
            <td colspan="6" class="tc">Tidak ada tindak lanjut</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="sign">
          <div>Dibuat oleh</div>
          <div class="space"></div>
          <div class="line">{{ data.namaPembuat || data.pembuat }}</div>
        </div>
        <div class="sign">
          <div>Mengetahui</div>
          <div class="space"></div>
          <div class="line">&nbsp;</div>
        </div>
        <div class="cetak">Dicetak: {{ printedAt }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}
.print-container {
  width: 21cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}
.print-page {
  width: 21cm;
  min-height: 29.7cm;
  padding: 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0 0 4px;
}
.header-left {
  flex: 1;
}
.company-name {
  font-size: 10pt;
  font-weight: 700;
}
.company-addr {
  font-size: 7.5pt;
  color: #222;
  margin-top: 1px;
}
.logo-img {
  height: 36px;
  object-fit: contain;
}
.report-title {
  text-align: center;
  font-size: 10.5pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 0 2px;
  border-bottom: 1.5px solid #000;
  margin-bottom: 6px;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.info-table td {
  padding: 1px 4px;
  vertical-align: top;
}
.info-table .lbl {
  width: 60px;
  font-weight: 700;
}
.info-table .peserta {
  white-space: pre-wrap;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 2px 4px;
  vertical-align: top;
}
.detail-table th {
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
.detail-table thead {
  display: table-header-group;
}
.detail-table tr {
  page-break-inside: avoid;
}
.wrap {
  white-space: pre-wrap;
}
.tc {
  text-align: center;
}
.late {
  font-size: 7pt;
  font-weight: 700;
}

.print-footer {
  display: flex;
  align-items: flex-start;
  gap: 60px;
  margin-top: 30px;
  padding-left: 40px;
  font-size: 9pt;
  page-break-inside: avoid;
}
.sign {
  width: 170px;
  text-align: center;
}
.sign .space {
  height: 50px;
}
.sign .line {
  border-top: 1px solid black;
  padding-top: 2px;
}
.cetak {
  margin-left: auto;
  font-size: 8pt;
  color: #555;
}

@media print {
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    width: 100%;
    min-height: 0;
    padding: 0;
    box-shadow: none;
  }
  .detail-table {
    width: calc(100% - 1px);
  }
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}
</style>
