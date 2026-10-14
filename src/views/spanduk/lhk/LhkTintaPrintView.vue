<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import * as lhkForm from "@/services/spanduk/lhk/lhkTintaFormService";
import type { LhkTintaForm } from "@/services/spanduk/lhk/lhkTintaFormService";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<LhkTintaForm | null>(null);

const loadData = async () => {
  try {
    data.value = await lhkForm.getById(String(route.params.nomor));
    setTimeout(() => window.print(), 600);
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data cetak."));
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// Tanggal dari server berformat YYYY-MM-DD; dipotong manual agar tidak bergeser zona waktu
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "-";
};

const fmt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const rows = computed(() => data.value?.Detail ?? []);

// Rekap per bahan (satuan bahan sama, jadi aman dijumlahkan)
const rekap = computed(() => {
  const peta = new Map<number, { nama: string; satuan: string; qty: number }>();
  for (const r of rows.value) {
    for (const t of r.Tinta) {
      const ada = peta.get(t.Kode_Bahan);
      if (ada) {
        ada.qty += Number(t.Qty) || 0;
      } else {
        peta.set(t.Kode_Bahan, {
          nama: t.Nama_Bahan ?? String(t.Kode_Bahan),
          satuan: t.Satuan ?? "",
          qty: Number(t.Qty) || 0,
        });
      }
    }
  }
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama));
});
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <div class="print-page">
      <div class="doc-title">Laporan Hasil Kerja Tinta/Cat</div>

      <table class="info">
        <tr>
          <td width="60">Tanggal</td>
          <td>: {{ fmtTgl(data.Tanggal) }}</td>
        </tr>
        <tr>
          <td>Nomor</td>
          <td>: {{ data.Nomor }}</td>
        </tr>
        <tr>
          <td>Lokasi</td>
          <td>: {{ data.Nama_Pabrik || data.Kode_Pabrik || "-" }}</td>
        </tr>
      </table>

      <!-- Satu tbody per SPK supaya satu SPK tidak terpotong antar halaman -->
      <table class="detail-table">
        <thead>
          <tr>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2" width="62">Jumlah<br />Order (Pcs)</th>
            <th colspan="2">Spesifikasi</th>
            <th rowspan="2" width="105">Nomor SPK</th>
            <th colspan="3">Pemakaian Tinta/Cat</th>
          </tr>
          <tr>
            <th width="38">P</th>
            <th width="38">L</th>
            <th>Bahan</th>
            <th width="60">Qty</th>
            <th width="46">Satuan</th>
          </tr>
        </thead>
        <tbody v-for="(r, idx) in rows" :key="idx" class="blok-spk">
          <tr v-for="(t, i) in r.Tinta" :key="t.Kode_Bahan">
            <template v-if="i === 0">
              <td :rowspan="r.Tinta.length">{{ r.Nama_SPK }}</td>
              <td :rowspan="r.Tinta.length" class="tr">
                {{ fmtInt(r.Jumlah_Order) }}
              </td>
              <td :rowspan="r.Tinta.length" class="tr">{{ fmt(r.Panjang) }}</td>
              <td :rowspan="r.Tinta.length" class="tr">{{ fmt(r.Lebar) }}</td>
              <td :rowspan="r.Tinta.length" class="tc">{{ r.Nomor_SPK }}</td>
            </template>
            <td>{{ t.Nama_Bahan }}</td>
            <td class="tr">{{ fmt(t.Qty) }}</td>
            <td>{{ t.Satuan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="sub-title">Rekap per Bahan</div>
      <table class="detail-table rekap">
        <thead>
          <tr>
            <th>Bahan</th>
            <th width="80">Total Qty</th>
            <th width="50">Satuan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in rekap" :key="i">
            <td>{{ b.nama }}</td>
            <td class="tr">{{ fmt(b.qty) }}</td>
            <td>{{ b.satuan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="sign">Mengetahui: 1 <span class="line"></span></div>
        <div class="sign">Mengetahui: 2 <span class="line"></span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}

.print-container {
  width: 21cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}

.print-page {
  width: 21cm;
  min-height: 29.7cm;
  padding: 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 8pt;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
}

.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 14pt;
  margin-bottom: 10px;
}

.sub-title {
  font-weight: bold;
  font-size: 9pt;
  margin: 14px 0 4px;
}

.info {
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 9pt;
}
.info td {
  padding: 1px 0;
  vertical-align: top;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 2px 4px;
}
.detail-table th {
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
.detail-table thead {
  display: table-header-group; /* header diulang tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}
.blok-spk {
  break-inside: avoid;
  page-break-inside: avoid;
}
.rekap {
  width: 60%;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.print-footer {
  display: flex;
  gap: 40px;
  margin-top: 30px;
  padding-left: 20px;
  font-size: 9pt;
  page-break-inside: avoid;
}
.sign .line {
  display: inline-block;
  width: 130px;
  border-bottom: 1px solid black;
}

@media print {
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    width: 100%;
    min-height: 0;
    padding: 0;
    box-shadow: none;
  }
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}
</style>
