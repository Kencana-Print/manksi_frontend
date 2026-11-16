<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { format, parseISO, isValid } from "date-fns";

interface JadwalKirimItem {
  No_SPK: string;
  Nama_Spk: string;
  Ukuran: string;
  Kain: string;
  Tanggal: string;
  Uraian: string;
  Cust: string;
  Jml_pcs: number;
  Jml_koli: number;
  Jam: string;
  No_SJ?: string;
  Realisasi: number;
  Ekspedisi?: string;
}

const route = useRoute();
const router = useRouter();
const masterData = ref<JadwalKirimItem[]>([]);
const isLoading = ref(true);

const namaGudang = computed(
  () => (route.query.namaGudang as string) || "GUDANG JADI MMT",
);

const safeFormatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "dd MMM yy") : dateString;
};

const fetchPrintData = async () => {
  const { startDate, endDate, gudang } = route.query;
  try {
    const response = await api.get(`/mmt/jadwal-kirim/print`, {
      params: { startDate, endDate, gudang },
    });
    masterData.value = response.data.data || [];
  } catch (error) {
    console.error("Error fetching print data:", error);
  } finally {
    isLoading.value = false;
  }
};

const formatLongString = (str: string, max: number) => {
  if (!str) return "";
  return str.length > max ? str.substring(0, max) + "..." : str;
};

const printNow = () => {
  window.print();
};

// Auto trigger saat pertama kali data load
watch(isLoading, (val) => {
  if (!val && masterData.value.length > 0) {
    nextTick(() => {
      setTimeout(() => {
        // window.print(); // Aktifkan jika ingin langsung muncul dialog
      }, 500);
    });
  }
});

// Trigger Print tanpa auto-back
watch(isLoading, (newValue) => {
  if (newValue === false && masterData.value.length > 0) {
    nextTick(() => {
      setTimeout(() => {
        window.print();
        // window.addEventListener("afterprint", ...) DIHAPUS agar tetap di halaman preview
      }, 1000);
    });
  }
});

onMounted(() => {
  fetchPrintData();
});

const totalPcs = computed(() =>
  masterData.value.reduce((a, b) => a + (Number(b.Jml_Pcs) || 0), 0),
);

const totalKoli = computed(() =>
  masterData.value.reduce((a, b) => a + (Number(b.Jml_Koli) || 0), 0),
);
</script>

