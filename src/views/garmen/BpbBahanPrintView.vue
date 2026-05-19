<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { bpbBahanFormService } from "@/services/garmen/bpbBahanFormService";
import { useToast } from "vue-toastification";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<any>(null);

const isPo = computed(() => {
  const noPo =
    data.value?.header?.bpb_po_Nomor || data.value?.header?.bpb_po_nomor;
  return !!(noPo && noPo.trim() !== "");
});

const loadData = async () => {
  try {
    const nomor = String(route.params.nomor);
    const res = await bpbBahanFormService.getDetail(nomor);
    data.value = res.data.data;
    setTimeout(() => {
      window.print();
    }, 600);
  } catch (error: any) {
    toast.error("Gagal memuat data cetak: " + error.message);
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const formatDate = (val: string) => {
  if (!val) return "-";
  const d = new Date(val);
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

const numFmt = (v: any) =>
  Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 });
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <!-- Looping 2 Copy (Sesuai image_d44c77.png) -->
    <div v-for="copyIdx in 2" :key="copyIdx" class="print-page">
      <!-- Header -->
      <div class="print-header">
        <div class="company-info">
          <div class="company-name">CV. Kencana Print</div>
          <div class="company-addr">Padokan RT 04 / 04 Sawahan Ngemplak</div>
          <div class="company-telp">0271-740634</div>
        </div>
        <div class="doc-title-wrap">
          <div class="doc-title">{{ isPo ? "BPB PO" : "BPB NON PO" }}</div>
        </div>
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Logo" class="print-logo" />
        </div>
      </div>

      <!-- Info -->
      <div class="info-section">
        <div class="info-left">
          <table>
            <tr>
              <td width="70">Nomor</td>
              <td>: {{ data.header.bpb_Nomor || data.header.bpb_nomor }}</td>
            </tr>
            <tr>
              <td>Tanggal</td>
              <td>
                :
                {{
                  formatDate(data.header.bpb_Tanggal || data.header.bpb_tanggal)
                }}
              </td>
            </tr>
            <tr>
              <td>Keterangan</td>
              <td>
                :
                {{
                  data.header.bpb_Keterangan ||
                  data.header.bpb_keterangan ||
                  "-"
                }}
              </td>
            </tr>
          </table>
        </div>
        <div class="info-right">
          <table>
            <tr>
              <td width="70">Gudang</td>
              <td>: {{ data.header.gdg_nama }}</td>
            </tr>
            <tr v-if="isPo">
              <td>No. PO</td>
              <td>
                : {{ data.header.bpb_po_Nomor || data.header.bpb_po_nomor }}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Tabel -->
      <table class="detail-table">
        <thead>
          <tr>
            <th width="30" class="tc">No</th>
            <th width="100">Kode</th>
            <th>Nama Bahan</th>
            <th width="60" class="tc">Satuan</th>
            <th width="100" class="tr">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in data.items" :key="idx">
            <td class="tc">{{ Number(idx) + 1 }}</td>
            <td>{{ item.kode }}</td>
            <td class="text-truncate">{{ item.nama }}</td>
            <td class="tc">{{ item.satuan }}</td>
            <td class="tr">{{ numFmt(item.jumlah) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="tr fw-bold">TOTAL</td>
            <td class="tr fw-bold">
              {{
                numFmt(
                  data.items.reduce(
                    (s: number, i: any) => s + Number(i.jumlah),
                    0,
                  ),
                )
              }}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Footer Tanda Tangan -->
      <div class="print-footer">
        <div class="sign-box">
          <div>Dibuat Oleh,</div>
          <div class="sign-space"></div>
          <div>( {{ data.header.user_create }} )</div>
        </div>
        <div class="sign-box">
          <div>Checkers,</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
        <div class="sign-box">
          <div>Kepala Gudang,</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
        <div class="sign-box">
          <div>Manager,</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
      </div>

      <div class="print-meta">
        Printed by {{ data.header.user_create }} at
        {{ new Date().toLocaleString() }}
      </div>

      <!-- Divider Putus-putus antar copy (Hanya tampil di copy pertama) -->
      <div v-if="copyIdx === 1" class="copy-divider"></div>
    </div>
  </div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}

/* Wrapper utama untuk mencegah stretch di layar lebar */
.print-container {
  width: 21cm; /* Standar A4 */
  margin: 0 auto;
  background: #525659; /* Warna abu-abu background preview browser */
  padding: 20px 0;
}

.print-page {
  width: 21cm;
  min-height: 14cm; /* Estimasi setengah halaman A4 per copy */
  padding: 0.8cm 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 9pt;
  position: relative;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); /* Shadow untuk preview di layar */
  margin-bottom: 0;
}

.print-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.company-name {
  font-weight: bold;
  font-size: 11pt;
}
.doc-title {
  font-weight: bold;
  font-size: 13pt;
  text-decoration: underline;
  text-align: center;
}
.print-logo {
  height: 35px;
}

.info-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.info-section table {
  width: 100%;
  border-collapse: collapse;
}
.info-section td {
  vertical-align: top;
  padding: 1px 0;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 3px 6px;
}
.detail-table th {
  background: #f0f0f0;
  text-transform: uppercase;
  font-size: 8pt;
}

.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: bold;
}

.print-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
.sign-box {
  text-align: center;
  width: 22%;
}
.sign-space {
  height: 45px;
  border-bottom: 1px dashed #ccc;
  margin-bottom: 5px;
}

.print-meta {
  font-size: 7pt;
  color: #666;
  font-style: italic;
  margin-top: 10px;
}

.copy-divider {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-bottom: 1px dashed black;
  margin-bottom: -1px;
}

@media print {
  body {
    background: white;
  }
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    box-shadow: none;
    margin: 0;
    width: 100%;
    height: 14.8cm; /* Pas setengah A4 agar 2 copy muat di 1 lembar */
    page-break-inside: avoid;
  }
  @page {
    size: portrait;
    margin: 0;
  }
}
</style>
