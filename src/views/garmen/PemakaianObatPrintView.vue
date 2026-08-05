<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { pemakaianObatService } from "@/services/garmen/pemakaianObatService";

const route = useRoute();
const toast = useToast();
const nomor = computed(() => route.params.nomor as string);

const isLoading = ref(true);
const data = ref<any>(null);

// Format khusus report ini: "08 Jan 2026" — beda dari formatTanggal
// standar (dd/mm/yyyy), tidak dipindah ke utils karena cuma dipakai di
// print view ini.
const BULAN_PENDEK = [
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
const formatTanggalReport = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d} ${BULAN_PENDEK[Number(m) - 1]} ${y}`;
};

const num = (v: any) => Number(v ?? 0).toLocaleString("id-ID");

const loadData = async () => {
  isLoading.value = true;
  try {
    const res = await pemakaianObatService.getPrintData(nomor.value);
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
        <!-- 2 salinan identik, replikasi pola cetak lain (Invoice dkk) -->
        <div v-for="copyIdx in [1, 2]" :key="copyIdx" class="copy-block">
          <div class="doc-title">P E M A K A I A N &nbsp; O B A T</div>

          <table class="info-table">
            <tr>
              <td class="info-label">Nomor</td>
              <td class="info-sep">:</td>
              <td class="info-val">{{ data.nomor }}</td>
              <td class="info-label" style="padding-left: 40px">No.SPK</td>
              <td class="info-sep">:</td>
              <td class="info-val">{{ data.spk }}</td>
            </tr>
            <tr>
              <td class="info-label">Tanggal</td>
              <td class="info-sep">:</td>
              <td class="info-val">{{ formatTanggalReport(data.tanggal) }}</td>
              <td class="info-label" style="padding-left: 40px">Product</td>
              <td class="info-sep">:</td>
              <td class="info-val">{{ data.product }}</td>
            </tr>
            <tr>
              <td class="info-label">Keterangan</td>
              <td class="info-sep">:</td>
              <td class="info-val">{{ data.keterangan }}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>

          <div class="bahan-row">
            <span>Bahan yang disertakan :</span>
            <span class="lini-label">Lini : {{ data.lini }}</span>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 28px">No</th>
                <th style="text-align: left">Jenis Obat</th>
                <th style="width: 90px">Jumlah</th>
                <th style="width: 70px">Satuan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in data.details" :key="i">
                <td class="tc">{{ Number(i) + 1 }} .</td>
                <td>{{ d.jenisObat }}</td>
                <td class="tr">{{ num(d.jumlah) }}</td>
                <td>{{ d.satuan }}</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-row">
            <div class="sig-col">
              <div>Dibuat oleh,</div>
              <div class="sig-space"></div>
              <div>( &nbsp; )</div>
            </div>
            <div class="sig-col">
              <div>Mengetahui</div>
              <div class="sig-space"></div>
              <div>( &nbsp; )</div>
            </div>
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
.copy-block {
  margin-bottom: 40px;
}
.copy-block:last-child {
  margin-bottom: 0;
}
.doc-title {
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #000;
  margin-bottom: 12px;
}
.info-table {
  font-size: 12px;
  margin-bottom: 10px;
}
.info-label {
  width: 70px;
  padding: 1px 0;
  vertical-align: top;
}
.info-sep {
  width: 12px;
  vertical-align: top;
}
.info-val {
  vertical-align: top;
}
.bahan-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}
.lini-label {
  margin-right: 60px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 10px;
}
.detail-table th {
  border: 1px solid #1a1a5e;
  padding: 3px 6px;
  text-align: left;
  font-weight: 700;
  background: #f5f5f5;
}
.detail-table td {
  padding: 2px 6px;
  border-left: 1px solid #1a1a5e;
  border-right: 1px solid #1a1a5e;
}
.detail-table tbody tr:last-child td {
  border-bottom: 1px solid #1a1a5e;
}
.tc {
  text-align: left;
}
.tr {
  text-align: right;
}
.signature-row {
  display: flex;
  gap: 80px;
  margin-top: 8px;
  font-size: 12px;
}
.sig-space {
  height: 45px;
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
