<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invoiceProformaFormService } from "@/services/penjualan/invoiceProformaFormService";

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>({});
const details = ref<any[]>([]);
const isReady = ref(false);

// Fungsi Terbilang (Rupiah) sederhana
const convertTerbilang = (angka: number): string => {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  let temp = "";

  if (angka < 12) {
    temp = " " + bilangan[angka];
  } else if (angka < 20) {
    temp = convertTerbilang(angka - 10) + " Belas";
  } else if (angka < 100) {
    temp =
      convertTerbilang(Math.floor(angka / 10)) +
      " Puluh" +
      convertTerbilang(angka % 10);
  } else if (angka < 200) {
    temp = " Seratus" + convertTerbilang(angka - 100);
  } else if (angka < 1000) {
    temp =
      convertTerbilang(Math.floor(angka / 100)) +
      " Ratus" +
      convertTerbilang(angka % 100);
  } else if (angka < 2000) {
    temp = " Seribu" + convertTerbilang(angka - 1000);
  } else if (angka < 1000000) {
    temp =
      convertTerbilang(Math.floor(angka / 1000)) +
      " Ribu" +
      convertTerbilang(angka % 1000);
  } else if (angka < 1000000000) {
    temp =
      convertTerbilang(Math.floor(angka / 1000000)) +
      " Juta" +
      convertTerbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    temp =
      convertTerbilang(Math.floor(angka / 1000000000)) +
      " Milyar" +
      convertTerbilang(angka % 1000000000);
  } else if (angka < 1000000000000000) {
    temp =
      convertTerbilang(Math.floor(angka / 1000000000000)) +
      " Triliun" +
      convertTerbilang(angka % 1000000000000);
  }
  return temp;
};

// Fungsi pembungkus yang dipanggil di template
const terbilang = (angka: number): string => {
  angka = Math.floor(Math.abs(Number(angka) || 0)); // Bulatkan & buang desimal
  if (angka === 0) return "Nol";

  // Trim HANYA dilakukan satu kali di hasil akhir
  return convertTerbilang(angka).trim();
};

const fetchData = async () => {
  try {
    const res = await invoiceProformaFormService.getDetail(nomor);
    header.value = res.data.data.header;
    details.value = res.data.data.details;
    isReady.value = true;

    // Auto print setelah dirender
    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    alert("Gagal memuat data cetak.");
  }
};

