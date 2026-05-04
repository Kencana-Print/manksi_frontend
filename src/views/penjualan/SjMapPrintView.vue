<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

// Import Logo dari assets (Pastikan file ini ada di folder src/assets/)
import logoJA from "@/assets/ja.jpg";
import logoKP from "@/assets/kp.jpg";
import logoMD from "@/assets/md.jpg";

const route = useRoute();
const rawData = ref<any[]>([]);
const header = ref<any>({});
const isLoading = ref(true);

const fetchPrintData = async () => {
  try {
    const res = await api.get(
      `/penjualan/sj-map/print-data/${encodeURIComponent(route.params.nomor as string)}`,
    );
    rawData.value = res.data.data;
    // Ambil baris pertama sebagai referensi header
    header.value = res.data.data[0] || {};

    // Auto print
    setTimeout(() => {
      window.print();
    }, 1000);
  } catch (e) {
    console.error("Gagal memuat data cetak", e);
  } finally {
    isLoading.value = false;
  }
};

// Kunci penting: Gunakan casing yang tepat sesuai JSON Backend (SJ_Perush_kode)
const perushKode = computed(
  () => header.value.SJ_Perush_kode?.toUpperCase() || "",
);

const companyLogo = computed(() => {
  if (perushKode.value === "JA") return logoJA;
  if (perushKode.value === "MD") return logoMD;
  if (perushKode.value === "KP") return logoKP;
  return null; // SM tanpa logo
});

onMounted(fetchPrintData);
</script>

