<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
// Menggunakan Form Service yang sudah ada
import { poNonBahanFormService } from "@/services/garmen/poNonBahanFormService";

// Import logo kencana print
import LogoImg from "@/assets/logo.png";

const route = useRoute();
const reportData = ref<any[]>([]);
const master = ref<any>({});
const isLoading = ref(true);

// Format bulan Indonesia sesuai cetakan contoh: 05-Mei-2026
const formatDateDisplay = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const IndonesianMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${String(d.getDate()).padStart(2, "0")}-${IndonesianMonths[d.getMonth()]}-${d.getFullYear()}`;
};

const formatCurrency = (val: any) => {
  return Number(val || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });
};

const fetchData = async () => {
  try {
    // Memanggil getDetail dari Form Service lama
    const res = await poNonBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const { header, detail } = res.data.data;

    master.value = {
      po_jenis: header.po_jenis,
      po_nomor: header.po_nomor,
      po_tanggal: header.po_tanggal,
      po_ket: header.po_ket,
      // Mengambil user pembuat
      usr: header.user_create || header.Usr || "",
    };

    // Mapping detail agar sesuai nama field template
    reportData.value = detail.map((item: any) => ({
      pod_brg_kode: item.pod_brg_kode || item.Kode,
      Nama: item.Nama,
      Satuan: item.Satuan,
      pod_jumlah: item.pod_jumlah || item.jumlah || 0,
      pod_harga: item.pod_harga || item.harga || 0,
    }));
  } catch (error) {
    console.error("Gagal memuat data cetak PO:", error);
  } finally {
    isLoading.value = false;
    // Memicu dialog cetak browser
    setTimeout(() => {
      window.print();
    }, 500);
  }
};

// Hitung total nilai PO
const grandTotal = computed(() => {
  return reportData.value.reduce(
    (sum, item) => sum + Number(item.pod_jumlah) * Number(item.pod_harga),
    0,
  );
});

onMounted(() => fetchData());
</script>

<template>
  <div class="print-container" v-if="!isLoading">
    <div class="company-header">
      <div class="comp-left">
        <div class="comp-name">CV. Kencana Print</div>
        <div class="comp-address">
          Padokan RT 04 / 04 Sawahan Ngemplak Boyolali
        </div>
        <div class="comp-phone">0271-740634</div>
      </div>
      <div class="comp-right">
        <img :src="LogoImg" alt="Kencana Print" class="comp-logo" />
      </div>
    </div>

    <div class="thick-line mb-3"></div>

    <div class="doc-title">PO {{ master.po_jenis }}</div>
    <div class="thick-line mb-3"></div>

    <div class="meta-grid">
      <div class="meta-row">
        <span class="meta-lbl">No</span><span class="meta-sep">:</span>
        <span class="meta-val font-code font-bold">{{ master.po_nomor }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-lbl">Tanggal</span><span class="meta-sep">:</span>
        <span class="meta-val">{{ formatDateDisplay(master.po_tanggal) }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-lbl">Keterangan</span><span class="meta-sep">:</span>
        <span class="meta-val text-upper">{{ master.po_ket || "-" }}</span>
      </div>
    </div>

    <table class="print-table full-grid">
      <thead>
        <tr>
          <th style="width: 40px" class="text-center">No</th>
          <th style="width: 110px">Kode Barang</th>
          <th>Nama Barang</th>
          <th style="width: 80px" class="text-center">Satuan</th>
          <th style="width: 80px" class="text-center">Qty</th>
          <th style="width: 100px" class="text-right">Harga</th>
          <th style="width: 110px" class="text-right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in reportData" :key="idx">
          <td class="text-center">{{ idx + 1 }}</td>
          <td class="font-code text-center">{{ item.pod_brg_kode }}</td>
          <td class="font-bold text-upper">{{ item.Nama }}</td>
          <td class="text-center text-upper">{{ item.Satuan }}</td>
          <td class="text-center font-bold">
            {{ formatCurrency(item.pod_jumlah) }}
          </td>
          <td class="text-right">{{ formatCurrency(item.pod_harga) }}</td>
          <td class="text-right font-bold">
            {{ formatCurrency(item.pod_jumlah * item.pod_harga) }}
          </td>
        </tr>
        <tr class="total-row font-bold">
          <td colspan="6" class="text-right">TOTAL :</td>
          <td class="text-right grand-total-cell">
            {{ formatCurrency(grandTotal) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="sign-block">
      <div class="sign-title">Dibuat Oleh,</div>
      <div class="sign-space"></div>
      <div class="sign-name text-upper">{{ master.usr }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Container Setup */
.print-container {
  width: 210mm;
  margin: 0 auto;
  padding: 15px 20px;
  color: #000;
  background: #fff;
  font-family: Arial, sans-serif;
  font-size: 11px;
}
.company-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2px;
}
.comp-name {
  font-size: 13px;
  font-weight: 700;
  color: #000;
}
.comp-address,
.comp-phone {
  font-size: 11px;
  color: #000;
}
.comp-logo {
  height: 28px;
  object-fit: contain;
}

/* Separator bar tebal */
.thick-line {
  width: 100%;
  height: 2px;
  background-color: #000;
}
.doc-title {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 5px 0;
  letter-spacing: 0.02em;
}
.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 12px;
}
.meta-row {
  display: flex;
  align-items: center;
  font-size: 11px;
}
.meta-lbl {
  width: 70px;
  font-weight: bold;
}
.meta-sep {
  width: 15px;
}
.meta-val {
  font-weight: normal;
}

/* STYLING FULL GRID TABLE (SOLUSI) */
.print-table.full-grid {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
  font-size: 11px;
  border: 1px solid #000; /* Border luar solid */
}
.print-table.full-grid thead tr th {
  border: 1px solid #000; /* Garis grid header solid */
  padding: 6px 4px;
  font-weight: 700;
  color: #000;
  text-align: left;
  background-color: #f2f2f2; /* Sedikit shading abu di header agar kontras */
}
.print-table.full-grid tbody td {
  padding: 5px 4px;
  border: 1px solid #000; /* Garis grid body solid di semua sisi sel */
  vertical-align: middle;
}

/* Total Row Integrasi Grid */
.print-table.full-grid tbody tr.total-row td {
  border: 1px solid #000; /* Tetap ada garis grid di baris total */
  padding: 6px 4px;
}
.grand-total-cell {
  font-size: 12px;
}

/* Signature Block */
.sign-block {
  margin-top: 30px;
  float: right;
  width: 160px;
  text-align: center;
}
.sign-title {
  font-size: 11px;
}
.sign-space {
  height: 55px;
}
.sign-name {
  font-weight: 700;
  text-decoration: underline;
}

/* Helpers */
.text-center {
  text-align: center !important;
}
.text-right {
  text-align: right !important;
}
.text-upper {
  text-transform: uppercase !important;
}
.font-code {
  font-family: monospace;
  font-size: 12px;
}
.font-bold {
  font-weight: 700;
}
.mb-3 {
  margin-bottom: 12px;
}
.truncate {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Media Query untuk Print */
@media print {
  body {
    background: #fff;
    padding: 0;
    margin: 0;
  }
  .print-container {
    width: 100%;
    padding: 0;
    box-shadow: none;
  }
  /* Pastikan garis tercetak jelas */
  .print-table.full-grid {
    border: 1px solid #000 !important;
  }
  .print-table.full-grid th,
  .print-table.full-grid td {
    border: 1px solid #000 !important;
  }
}
</style>