const numFmt = (val: any) => {
  if (!val) return "0";
  return Number(val).toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

const dFormat = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Kalkulasi Total
const totalNominal = computed(() => {
  return details.value.reduce(
    (sum, d) => sum + (Number(d.jumlah) || 0) * (Number(d.harga) || 0),
    0,
  );
});
const totalPpn = computed(() => {
  return header.value.inv_sts_ppn === 1
    ? totalNominal.value * ((Number(header.value.inv_ppn) || 0) / 100)
    : 0;
});
const grandTotal = computed(() => totalNominal.value + totalPpn.value);
const nilaiPiutang = computed(
  () => grandTotal.value - (Number(header.value.uang_muka) || 0),
);

onMounted(() => {
  document.title = `INV PROFORMA - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-container" v-if="isReady">
    <!-- KOP PERUSAHAAN -->
    <div class="kop-perush">
      <div>{{ header.perush_nama }}</div>
      <div>{{ header.perushd_alamat || header.perush_alamat || "" }}</div>
      <div>{{ header.perush_kota || "" }}</div>
      <div v-if="header.perush_telp">Telp: {{ header.perush_telp }}</div>
    </div>

    <!-- JUDUL -->
    <div class="invoice-title">I N V O I C E &nbsp; P R O F O R M A</div>

    <!-- HEADER INFO -->
    <div class="info-grid">
      <div class="info-kiri">
        <div class="row-info">
          <span class="lbl">Nomor</span><span class="sep">:</span>
          <span class="val">{{ header.inv_nomor }}</span>
        </div>
        <div class="row-info">
          <span class="lbl">Tanggal</span><span class="sep">:</span>
          <span class="val">{{ dFormat(header.inv_tanggal) }}</span>
        </div>
        <div class="row-info">
          <span class="lbl">Keterangan</span><span class="sep">:</span>
          <span class="val">{{ header.inv_keterangan }}</span>
        </div>
      </div>
      <div class="info-kanan">
        <div class="row-info">
          <span class="lbl">Customer</span><span class="sep">:</span>
          <span class="val">{{ header.cus_nama }}</span>
        </div>
        <div class="row-info">
          <span class="lbl"></span><span class="sep"></span>
          <span class="val">{{
            header.inv_cus_alamat || header.cus_alamat
          }}</span>
        </div>
        <div class="row-info">
          <span class="lbl"></span><span class="sep"></span>
          <span class="val"
            >{{ header.cus_telp ? header.cus_telp + " / " : ""
            }}{{ header.cus_fax || "" }}</span
          >
        </div>
      </div>
    </div>

    <!-- TABEL BARANG -->
    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 30px" class="tc">No</th>
          <th style="width: 140px">SPK</th>
          <th>Nama</th>
          <th style="width: 120px">Ukuran</th>
          <th style="width: 80px" class="tr">Jumlah</th>
          <th style="width: 120px" class="tr">Harga</th>
          <th style="width: 130px" class="tr">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in details" :key="idx">
          <td class="tc">{{ idx + 1 }}</td>
          <td>{{ item.kode }}</td>
          <td>{{ item.nama }}</td>
          <td>{{ item.ukuran }}</td>
          <td class="tr">{{ numFmt(item.jumlah) }}</td>
          <td class="tr">{{ numFmt(item.harga) }}</td>
          <td class="tr">{{ numFmt(item.jumlah * item.harga) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- KAKI / SUMMARY -->
    <div class="summary-box">
      <div class="terbilang-box">
        <i>Terbilang : {{ terbilang(grandTotal) }} Rupiah</i>
      </div>
      <div class="totals-box">
        <div class="row-tot">
          <span class="lbl">Total</span><span class="sep">:</span>
          <span class="val">{{ numFmt(totalNominal) }}</span>
        </div>
        <div class="row-tot">
          <span class="lbl">Total PPN</span><span class="sep">:</span>
          <span class="val">{{ numFmt(totalPpn) }}</span>
        </div>
        <div class="row-tot">
          <span class="lbl fw-bold">Grand Total</span><span class="sep">:</span>
          <span class="val fw-bold">{{ numFmt(grandTotal) }}</span>
        </div>
        <div class="row-tot mt-2">
          <span class="lbl">Uang Muka</span><span class="sep">:</span>
          <span class="val">{{ numFmt(header.uang_muka) }}</span>
        </div>
        <div class="row-tot">
          <span class="lbl fw-bold">Nilai Piutang</span
          ><span class="sep">:</span>
          <span class="val fw-bold">{{ numFmt(nilaiPiutang) }}</span>
        </div>
      </div>
    </div>

    <!-- TANDA TANGAN -->
    <div class="ttd-area">
      <div class="ttd-box-bayar">
        <div class="fw-bold">Di bayarkan ke:</div>
        <div class="mt-2">REKENING : {{ header.inv_rekening }}</div>
        <div>ATAS NAMA: {{ header.perushd_atasnama }}</div>
        <div>BANK &nbsp; &nbsp; : {{ header.perushd_bank }}</div>
      </div>
      <div class="ttd-box tc">
        <div>Dibuat oleh,</div>
        <div class="space-ttd"></div>
        <div>
          ( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
          &nbsp; )
        </div>
      </div>
      <div class="ttd-box tc">
        <div>Mengetahui,</div>
        <div class="space-ttd"></div>
        <div>
          ( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
          &nbsp; )
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 10mm 15mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Base Print Styles */
.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  font-family:
    "Courier New", Courier, monospace; /* Font mirip dot-matrix / struk kasir */
  font-size: 13px;
  color: #000;
  line-height: 1.4;
  background: white;
  padding: 10px;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.mt-2 {
  margin-top: 8px;
}

/* KOP */
.kop-perush {
  font-size: 13px;
  margin-bottom: 20px;
}

/* TITLE */
.invoice-title {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 20px;
  text-decoration: underline;
}

/* HEADER INFO */
.info-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}
.info-kiri {
  width: 50%; /* Memaksa kotak kiri maksimal 50% */
  padding-right: 20px;
}
.info-kanan {
  width: 48%; /* Memaksa kotak kanan maksimal 48% */
}
.row-info {
  display: flex;
  align-items: flex-start;
}
.row-info .lbl {
  width: 90px;
  flex-shrink: 0;
}
.row-info .sep {
  width: 15px;
  text-align: center;
  flex-shrink: 0;
}
.row-info .val {
  flex: 1;
}

/* TABLE */
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}
.print-table th {
  border-top: 1px dashed #000;
  border-bottom: 1px dashed #000;
  padding: 6px 4px;
  font-weight: normal;
  text-align: left;
}
.print-table td {
  padding: 4px;
  vertical-align: top;
}
.print-table tbody tr:last-child td {
  border-bottom: 1px dashed #000;
  padding-bottom: 10px;
}

/* SUMMARY */
.summary-box {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}
.terbilang-box {
  flex: 1;
  padding-right: 20px;
}
.totals-box {
  width: 300px;
}
.row-tot {
  display: flex;
  align-items: center;
}
.row-tot .lbl {
  width: 120px;
}
.row-tot .sep {
  width: 15px;
  text-align: center;
}
.row-tot .val {
  flex: 1;
  text-align: right;
}

/* SIGNATURES */
.ttd-area {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
}
.ttd-box-bayar {
  width: 45%; /* Diperlebar agar teks "Rekening" tidak turun ke bawah */
}
.ttd-box {
  width: 25%;
}
.space-ttd {
  height: 60px;
}
</style>