<template>
  <div class="mmt-print-page">
    <!-- Tombol Aksi (Hanya muncul di layar, tidak saat print) -->
    <div class="no-print action-bar">
      <v-btn
        prepend-icon="mdi-arrow-left"
        color="grey-darken-3"
        @click="router.back()"
        >Kembali</v-btn
      >
      <v-btn
        prepend-icon="mdi-printer"
        color="primary"
        class="ml-2"
        @click="printNow"
        >Cetak Sekarang</v-btn
      >
    </div>

    <div v-if="!isLoading" class="sheet">
      <!-- Kop Surat sesuai image_63ab04.jpg -->
      <div class="report-header">
        <div class="company-brand">
          <div class="brand-name">CV. Kencana Print</div>
          <div class="brand-sub">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="brand-sub">Boyolali</div>
        </div>
        <div class="logo-brand">
          <div class="logo-main">Kencana <span>Print</span></div>
          <div class="logo-slogan">Semakin Nyata Semakin Nyata</div>
        </div>
      </div>

      <div class="report-title">JADWAL & REALISASI PENGIRIMAN</div>

      <table class="data-table">
        <thead>
          <tr class="header-blue">
            <!-- Class Warna Biru Muda -->
            <th rowspan="2" class="w-no">NO.</th>
            <th rowspan="2" class="w-spk">NO SPK</th>
            <th rowspan="2" class="w-nama">NAMA SPK</th>
            <th rowspan="2" class="w-ukuran">UKURAN</th>
            <th rowspan="2" class="w-kain">JENIS KAIN</th>
            <th rowspan="2" class="w-tgl">TANGGAL</th>
            <th rowspan="2" class="w-uraian">URAIAN</th>
            <th rowspan="2" class="w-cust">CUST</th>
            <th colspan="3">JADWAL</th>
            <th colspan="2">REALISASI</th>
            <th rowspan="2" class="w-exp">EKSPEDISI</th>
          </tr>
          <tr class="header-blue">
            <th class="w-pcs">JML PCS</th>
            <th class="w-koli">JML KOLI</th>
            <th class="w-ready">JAM READY</th>
            <th class="w-sj">NOMOR SJ</th>
            <th class="w-kirim">JML KIRIM</th>
          </tr>
        </thead>
        <tbody>
          <tr class="group-row">
            <td colspan="14">{{ namaGudang.toUpperCase() }}</td>
          </tr>
          <tr v-for="(item, index) in masterData" :key="index">
            <td class="text-center">{{ index + 1 }}</td>
            <td class="text-center">{{ item.No_SPK }}</td>
            <td>{{ formatLongString(item.Nama_Spk, 25) }}</td>
            <td class="text-center">{{ item.Ukuran }}</td>
            <td class="text-center">{{ item.Kain }}</td>
            <td class="text-center">{{ item.Tanggal }}</td>
            <td>{{ item.Uraian }}</td>
            <td>{{ formatLongString(item.Customer, 18) }}</td>
            <td class="text-center font-bold">{{ item.Jml_Pcs }}</td>
            <td class="text-center font-bold">{{ item.Jml_Koli }}</td>
            <td class="text-center">{{ item.Jam_Ready }}</td>
            <td class="text-center">{{ item.Nomor_SJ }}</td>
            <td class="text-center font-bold">{{ item.Realisasi_Kirim }}</td>
            <td>{{ item.Expedisi }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Container Preview */
.mmt-print-page {
  background-color: #525659;
  min-height: 100vh;
  padding: 40px 0;
  font-family: Arial, sans-serif;
}

/* Kertas A4 Landscape */
.sheet {
  background: white;
  width: 350mm; /* Sesuai lebar tabel pada gambar */
  margin: 0 auto;
  padding: 15mm 10mm;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

/* Header & Kop */
.report-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}
.brand-name {
  font-weight: bold;
  font-size: 12pt;
}
.brand-sub {
  font-size: 9pt;
  color: #333;
}
.logo-main {
  font-weight: bold;
  font-size: 16pt;
  color: #c00000;
  text-align: right;
}
.logo-main span {
  color: #000;
}
.logo-slogan {
  font-size: 8pt;
  font-style: italic;
  color: #666;
  text-align: right;
}

.report-title {
  text-align: center;
  font-weight: bold;
  font-size: 13pt;
  margin: 20px 0;
  text-decoration: underline;
}

/* Styling Tabel Utama */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px; /* Ukuran font kecil agar muat banyak kolom */
}
.data-table th,
.data-table td {
  border: 1px solid #444;
  padding: 4px 2px;
  line-height: 1.2;
}

/* Header Biru Muda */
.header-blue th {
  background-color: #d1e9ff !important; /* Warna Biru Muda */
  color: #003366;
  font-weight: bold;
  text-transform: uppercase;
}

.group-row td {
  background-color: #f2f2f2;
  font-weight: bold;
  padding: 6px 10px;
}

/* Zebra Striping untuk kemudahan baca */
tbody tr:nth-child(even) {
  background-color: #fafafa;
}

/* Helpers */
.text-center {
  text-align: center;
}
.font-bold {
  font-weight: bold;
}

/* Lebar Kolom Proporsional */
.w-no {
  width: 25px;
}
.w-spk {
  width: 100px;
}
.w-nama {
  width: 160px;
}
.w-ukuran {
  width: 100px;
}
.w-tgl {
  width: 65px;
}
.w-pcs,
.w-koli,
.w-kirim {
  width: 40px;
}

/* Tombol Aksi */
.action-bar {
  position: fixed;
  top: 20px;
  right: 40px;
  z-index: 100;
}

/* Aturan Cetak */
@media print {
  @page {
    size: A4 landscape;
    margin: 5mm;
  }
  .mmt-print-page {
    background: none;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
  .sheet {
    width: 100%;
    box-shadow: none;
    padding: 0;
  }
  /* Memastikan warna background muncul saat di-print */
  .header-blue th {
    background-color: #d1e9ff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
