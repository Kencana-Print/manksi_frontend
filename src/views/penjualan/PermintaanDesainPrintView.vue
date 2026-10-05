<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { permintaanDesainService as svc } from "@/services/penjualan/permintaanDesainService";
import { formatTanggal } from "@/utils/dateFormat";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

const printNomor = decodeURIComponent(route.params.nomor as string);

const handlePrint = () => {
  window.print();
};

onMounted(async () => {
  try {
    const res = await svc.getDetail(printNomor);
    data.value = res.data.data;
    isLoading.value = false;
  } catch {
    isError.value = true;
    isLoading.value = false;
  }
});

const JENIS_LABEL: Record<string, string> = {
  BARU: "Baru",
  REVISI: "Revisi",
  CEK: "Cek",
  PLOTTER: "Plotter",
  EDIT: "Edit",
};
const PRIORITAS_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  "TOP URGENT": "Top Urgent",
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>
  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak Permintaan Desain. Pastikan nomor benar.
  </div>

  <div v-else-if="data" class="print-container">
    <div class="no-print print-actions">
      <button @click="handlePrint">🖨️ Cetak Permintaan Desain</button>
    </div>

    <table class="outer-table">
      <tbody>
        <tr>
          <td class="panel">
            <h2 class="form-title">PERMINTAAN DESAIN</h2>

            <table class="info-table">
              <tr>
                <td class="lbl">Nomor</td>
                <td class="sep">:</td>
                <td class="val font-weight-bold">{{ data.pd_nomor }}</td>
                <td class="lbl">Prioritas</td>
                <td class="sep">:</td>
                <td class="val">
                  <span
                    v-if="data.pd_prioritas !== 'NORMAL'"
                    class="highlight-yellow"
                  >
                    {{
                      PRIORITAS_LABEL[data.pd_prioritas] || data.pd_prioritas
                    }}
                  </span>
                  <span v-else>{{
                    PRIORITAS_LABEL[data.pd_prioritas] || data.pd_prioritas
                  }}</span>
                </td>
              </tr>
              <tr>
                <td class="lbl">Tanggal</td>
                <td class="sep">:</td>
                <td class="val">{{ formatTanggal(data.pd_tanggal) }}</td>
                <td class="lbl">Dateline</td>
                <td class="sep">:</td>
                <td class="val">{{ formatTanggal(data.pd_dateline) }}</td>
              </tr>
              <tr>
                <td class="lbl">Marketing</td>
                <td class="sep">:</td>
                <td class="val" colspan="4">{{ data.pd_nama_marketing }}</td>
              </tr>
              <tr>
                <td class="lbl">Customer</td>
                <td class="sep">:</td>
                <td class="val" colspan="4">
                  {{ data.pd_customer_nama || data.pd_customer || "-" }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Nama Project</td>
                <td class="sep">:</td>
                <td class="val font-weight-bold" colspan="4">
                  {{ data.pd_nama_project }}
                </td>
              </tr>
              <tr>
                <td class="lbl">Jenis Pekerjaan</td>
                <td class="sep">:</td>
                <td class="val" colspan="4">
                  {{
                    JENIS_LABEL[data.pd_jenis_pekerjaan] ||
                    data.pd_jenis_pekerjaan
                  }}
                  <span v-if="data.pd_referensi">
                    (Ref: {{ data.pd_referensi }})</span
                  >
                </td>
              </tr>
              <tr v-if="data.pd_keterangan">
                <td class="lbl">Keterangan</td>
                <td class="sep">:</td>
                <td class="val" colspan="4">{{ data.pd_keterangan }}</td>
              </tr>
            </table>

            <div class="box-title">Rincian Item Desain</div>
            <table class="item-table">
              <thead>
                <tr>
                  <th style="width: 30px">No</th>
                  <th>Nama Desain</th>
                  <th style="width: 70px" class="tr">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in data.detail" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td>{{ d.pd2_pd_desain }}</td>
                  <td class="tr">{{ d.pd2_pd_jml }}</td>
                </tr>
                <tr v-if="!data.detail?.length">
                  <td
                    colspan="3"
                    class="tc"
                    style="color: #999; font-style: italic"
                  >
                    Tidak ada item
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="tr font-weight-bold">Total</td>
                  <td class="tr font-weight-bold">{{ data.pd_jml }}</td>
                </tr>
              </tfoot>
            </table>

            <table class="ttd-table">
              <tr>
                <td class="ttd-box">
                  <div class="ttd-title">Dibuat oleh (Marketing)</div>
                  <div class="ttd-space"></div>
                  <div class="ttd-name">({{ data.pd_nama_marketing }})</div>
                </td>
                <td class="ttd-box">
                  <div class="ttd-title">Diterima (Tim Desain)</div>
                  <div class="ttd-space"></div>
                  <div class="ttd-name">({{ data.pd_desainer || "" }})</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.print-actions {
  text-align: right;
  padding: 8px 12px;
  background-color: #f5f5f5;
  margin-bottom: 8px;
}
.print-actions button {
  padding: 6px 14px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
}
.print-actions button:hover {
  background-color: #1565c0;
}

.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 14px;
}
.error-state {
  color: red;
}

.print-container {
  width: 138mm;
  margin: 0 auto;
  font-family: Arial, sans-serif;
  font-size: 10px;
  color: #000;
  background: #fff;
  padding: 6px;
  box-sizing: border-box;
}

.outer-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
}
.panel {
  border: none;
  vertical-align: top;
  padding: 8px;
}

.form-title {
  text-decoration: underline;
  font-size: 12px;
  font-weight: bold;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  text-align: center;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  margin-bottom: 10px;
}
.info-table td {
  padding: 2px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 78px;
}
.info-table .sep {
  width: 8px;
  text-align: center;
}

.font-weight-bold {
  font-weight: bold;
}
.highlight-yellow {
  background-color: yellow;
  padding: 1px 4px;
  font-weight: bold;
  border: 1px solid #000;
  font-size: 8.5px;
}

.box-title {
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 3px;
  font-size: 9px;
}
.item-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  margin-bottom: 12px;
}
.item-table th,
.item-table td {
  border: 1px solid #000;
  padding: 3px 6px;
  text-align: left;
}
.item-table thead tr {
  background: #f0f0f0;
}
.item-table tfoot td {
  border-top: 1.5px solid #000;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.ttd-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  margin-top: 10px;
}
.ttd-box {
  width: 50%;
  padding: 2px 6px;
  vertical-align: bottom;
}
.ttd-title {
  font-size: 9px;
  font-weight: bold;
}
.ttd-space {
  height: 28px;
}
.ttd-name {
  border-top: 1px solid #000;
  font-size: 9px;
  padding-top: 2px;
}
</style>

<style>
@media print {
  @page {
    size: A5;
    margin: 5mm;
  }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
