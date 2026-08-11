<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { poBahanFormService } from "@/services/pembelian/poBahanFormService";
import logoImg from "@/assets/logo.png";

const route = useRoute();
const nomorPO = String(route.params.nomor);
const satuanPilihan = String(route.query.satuan || "METER");

const dataPO = ref<any>(null);
const isLoading = ref(true);

const terbilang = (angka: number): string => {
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
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + " Belas";
  if (angka < 100)
    return (
      terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10)
    );
  if (angka < 200) return "Seratus " + terbilang(angka - 100);
  if (angka < 1000)
    return (
      terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100)
    );
  if (angka < 2000) return "Seribu " + terbilang(angka - 1000);
  if (angka < 1000000)
    return (
      terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000)
    );
  if (angka < 1000000000)
    return (
      terbilang(Math.floor(angka / 1000000)) +
      " Juta " +
      terbilang(angka % 1000000)
    );
  return "";
};

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

const formatTanggalDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return "";
  const ymd = dateStr.substring(0, 10).split("-");
  if (ymd.length === 3) return `${ymd[2]}-${ymd[1]}-${ymd[0]}`;
  return dateStr;
};

const formatNum = (num: number, decimals: number = 0) => {
  return Number(num || 0).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Gabungkan baris yang kode, nama, satuan, gramasi awal/akhir, setting,
// harga DPP, dan harga-nya sama persis — qty & total di-SUM. Kode ikut
// jadi kunci grouping (relevan buat PO Bahan yang nampilin kolom Kode;
// untuk Greige kolom Kode memang tidak ditampilkan tapi tetap aman
// disertakan karena baris yang sama nama pasti sama kode-nya juga).
const groupIdenticalItems = (items: any[], poJenis: number) => {
  const groupedItems: Record<string, any> = {};
  items.forEach((item: any) => {
    const nama = item.pod_namaext || item.bhn_name || "";
    const kode = item.pod_bhn_kode || "";
    const key = [
      kode,
      nama,
      item.satuan_print,
      item.pod_gramasia || "",
      item.gramasi || "",
      item.setting || "",
      item.harga_dpp_print,
      item.harga_setelah_ppn_print,
    ].join("_");

    if (!groupedItems[key]) {
      groupedItems[key] = { ...item };
    } else {
      groupedItems[key].qty_print += item.qty_print;
      groupedItems[key].total_print += item.total_print;
    }
  });
  return Object.values(groupedItems);
};

onMounted(async () => {
  try {
    const res = await poBahanFormService.getDetail(nomorPO);
    const d = res.data.data;

    const ppnPercent = Number(d.header?.po_ppn) || 0;
    const ppnActive = Number(d.header?.po_status_ppn) === 1;

    let itemsConverted = (d.items || []).map((row: any) => {
      let isMtr = row.pod_bhn_satuan === "MTR";
      let qty = Number(row.pod_Jumlah) || 0;
      let hargaDpp = Number(row.pod_hargabeli) || 0;
      let sat = row.pod_bhn_satuan;

      if (isMtr && satuanPilihan === "YARD") {
        sat = "YARD";
        qty = qty * 1.09361;
        hargaDpp = hargaDpp / 1.09361;
      }

      const hargaSetelahPpn = ppnActive
        ? hargaDpp * (1 + ppnPercent / 100)
        : hargaDpp;

      return {
        ...row,
        satuan_print: sat,
        qty_print: qty,
        harga_dpp_print: hargaDpp,
        harga_setelah_ppn_print: hargaSetelahPpn,
        total_print: qty * hargaDpp * (1 - (Number(row.pod_disc) || 0) / 100),
      };
    });

    // ⬅ Grouping baris yang identik — jalan untuk PO Greige (jenis=1)
    // maupun PO Bahan (default). PO Celup (jenis=2) TIDAK di-group,
    // karena detail roll di halaman 2 butuh baris tetap terpisah
    // per pod3/roll, jadi header item-nya pun dibiarkan apa adanya.
    if (d.header?.po_jenis !== 2) {
      itemsConverted = groupIdenticalItems(itemsConverted, d.header?.po_jenis);
    }

    const rollsConverted = (d.rolls || []).map((row: any) => ({
      no: Number(row.pod3_no) || 0,
      kode: row.pod3_bhn_kode || "",
      nama: row.bhn_name || "",
      satuan: row.bhn_satuan || "",
      jumlah: Number(row.pod3_jumlah) || 0,
    }));

    dataPO.value = {
      header: d.header,
      items: itemsConverted,
      delivery: d.delivery || [],
      rolls: rollsConverted,
    };

    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    console.error("Gagal memuat data cetak", error);
  } finally {
    isLoading.value = false;
  }
});

// LOGIKA COMPUTED
const isGreige = computed(() => dataPO.value?.header?.po_jenis === 1);
const isCelup = computed(() => dataPO.value?.header?.po_jenis === 2);
const isBahan = computed(
  () =>
    dataPO.value?.header?.po_jenis !== 1 &&
    dataPO.value?.header?.po_jenis !== 2,
);

const groupedRolls = computed(() => {
  if (!dataPO.value?.rolls) return [];
  const groups: Record<string, any[]> = {};
  dataPO.value.rolls.forEach((r: any) => {
    if (!groups[r.kode]) groups[r.kode] = [];
    groups[r.kode].push(r);
  });
  return Object.values(groups);
});

const subTotal = computed(
  () =>
    dataPO.value?.items.reduce((s: number, r: any) => s + r.total_print, 0) ||
    0,
);
const ppnValue = computed(() =>
  dataPO.value?.header?.po_status_ppn === 1
    ? subTotal.value * (Number(dataPO.value.header.po_ppn) / 100)
    : 0,
);
const grandTotal = computed(() => subTotal.value + ppnValue.value);
</script>

<template>
  <div v-if="isLoading" class="loading-screen">Memuat Dokumen Cetak...</div>

  <div v-else class="print-container">
    <!-- ================= HALAMAN 1: PO UTAMA ================= -->
    <div class="print-page">
      <!-- Header & Logo -->
      <div class="header">
        <img :src="logoImg" alt="Kencana Print" class="print-logo" />
        <h2 class="company-title">CV. Kencana Print</h2>
        <p class="company-address">Padokan RT 04 / 04 Sawahan Ngemplak</p>
        <p class="company-address">Telp Boyolali / Fax 0271-740634</p>
        <p class="company-address">0271-740634</p>
      </div>

      <div class="info-box">
        <div class="info-left">
          <p>Kepada YTH :</p>
          <p class="supplier-name">{{ dataPO.header.sup_nama }}</p>
          <p>{{ dataPO.header.sup_alamat }}</p>
          <p>{{ dataPO.header.sup_kota }}</p>
          <p>Up. {{ dataPO.header.sup_cp || "" }}</p>
        </div>
        <div class="info-right">
          <table>
            <tr>
              <td width="60">Tanggal</td>
              <td width="10">:</td>
              <td>{{ formatDate(dataPO.header.po_tanggal) }}</td>
            </tr>
            <tr>
              <td>Perihal</td>
              <td>:</td>
              <td>
                {{
                  dataPO.header.po_jenis === 1
                    ? "PO GREIGE"
                    : dataPO.header.po_jenis === 2
                      ? "PO CELUP"
                      : "PO BAHAN"
                }}
              </td>
            </tr>
            <tr>
              <td>No</td>
              <td>:</td>
              <td>{{ dataPO.header.po_nomor }}</td>
            </tr>
          </table>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <!-- Kolom Kode muncul khusus untuk PO Bahan -->
            <th width="80" v-if="isBahan">Kode</th>
            <th>Nama</th>
            <th width="45">Satuan</th>
            <th width="65">Qty</th>
            <th width="60">Gramasi<br />Awal</th>
            <th width="60">Gramasi<br />Akhir</th>
            <th width="50">Setting</th>
            <th width="80">Harga Dpp</th>
            <th width="80">Harga</th>
            <th width="40">Disc</th>
            <th width="100">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in dataPO.items" :key="index">
            <td class="tc">{{ Number(index) + 1 }}.</td>
            <td class="tc" v-if="isBahan">{{ item.pod_bhn_kode }}</td>
            <td class="nama-cell">{{ item.pod_namaext || item.bhn_name }}</td>
            <td class="tc">{{ item.satuan_print }}</td>
            <td class="tr">{{ formatNum(item.qty_print, 2) }}</td>
            <td class="tc">{{ item.pod_gramasia || "-" }}</td>
            <td class="tc">{{ item.gramasi || "-" }}</td>
            <td class="tc">{{ item.setting || "-" }}</td>
            <td class="tr">{{ formatNum(item.harga_dpp_print) }}</td>
            <td class="tr">{{ formatNum(item.harga_setelah_ppn_print) }}</td>
            <td class="tc">{{ item.pod_disc }}</td>
            <td class="tr">{{ formatNum(item.total_print) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <!-- Colspan otomatis menyesuaikan keberadaan kolom "Kode" -->
          <tr>
            <td :colspan="isBahan ? 11 : 10" class="tr">Total</td>
            <td class="tr fw">{{ formatNum(subTotal) }}</td>
          </tr>
          <tr v-if="dataPO.header.po_status_ppn === 1">
            <td :colspan="isBahan ? 11 : 10" class="tr">Ppn</td>
            <td class="tr fw">{{ formatNum(ppnValue) }}</td>
          </tr>
          <tr>
            <td :colspan="isBahan ? 11 : 10" class="tr">Grand Total</td>
            <td class="tr fw">{{ formatNum(grandTotal) }}</td>
          </tr>
        </tfoot>
      </table>

      <p class="terbilang">
        {{ terbilang(Math.round(grandTotal)).toUpperCase() }} RUPIAH
      </p>

      <div class="footer-section">
        <!-- Wrapper Note & Delivery -->
        <div class="notes-wrapper">
          <!-- ⬅ BARU: Background Kuning aktif untuk PO Greige atau Bahan -->
          <div
            class="note-box"
            :class="{ 'bg-yellow': isBahan || isGreige, 'bg-pink': isCelup }"
          >
            <b>Note : </b>{{ dataPO.header.po_note }}
          </div>

          <!-- Delivery Commitment khusus PO Bahan -->
          <div
            v-if="isBahan && dataPO.delivery && dataPO.delivery.length > 0"
            class="delivery-box mt-3"
          >
            <p class="mb-1">Delivery Commitment :</p>
            <p v-for="(del, idx) in dataPO.delivery" :key="idx" class="mb-0">
              {{ formatTanggalDDMMYYYY(del.pod2_tanggal || del.tanggal) }} :
              {{ formatNum(del.pod2_jumlah || del.jumlah) }}
            </p>
          </div>
        </div>

        <div class="signatures">
          <p>Hormat Kami,</p>
          <br /><br /><br />
          <p>Sukiman Setyo Manunggal</p>
        </div>
      </div>
    </div>

    <!-- ================= HALAMAN 2: DETAIL ROLL (JIKA CELUP) ================= -->
    <div
      v-if="isCelup && groupedRolls.length > 0"
      class="print-page page-break"
    >
      <div class="roll-header">
        <table>
          <tr>
            <td width="80">Nomor PO</td>
            <td width="10">:</td>
            <td>
              <b>{{ dataPO.header.po_nomor }}</b>
            </td>
          </tr>
          <tr>
            <td>DETAIL ROLL</td>
            <td></td>
            <td></td>
          </tr>
        </table>
      </div>

      <div v-for="(group, gIdx) in groupedRolls" :key="gIdx" class="roll-group">
        <table class="roll-table">
          <thead>
            <tr>
              <th width="40">No</th>
              <th width="100">Kode</th>
              <th>Nama</th>
              <th width="60">Satuan</th>
              <th width="80">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(roll, rIdx) in group" :key="rIdx">
              <td class="tc">{{ roll.no }}</td>
              <td class="tc">{{ roll.kode }}</td>
              <td>{{ roll.nama }}</td>
              <td class="tc">{{ roll.satuan }}</td>
              <td class="tr">{{ formatNum(roll.jumlah, 2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="tr">Total :</td>
              <td class="tr fw">
                {{
                  formatNum(
                    group.reduce((s, r) => s + Number(r.jumlah), 0),
                    2,
                  )
                }}
              </td>
            </tr>
          </tfoot>
        </table>
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
  .page-break {
    page-break-before: always;
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
  margin-bottom: 10px;
}
.print-logo {
  height: 45px;
  margin-bottom: 5px;
  object-fit: contain;
}
.company-title {
  font-size: 14px;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 2px 0;
}
.company-address {
  margin: 0;
  font-size: 11px;
}

.info-box {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}
.info-left {
  border: 1px solid #000;
  padding: 6px 8px;
  width: 50%;
  border-radius: 2px;
}
.info-left p {
  margin: 2px 0;
}
.supplier-name {
  font-weight: bold;
  font-size: 12px;
}
.info-right table {
  border-collapse: collapse;
}
.info-right td {
  padding: 2px 4px;
  vertical-align: top;
  font-weight: bold;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
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
.terbilang {
  margin-top: 5px;
  font-size: 10px;
  text-transform: uppercase;
}

.footer-section {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

/* Styles untuk Notes & Delivery */
.notes-wrapper {
  width: 60%;
}
.bg-yellow {
  background-color: #ffff00 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.bg-pink {
  background-color: #ffc0cb !important;
  color: #000 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.note-box {
  font-size: 10px;
  white-space: pre-wrap;
  padding: 8px;
  min-height: 50px;
  display: inline-block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
}
.delivery-box p {
  font-size: 10px;
  margin: 0;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-0 {
  margin-bottom: 0;
}
.mt-3 {
  margin-top: 12px;
}

.signatures {
  width: 30%;
  text-align: center;
}
.signatures p {
  margin: 0;
}

.roll-header {
  margin-bottom: 15px;
  font-size: 11px;
}
.roll-header table {
  border-collapse: collapse;
}
.roll-header td {
  padding: 2px;
}
.roll-group {
  margin-bottom: 20px;
}
.roll-table {
  width: 60%;
  border-collapse: collapse;
}
.roll-table th,
.roll-table td {
  border: 1px solid #000;
  padding: 4px;
  font-size: 10px;
}
.roll-table th {
  text-align: center;
  font-weight: bold;
}
.nama-cell {
  white-space: nowrap;
}
</style>
