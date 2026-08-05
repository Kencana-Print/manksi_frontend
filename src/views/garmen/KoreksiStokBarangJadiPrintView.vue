<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { koreksiStokBarangJadiService } from "@/services/garmen/koreksiStokBarangJadiService";
import { formatTanggal } from "@/utils/dateFormat";
import logoUrl from "@/assets/logo.png";

const route = useRoute();
const toast = useToast();
const nomor = computed(() => route.params.nomor as string);

const isLoading = ref(true);
const data = ref<any>(null);

const num2 = (v: any) => Number(v ?? 0).toFixed(2);

const total = computed(() => {
  if (!data.value?.details) return 0;
  return data.value.details.reduce(
    (sum: number, d: any) => sum + Number(d.selisih || 0),
    0,
  );
});

const loadData = async () => {
  isLoading.value = true;
  try {
    const res = await koreksiStokBarangJadiService.getPrintData(nomor.value);
    data.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Data tidak ditemukan.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const doPrint = () => window.print();
</script>

<template>
  <div class="print-page-wrap">
    <div v-if="isLoading" class="loading-state">Memuat data cetak...</div>

    <template v-else-if="data">
      <button class="print-btn no-print" @click="doPrint">🖨️ Cetak</button>

      <div class="print-sheet">
        <!-- KOP SURAT -->
        <div class="kop">
          <div class="kop-left">
            <div class="kop-company">{{ data.perush_nama }}</div>
            <div class="kop-line">
              {{ data.perush_alamat }}, {{ data.perush_kota }}
            </div>
            <div class="kop-line">
              {{ data.perush_telp
              }}<template v-if="data.perush_fax"
                >/{{ data.perush_fax }}</template
              >
            </div>
          </div>
          <div class="kop-right">
            <img :src="logoUrl" alt="Logo Perusahaan" class="kop-logo" />
          </div>
        </div>

        <div class="doc-title">Koreksi Stok</div>

        <table class="info-table">
          <tr>
            <td class="info-label">Nomor</td>
            <td class="info-sep">:</td>
            <td>{{ data.kor_nomor }}</td>
          </tr>
          <tr>
            <td class="info-label">Tanggal</td>
            <td class="info-sep">:</td>
            <td>{{ formatTanggal(data.kor_tanggal) }}</td>
          </tr>
          <tr>
            <td class="info-label">Keterangan</td>
            <td class="info-sep">:</td>
            <td>{{ data.kor_ket }}</td>
          </tr>
        </table>

        <table class="detail-table">
          <thead>
            <tr>
              <th style="width: 28px">No</th>
              <th style="width: 100px">Kode</th>
              <th>Nama</th>
              <th style="width: 55px">Satuan</th>
              <th style="width: 70px">Stok</th>
              <th style="width: 70px">Koreksi</th>
              <th style="width: 70px">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in data.details" :key="i">
              <td class="tc">{{ Number(i) + 1 }}</td>
              <td>{{ d.kode }}</td>
              <td>{{ d.nama }}</td>
              <td class="tc">{{ d.satuan }}</td>
              <td class="tr">{{ num2(d.stok) }}</td>
              <td class="tr">{{ num2(d.jumlah) }}</td>
              <td class="tr">{{ num2(d.selisih) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="total-label">Total :</td>
              <td></td>
              <td class="tr total-val">{{ num2(total) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signature-row">
          <div class="sig-col">
            <div>Dibuat Oleh,</div>
            <div class="sig-space"></div>
            <div>( {{ data.user_create }} )</div>
          </div>
          <div class="sig-col">
            <div>Mengetahui,</div>
            <div class="sig-space"></div>
            <div>( &nbsp; )</div>
          </div>
          <div class="sig-col">
            <div>Manager,</div>
            <div class="sig-space"></div>
            <div>( &nbsp; )</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.print-page-wrap {
  background: #eee;
  min-height: 100vh;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.loading-state {
  padding: 60px;
  color: #757575;
}
.print-btn {
  margin-bottom: 12px;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  background: #1565c0;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.print-sheet {
  width: 210mm;
  min-height: 297mm;
  background: white;
  padding: 15mm 12mm;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #1a1a5e;
  box-sizing: border-box;
}
.kop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #1a1a5e;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.kop-company {
  font-weight: 700;
  font-size: 13px;
  color: #000;
}
.kop-line {
  font-size: 11px;
}
.kop-logo {
  height: 42px;
}
.doc-title {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin-bottom: 10px;
}
.info-table {
  margin-bottom: 10px;
  font-size: 12px;
}
.info-label {
  width: 90px;
  padding: 1px 0;
}
.info-sep {
  width: 12px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table th {
  border: 1px solid #1a1a5e;
  padding: 4px 6px;
  text-align: left;
  font-weight: 700;
  background: #f5f5f5;
}
.detail-table td {
  padding: 3px 6px;
  border-left: 1px solid #1a1a5e;
  border-right: 1px solid #1a1a5e;
}
.detail-table tbody tr:last-child td {
  border-bottom: 1px solid #1a1a5e;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.total-label {
  text-align: right;
  font-weight: 700;
  padding: 4px 6px;
}
.total-val {
  font-weight: 700;
}
.signature-row {
  display: flex;
  justify-content: space-around;
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
}
.sig-col {
  min-width: 130px;
}
.sig-space {
  height: 55px;
}

@media print {
  .print-page-wrap {
    background: white;
    padding: 0;
    display: block;
  }
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none;
    width: 100%;
    min-height: 0;
    margin: 0;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
</style>