<template>
  <div v-if="!isLoading" class="print-wrapper">
    <div class="page">
      <div v-if="perushKode === 'SM'" class="header-sm">
        <div class="perush-name-sm">{{ header.perush_nama }}</div>
        <div class="perush-addr-sm">{{ header.perush_alamat }}</div>
        <div class="perush-addr-sm">
          Telp {{ header.perush_telp }} / Fax {{ header.perush_fax }}
        </div>
        <div class="perush-addr-sm">{{ header.perush_email }}</div>
      </div>

      <div v-else class="header-with-logo">
        <img v-if="companyLogo" :src="companyLogo" class="logo-img" />
        <div class="company-text">
          <div class="perush-name" :class="{ 'text-ja': perushKode === 'JA' }">
            {{ header.perush_nama }}
          </div>
          <div class="perush-addr">{{ header.perush_alamat }}</div>
          <div class="perush-addr">
            Telp {{ header.perush_telp }}
            <span v-if="header.perush_fax"> / Fax {{ header.perush_fax }}</span>
          </div>
          <div class="perush-addr">{{ header.perush_email }}</div>
        </div>
      </div>

      <div class="meta-section">
        <div class="recipient-box">
          <div>Kepada YTH</div>
          <div class="fw-bold">{{ header.cus_nama }}</div>
          <div class="pre-wrap">{{ header.sj_alamat_customer }}</div>
          <div>{{ header.sj_kota_customer }}</div>
          <div class="fw-bold mt-1" v-if="header.sj_up">
            Up. {{ header.sj_up }}
          </div>
        </div>
        <div class="info-box">
          <table class="meta-table">
            <tr>
              <td width="75">Tanggal</td>
              <td>: {{ header.tgl_indo }}</td>
            </tr>
            <tr>
              <td>Perihal</td>
              <td>: <b>Surat Jalan</b></td>
            </tr>
            <tr>
              <td>No</td>
              <td>: {{ header.SJ_Nomor }}</td>
            </tr>
            <tr>
              <td>Keterangan</td>
              <td>: {{ header.SJ_Keterangan || "-" }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="opening">
        <p>Dengan Hormat,</p>
        <p>
          Bersama ini kami kirimkan sampel barang sesuai dengan permintaan
          Bapak/Ibu dengan spesifikasi sebagai berikut :
        </p>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th>Nama</th>
            <th width="120">Ukuran</th>
            <th width="60">Jumlah</th>
            <th width="80">Paraf</th>
            <th width="150">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in rawData" :key="i">
            <td class="tc">{{ i + 1 }} .</td>
            <td class="text-uppercase">{{ item.Mspk_nama }}</td>
            <td>{{ item.sjd_ukuran }}</td>
            <td class="tc">{{ item.sjd_jumlah }}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="note">
        * Note : Kolom paraf mohon diparaf jika telah ACC dan dikirim via fax
        atau email
      </div>

      <div v-if="perushKode !== 'JA'" class="footer-inline mt-8">
        <div class="feedback-section">
          <p>
            Jika ada hal-hal yang masih belum sesuai mohon ditulis di bawah ini
            :
          </p>
          <div class="feedback-box"></div>
        </div>
        <div class="signature-grid mt-4">
          <div class="sign-box">
            <div>Yang Menerima,</div>
            <div class="sign-space"></div>
            <div>(Nama Terang)</div>
          </div>
          <div class="sign-box">
            <div>Yang Menyerahkan,</div>
            <div class="sign-space"></div>
            <div class="fw-bold">Chief Marketing Officer</div>
          </div>
        </div>
        <div class="checklist-wrapper">
          <table class="checklist-table">
            <tr>
              <th>Font</th>
              <th>Tata letak</th>
              <th>Warna</th>
              <th>Model</th>
              <th>Gambar</th>
              <th>Finishing</th>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <div v-if="perushKode === 'JA'" class="page">
      <div class="header-with-logo">
        <img :src="logoJA" class="logo-img" />
        <div class="company-text">
          <div class="perush-name text-ja">{{ header.perush_nama }}</div>
          <div class="perush-addr">{{ header.perush_alamat }}</div>
        </div>
      </div>

      <div class="meta-section mt-4 border-none-boxes">
        <div class="recipient-box border-none">
          <div>Kepada YTH</div>
          <div class="fw-bold">{{ header.cus_nama }}</div>
          <div class="fw-bold">Up. {{ header.sj_up }}</div>
        </div>
        <div class="info-box border-none">
          <table class="meta-table">
            <tr>
              <td width="70">Tanggal</td>
              <td>: {{ header.tgl_indo }}</td>
            </tr>
            <tr>
              <td>No</td>
              <td>: {{ header.SJ_Nomor }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="feedback-section mt-6">
        <p>
          Jika ada hal-hal yang masih belum sesuai mohon ditulis di bawah ini :
        </p>
        <div class="feedback-box feedback-large"></div>
        <p class="mt-4">
          Demikian Surat Serah Terima Approval Sampel ini kami sampaikan.
        </p>
      </div>

      <div class="footer-p2 mt-10">
        <div class="signature-grid">
          <div class="sign-box">
            <div>Yang Menerima,</div>
            <div class="sign-space"></div>
            <div>(Nama Terang)</div>
          </div>
          <div class="sign-box">
            <div>Yang Menyerahkan,</div>
            <div class="sign-space"></div>
            <div class="fw-bold">Chief Marketing Officer</div>
          </div>
        </div>

        <div class="checklist-wrapper">
          <table class="checklist-table">
            <thead>
              <tr>
                <th>Font</th>
                <th>Tata letak</th>
                <th>Warna</th>
                <th>Model</th>
                <th>Gambar</th>
                <th>Finishing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-wrapper {
  background: #f0f0f0;
  padding: 20px 0;
  min-height: 100vh;
}
.page {
  width: 210mm;
  /* Jangan gunakan 290mm karena A4 itu 297mm, 
     ditambah padding/border bisa kelebihan */
  min-height: 280mm;
  padding: 15mm;
  margin: 0 auto 10mm;
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  position: relative;
}
.page:not(:last-child) {
  page-break-after: always;
}

/* Header */
.header-with-logo {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
.logo-img {
  max-height: 75px;
  width: auto;
}
.perush-name {
  font-size: 18px;
  font-weight: bold;
  color: #cc0000;
}
.text-ja {
  color: #002060 !important;
}
.header-sm {
  margin-bottom: 20px;
  border-bottom: 1px solid #000;
  padding-bottom: 5px;
}
.perush-name-sm {
  font-size: 18px;
  font-weight: bold;
}

/* Meta */
.meta-section {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 15px;
}
.recipient-box {
  flex: 1;
  border: 1px solid #000;
  padding: 8px;
  min-height: 90px;
}
.info-box {
  width: 38%;
  border: 1px solid #000;
  padding: 8px;
}
.border-none {
  border: none !important;
  padding: 0 !important;
}
.meta-table td {
  vertical-align: top;
  padding: 1px 0;
}

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
.data-table th,
.data-table td {
  border: 1px solid #000;
  padding: 5px 8px;
}
.data-table th {
  background: #eee;
  text-align: center;
}

/* Footer & Sign */
.feedback-box {
  width: 100%;
  height: 100px;
  border: 1px solid #000;
  margin-top: 5px;
}
.feedback-large {
  height: 200px;
}
.signature-grid {
  display: flex;
  justify-content: space-between;
  text-align: center;
}
.sign-box {
  width: 45%;
}
.sign-space {
  height: 60px;
}
.checklist-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}
.checklist-table {
  border-collapse: collapse;
}
.checklist-table th,
.checklist-table td {
  border: 1px solid #000;
  width: 55px;
  height: 22px;
  text-align: center;
  font-size: 9px;
}

/* Utils */
.fw-bold {
  font-weight: bold;
}
.tc {
  text-align: center;
}
.text-uppercase {
  text-transform: uppercase;
}
.mt-8 {
  margin-top: 32px;
}
.mt-10 {
  margin-top: 40px;
}

@media print {
  .print-wrapper {
    background: none;
    padding: 0;
  }
  .page {
    margin: 0;
    box-shadow: none;
    border: none;
    /* Pastikan tinggi tidak memaksa kertas baru */
    min-height: 0;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
</style>
