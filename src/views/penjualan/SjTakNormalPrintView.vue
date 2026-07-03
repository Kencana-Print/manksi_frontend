<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { sjTakNormalFormService as svc } from "@/services/penjualan/sjTakNormalFormService";

const route = useRoute();
const authStore = useAuthStore();
const nomor = route.query.nomor as string;

const header = ref<any>({});
const detail = ref<any[]>([]);
const totalJumlah = ref(0);
// ── Info cetak — user & datetime SAAT INI (bukan tanggal input
// transaksi), di-freeze sekali saat halaman render ──────────────
const formatPrintedAt = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const printedAtDisplay = ref(formatPrintedAt());
const printedByDisplay = computed(
  () => authStore.user?.nama || authStore.user?.kode || "-",
);
const isReady = ref(false);
const isLoading = ref(true);

const doPrint = () => window.print();
const doClose = () => window.close();

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Chunking detail per halaman ──────────────────────────────────────
const rowsPerPage = 10;
const paginatedDetails = computed(() => {
  const arr = detail.value || [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += rowsPerPage) {
    chunks.push(arr.slice(i, i + rowsPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
});

// ── Fetch data ────────────────────────────────────────────────────────
const fetchData = async () => {
  try {
    const res = await svc.getDataCetak(nomor);
    const d = res.data.data;
    header.value = d.header;
    detail.value = d.detail;
    totalJumlah.value = d.totalJumlah;
    isReady.value = true;
    setTimeout(() => window.print(), 600);
  } catch {
    alert("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  document.title = `Surat Jalan Tak Normal - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-root">
    <div v-if="isLoading" class="loading-screen">Menyiapkan cetak...</div>
    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span style="font-weight: 700; color: #1565c0"
          >Surat Jalan Tak Normal — {{ nomor }}</span
        >
        <div style="display: flex; gap: 8px">
          <button class="tbtn" @click="doPrint">🖨️ Cetak</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <div
        v-for="(pageRows, pi) in paginatedDetails"
        :key="'page-' + pi"
        class="page flex-col"
      >
        <div class="page-frame">
          <div class="page-content">
            <div class="header-section">
              <div class="kop-left">
                <div class="kop-nama">{{ header.perush_nama }}</div>
                <div class="kop-sub">{{ header.perush_alamat }}</div>
                <div
                  class="kop-sub"
                  v-if="header.perush_telp || header.perush_fax"
                >
                  {{ header.perush_telp
                  }}<span v-if="header.perush_telp && header.perush_fax">/</span
                  >{{ header.perush_fax }}
                </div>
              </div>
            </div>

            <div class="doc-title">S U R A T &nbsp; J A L A N</div>

            <div class="title-row">
              <table class="info-tbl">
                <tr>
                  <td class="lbl">Nomor</td>
                  <td>: {{ header.sj_nomor }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td>: {{ header.sj_tanggal_fmt }}</td>
                </tr>
                <tr>
                  <td class="lbl">Keterangan</td>
                  <td>: {{ header.sj_keterangan }}</td>
                </tr>
              </table>

              <div class="cus-box">
                <div class="page-indicator">
                  Page: {{ pi + 1 }}/{{ paginatedDetails.length }}
                </div>
                <div class="cus-line">
                  <b>Customer :</b> {{ header.cus_nama }}
                </div>
                <div class="cus-alamat">
                  {{ header.sj_alamat_customer || header.cus_alamat }}
                </div>
                <div class="cus-alamat">
                  {{ header.sj_kota_customer || header.cus_kota }}
                </div>
              </div>
            </div>

            <table class="dtbl">
              <thead>
                <tr>
                  <th style="width: 28px; text-align: center">No.</th>
                  <th style="width: 110px">Spk</th>
                  <th>Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 55px; text-align: right">Jml</th>
                  <th style="width: 50px; text-align: right">Koli</th>
                  <th style="min-width: 120px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in pageRows" :key="i">
                  <td style="text-align: center">
                    {{ pi * rowsPerPage + i + 1 }}
                  </td>
                  <td>{{ r.sjd_spk_nomor }}</td>
                  <td>{{ r.nama_barang }}</td>
                  <td>{{ r.sjd_ukuran }}</td>
                  <td style="text-align: right">{{ num(r.sjd_jumlah) }}</td>
                  <td style="text-align: right">{{ num(r.sjd_koli) }}</td>
                  <td>{{ r.sjd_keterangan }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="page-footer">
            <div class="foot-divider"></div>

            <!-- CATATAN: teks di bawah ini kemungkinan besar statis per
                 perusahaan di FastReport asli (fax/email), sumber field
                 di DB belum terkonfirmasi. Sesuaikan kalau ada field
                 resmi (mis. perush_fax / perush_email). -->
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="foot-note-row"
            >
              <div class="foot-note">
                MOHON SURAT JALAN INI DITANDATANGANI, DISTEMPEL, DAN DI FAX KE
                {{ header.perush_fax || header.perush_telp
                }}<br v-if="header.perush_email" />
                <template v-if="header.perush_email">
                  ATAU EMAIL DI {{ header.perush_email }}
                </template>
              </div>
              <div class="foot-total">Total Jumlah: {{ num(totalJumlah) }}</div>
            </div>

            <div v-if="pi === paginatedDetails.length - 1" class="ttd-row">
              <span>Dibuat Oleh,</span>
              <span>Disiapkan Oleh,</span>
              <span>Kepala Gudang,</span>
              <span>Pengantar,</span>
              <span>Diterima Oleh,</span>
            </div>
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="ttd-space"
            ></div>
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="ttd-row ttd-paren"
            >
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
            </div>

            <div class="printed-info">
              Dicetak oleh: {{ printedByDisplay }} — {{ printedAtDisplay }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #777;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #1565c0;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
}
.tbtn {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tbtn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.tbtn-grey {
  background: rgba(0, 0, 0, 0.2);
}

.print-root {
  background: #e0e0e0;
  min-height: 100vh;
  padding-top: 50px;
  padding-bottom: 20px;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.page {
  width: 297mm;
  min-height: 210mm;
  background: white;
  margin: 10px auto;
  box-sizing: border-box;
  border: 1px solid #ccc;
  page-break-after: always;
}

.page-frame {
  margin: 8mm;
  border: 2px solid #b8860b;
  padding: 6mm 8mm;
  font-family: "Courier New", monospace;
  font-size: 10pt;
  color: #000;
  display: flex;
  flex-direction: column;
  min-height: calc(210mm - 16mm - 12mm);
}

.page-content {
  flex: 1;
}

.header-section {
  margin-bottom: 4px;
}
.kop-nama {
  font-weight: 700;
}
.kop-sub {
  font-size: 10pt;
}

.doc-title {
  text-align: center;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: 0.15em;
  margin: 6px 0 10px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.info-tbl {
  border-collapse: collapse;
  font-size: 10pt;
  flex-shrink: 0;
}
.info-tbl td {
  padding: 0 4px 2px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 65px;
  white-space: nowrap;
}
.cus-box {
  font-size: 10pt;
  max-width: 55%;
  min-width: 0;
  text-align: right;
}
.cus-line {
  word-wrap: break-word;
}
.cus-alamat {
  line-height: 1.4;
  word-wrap: break-word;
}
.page-indicator {
  font-size: 9pt;
  text-align: right;
  margin-bottom: 2px;
}

.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  margin-bottom: 12px;
}
.dtbl th {
  border-top: 1px solid #000;
  border-bottom: 2px solid #000;
  padding: 4px 6px;
  font-weight: 700;
  text-align: left;
}
.dtbl td {
  padding: 4px 6px;
  border-bottom: none;
  vertical-align: top;
}

.page-footer {
  flex-shrink: 0;
}
.printed-info {
  font-size: 7.5pt;
  color: #777;
  text-align: right;
  margin-top: 8px;
}
.foot-divider {
  border-top: 1px solid #000;
  margin-bottom: 6px;
}
.foot-note-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 9.5pt;
  margin-bottom: 14px;
}
.foot-note {
  line-height: 1.5;
}
.foot-total {
  font-weight: 700;
  white-space: nowrap;
}

.ttd-row {
  display: flex;
  justify-content: space-between;
  font-size: 10pt;
}
.ttd-row span {
  flex: 1;
  text-align: left;
}
.ttd-space {
  height: 45px;
}
.ttd-paren {
  font-size: 10pt;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-root {
    background: white;
    padding: 0;
    margin: 0;
  }
  @page {
    size: 297mm 210mm;
    margin: 0;
  }
  .page {
    width: 297mm;
    min-height: 210mm;
    border: none;
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
}
</style>
