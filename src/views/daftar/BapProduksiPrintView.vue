<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import logoKencana from "@/assets/logo.png";
import { IconPrinter } from "@tabler/icons-vue";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);

const loadPrintData = async () => {
  try {
    const res = await api.get(
      `/master/bap-produksi-form/print/${route.params.nomor}`,
    );
    data.value = res.data.data;
    // Auto-trigger print dialog setelah data dimuat
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (e) {
    console.error("Gagal memuat data cetak");
  } finally {
    isLoading.value = false;
  }
};

const formatCurrency = (val: any) => {
  return new Intl.NumberFormat("id-ID").format(Number(val) || 0);
};

const handlePrint = () => {
  window.print();
};

const totalKeseluruhan = computed(() =>
  (data.value?.SpkList || []).reduce(
    (sum: number, s: any) =>
      sum + (Number(s.Jumlah) || 0) * (Number(s.Harga) || 0),
    0,
  ),
);

onMounted(loadPrintData);
</script>

<template>
  <div v-if="isLoading" class="d-flex justify-center pa-10 no-print">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </div>

  <div v-else-if="data" class="print-container pa-5">
    <div
      class="d-flex justify-space-between align-start mb-2 border-b-bold pb-2"
    >
      <div>
        <div class="text-h6 font-weight-bold">CV. Kencana Print</div>
        <div class="text-caption">
          Padokan RT 04 / 04, Sawahan Ngemplak, Boyolali
        </div>
        <div class="text-caption">0271-740634/0271-740634</div>
      </div>
      <div class="text-right">
        <img
          :src="logoKencana"
          alt="Logo Kencana Print"
          style="height: 50px; width: auto"
          class="mb-1"
        />
      </div>
    </div>

    <div
      class="text-center text-h5 font-weight-bold text-decoration-underline mb-5"
    >
      BERITA ACARA
    </div>

    <table class="w-100 detail-table mb-5">
      <tr>
        <td width="15%">Nomor</td>
        <td width="2%">:</td>
        <td width="83%" colspan="4">{{ data.bap_nomor }}</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>:</td>
        <td colspan="4">
          {{ new Date(data.bap_tanggal).toLocaleDateString("id-ID") }}
        </td>
      </tr>
      <tr>
        <td>Cabang</td>
        <td>:</td>
        <td colspan="4">{{ data.bap_cab }}</td>
      </tr>
      <tr>
        <td>Bagian</td>
        <td>:</td>
        <td colspan="4">{{ data.kb_nama || data.bap_bagnama }}</td>
      </tr>
      <tr>
        <td class="align-top">POKOK MASALAH</td>
        <td class="align-top">:</td>
        <td colspan="4" class="align-top pre-wrap pr-5">
          {{ data.bap_masalah }}
        </td>
      </tr>
    </table>

    <!-- [BARU] Tabel Daftar SPK, menggantikan baris Nomor/Nama/Jumlah/Harga tunggal -->
    <div v-if="data.SpkList && data.SpkList.length > 0" class="mb-5">
      <div class="section-label mb-1">DAFTAR SPK</div>
      <table class="w-100 spk-print-table">
        <thead>
          <tr>
            <th style="width: 5%">No</th>
            <th style="width: 20%">No. SPK</th>
            <th>Nama SPK</th>
            <th style="width: 12%" class="text-right">Jumlah</th>
            <th style="width: 15%" class="text-right">Harga</th>
            <th style="width: 15%" class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, idx) in data.SpkList as any[]" :key="idx">
            <td class="text-center">{{ Number(idx) + 1 }}</td>
            <td>{{ s.Spk }}</td>
            <td>{{ s.SpkNama }}</td>
            <td class="text-right">{{ formatCurrency(s.Jumlah) }}</td>
            <td class="text-right">{{ formatCurrency(s.Harga) }}</td>
            <td class="text-right">
              {{
                formatCurrency((Number(s.Jumlah) || 0) * (Number(s.Harga) || 0))
              }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="text-right font-weight-bold">
              Total Keseluruhan
            </td>
            <td class="text-right font-weight-bold">
              {{ formatCurrency(totalKeseluruhan) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="section-container mb-4">
      <div class="section-label">PENYEBAB KESALAHAN</div>
      <div class="section-content pre-wrap">{{ data.bap_sumber }}</div>
    </div>

    <div class="section-container mb-4">
      <div class="section-label">SOLUSI</div>
      <div class="section-content pre-wrap">{{ data.bap_solusi }}</div>
    </div>

    <div class="section-container mb-10">
      <div class="section-label">PERTANGGUNG JAWABAN</div>
      <div class="section-content pre-wrap">{{ data.bap_jawab }}</div>
    </div>

    <div class="d-flex justify-space-between text-center mt-15">
      <div style="width: 25%">
        <div>Dibuat Oleh,</div>
        <div class="mt-15">({{ data.user_create }})</div>
      </div>
      <div style="width: 25%">
        <div>Atasan,</div>
        <div class="mt-15">
          (
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          )
        </div>
      </div>
      <div style="width: 25%">
        <div>Manager,</div>
        <div class="mt-15">
          (
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          )
        </div>
      </div>
    </div>

    <v-btn
      fab
      color="primary"
      class="no-print position-fixed"
      style="bottom: 20px; right: 20px"
      @click="handlePrint"
    >
      <IconPrinter :size="20" :stroke-width="1.7" />
    </v-btn>
  </div>
</template>

<style scoped>
.print-container {
  max-width: 900px;
  margin: 0 auto;
  font-family: "Arial", sans-serif;
  color: black;
  line-height: 1.4;
}

.text-h5 {
  font-size: 1.25rem;
}
.text-h6 {
  font-size: 1.1rem;
}
.text-caption {
  font-size: 0.8rem;
}
.pre-wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}
.border-b-bold {
  border-bottom: 2px solid black;
}
.italic {
  font-style: italic;
}
.color-primary {
  color: #d32f2f;
}

.detail-table td {
  padding: 2px 0;
  font-size: 0.9rem;
}

.section-container {
  display: flex;
  font-size: 0.9rem;
}
.section-label {
  width: 15%;
  font-weight: bold;
}
.section-content {
  width: 85%;
  padding-left: 18px;
  position: relative;
}
.section-content::before {
  content: ":";
  position: absolute;
  left: 5px;
}

.spk-print-table {
  border-collapse: collapse;
  font-size: 0.85rem;
}
.spk-print-table th,
.spk-print-table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.spk-print-table thead th {
  font-weight: bold;
  background: #f0f0f0;
}
.spk-print-table tfoot td {
  border-top: 2px solid #000;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-container {
    width: 100%;
    max-width: 100%;
    padding: 0 !important;
  }
  body {
    background: white;
  }
}
</style>
