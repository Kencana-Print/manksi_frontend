<script setup lang="ts">
import { ref, onMounted } from "vue";
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
        <td width="33%">{{ data.bap_nomor }}</td>
        <td width="15%">Nomor Spk</td>
        <td width="2%">:</td>
        <td width="33%">{{ data.bap_spk_nomor }}</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>:</td>
        <td>{{ new Date(data.bap_tanggal).toLocaleDateString("id-ID") }}</td>
        <td>Nama Spk</td>
        <td>:</td>
        <td>{{ data.namaspk }}</td>
      </tr>
      <tr>
        <td>Cabang</td>
        <td>:</td>
        <td>{{ data.bap_cab }}</td>
        <td>Jumlah</td>
        <td>:</td>
        <td>{{ formatCurrency(data.bap_jumlah) }}</td>
      </tr>
      <tr>
        <td>Bagian</td>
        <td>:</td>
        <td>{{ data.kb_nama }}</td>
        <td>Harga</td>
        <td>:</td>
        <td>{{ formatCurrency(data.bap_harga) }}</td>
      </tr>
      <tr>
        <td class="align-top">POKOK MASALAH</td>
        <td class="align-top">:</td>
        <td colspan="4" class="align-top pre-wrap pr-5">
          {{ data.bap_masalah }}
        </td>
      </tr>
    </table>

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
