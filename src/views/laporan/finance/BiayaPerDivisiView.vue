<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconFileText, IconFileExport, IconPrinter } from "@tabler/icons-vue";
import {
  biayaPerDivisiService,
  type DivisiOption,
  type BiayaPerDivisiData,
} from "@/services/laporan/finance/biayaPerDivisiService";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();

// ── Filter ──
const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

const startDate = ref(getLocal(firstDay));
const endDate = ref(getLocal(now));
const cckode = ref<string | number>("");

const divisiOptions = ref<DivisiOption[]>([]);
const reportData = ref<BiayaPerDivisiData | null>(null);
const isLoading = ref(false);
const isLoadingDivisi = ref(false);

onMounted(async () => {
  isLoadingDivisi.value = true;
  try {
    const res = await biayaPerDivisiService.getListDivisi();
    divisiOptions.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat daftar divisi.");
  } finally {
    isLoadingDivisi.value = false;
  }
});

const loadReport = async () => {
  if (!cckode.value) {
    toast.warning("Pilih Divisi terlebih dahulu.");
    return;
  }
  isLoading.value = true;
  try {
    const res = await biayaPerDivisiService.getBiayaPerDivisi(
      cckode.value,
      startDate.value,
      endDate.value,
    );
    reportData.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat laporan.");
  } finally {
    isLoading.value = false;
  }
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const doPrint = () => {
  if (!reportData.value) return toast.warning("Tampilkan laporan dahulu.");
  const params = new URLSearchParams({
    cckode: String(cckode.value),
    startDate: startDate.value,
    endDate: endDate.value,
  });
  window.open(`/laporan/finance/biaya-per-divisi/print?${params}`, "_blank");
};

const hasData = computed(() => (reportData.value?.akunList.length ?? 0) > 0);

const isExporting = ref(false);

const doExport = async () => {
  if (!reportData.value) return toast.warning("Tampilkan laporan dahulu.");
  if (!hasData.value) return toast.warning("Tidak ada data untuk diexport.");

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Akun Biaya / Uraian", key: "label", width: 30 },
      { header: "No. Pengajuan", key: "noPengajuan", width: 16 },
      {
        header: "Tgl Pengajuan",
        key: "tanggalPengajuan",
        width: 14,
        align: "center",
      },
      { header: "No. BKK/BBK", key: "noBkkBbk", width: 16 },
      {
        header: "Tgl BKK/BBK",
        key: "tanggalBkkBbk",
        width: 14,
        align: "center",
      },
      { header: "Detail CC", key: "detailCC", width: 18 },
      {
        header: "Nominal",
        key: "nominal",
        width: 16,
        align: "end",
        numFmt: "#,##0",
      },
    ];

    const rows: Record<string, any>[] = [];
    for (const akun of reportData.value!.akunList) {
      rows.push({
        label: akun.namaAkun,
        noPengajuan: "",
        tanggalPengajuan: "",
        noBkkBbk: "",
        tanggalBkkBbk: "",
        detailCC: "",
        nominal: akun.totalNominal,
      });
      for (const d of akun.detail) {
        rows.push({
          label: `  ${d.uraian || "-"}`,
          noPengajuan: d.noPengajuan || "-",
          tanggalPengajuan: d.tanggalPengajuan
            ? formatTanggal(d.tanggalPengajuan)
            : "",
          noBkkBbk: d.noBkkBbk,
          tanggalBkkBbk: d.tanggalBkkBbk ? formatTanggal(d.tanggalBkkBbk) : "",
          detailCC: d.detailCC || "-",
          nominal: d.nominal,
        });
      }
    }
    rows.push({
      label: "GRAND TOTAL",
      noPengajuan: "",
      tanggalPengajuan: "",
      noBkkBbk: "",
      tanggalBkkBbk: "",
      detailCC: "",
      nominal: reportData.value!.grandTotal,
    });

    await exportExcelSingle(
      `Biaya_Per_Divisi_${reportData.value!.divisi.kode}_${startDate.value}_${endDate.value}.xlsx`,
      "Biaya per Divisi",
      columns,
      rows,
      `Laporan Biaya per Divisi — ${reportData.value!.divisi.nama}  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <div class="page-wrap">
    <!-- ── Header ── -->
    <div class="page-header">
      <div class="d-flex align-center gap-2">
        <IconFileText :size="18" :stroke-width="1.8" color="#1565c0" />
        <h2 class="page-title">Laporan Biaya per Divisi</h2>
      </div>
      <div class="d-flex align-center gap-2 no-print">
        <v-btn
          size="small"
          variant="tonal"
          color="grey-darken-3"
          :disabled="!hasData"
          @click="doPrint"
        >
          <template #prepend
            ><IconPrinter :size="14" :stroke-width="1.8"
          /></template>
          Cetak
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="success"
          :disabled="!hasData"
          :loading="isExporting"
          @click="doExport"
        >
          <template #prepend
            ><IconFileExport :size="14" :stroke-width="1.8"
          /></template>
          Export
        </v-btn>
      </div>
    </div>

    <!-- ── Filter bar ── -->
    <div class="filter-bar no-print">
      <div class="filter-group">
        <span class="filter-lbl">Divisi</span>
        <select
          v-model="cckode"
          class="filter-select"
          :disabled="isLoadingDivisi"
        >
          <option value="">— Pilih Divisi —</option>
          <option v-for="d in divisiOptions" :key="d.kode" :value="d.kode">
            [{{ d.kode }}] {{ d.nama }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
      <v-btn
        size="small"
        color="primary"
        variant="flat"
        :loading="isLoading"
        @click="loadReport"
      >
        Tampilkan
      </v-btn>
    </div>

    <!-- ── Report ── -->
    <div v-if="isLoading" class="loading-wrap">
      <v-progress-circular indeterminate color="primary" size="32" />
    </div>

    <div v-else-if="reportData" class="report-wrap" id="print-area">
      <div class="report-title">
        DIVISI : {{ reportData.divisi.nama.toUpperCase() }}
      </div>
      <div class="report-subtitle">
        Periode {{ formatTanggal(startDate) }} s/d {{ formatTanggal(endDate) }}
      </div>

      <div v-if="!hasData" class="empty-state">
        Tidak ada data biaya untuk divisi dan periode ini.
      </div>

      <table v-else class="report-table">
        <thead>
          <tr>
            <th class="col-akun">AKUN BIAYA</th>
            <th class="col-pengajuan">No. Pengajuan</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-bkk">No. BKK/BBK</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-dcc">Detail CC</th>
            <th class="col-nominal">Nominal</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="akun in reportData.akunList" :key="akun.rekKode">
            <tr class="row-akun-header">
              <td class="nama-akun">{{ akun.namaAkun }}</td>
              <td colspan="5"></td>
              <td class="tr total-nominal">{{ numFmt(akun.totalNominal) }}</td>
            </tr>
            <tr v-for="(d, i) in akun.detail" :key="i" class="row-detail">
              <td class="detail-label">{{ d.uraian || "-" }}</td>
              <td>{{ d.noPengajuan || "-" }}</td>
              <td class="tc">{{ formatTanggal(d.tanggalPengajuan) }}</td>
              <td>{{ d.noBkkBbk }}</td>
              <td class="tc">{{ formatTanggal(d.tanggalBkkBbk) }}</td>
              <td>{{ d.detailCC || "-" }}</td>
              <td class="tr">{{ numFmt(d.nominal) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="row-grand-total">
            <td colspan="6" class="tr">GRAND TOTAL</td>
            <td class="tr">{{ numFmt(reportData.grandTotal) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="empty-state">
      Pilih Divisi dan Periode, lalu klik "Tampilkan".
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100%;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.page-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b1b1b;
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: #9ca3af;
}
.filter-select,
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
}
.filter-select:focus,
.date-inp:focus {
  border-color: #1565c0;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.empty-state {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 40px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.report-wrap {
  background: white;
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 20px 24px;
}
.report-title {
  font-size: 13px;
  font-weight: 700;
  color: #1b1b1b;
  margin-bottom: 2px;
}
.report-subtitle {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 14px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.report-table th {
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  padding: 6px 6px;
  border-bottom: 2px solid #1565c0;
  white-space: nowrap;
}
.col-akun {
  width: 26%;
}
.col-pengajuan {
  width: 13%;
}
.col-tgl {
  width: 9%;
}
.col-bkk {
  width: 13%;
}
.col-dcc {
  width: 14%;
}
.col-nominal {
  width: 12%;
  text-align: right;
}

.row-akun-header td {
  font-weight: 700;
  color: #0d47a1;
  padding: 8px 6px 4px;
  border-top: 1px solid #e0e0e0;
}
.nama-akun {
  text-transform: uppercase;
  font-size: 11px;
}
.total-nominal {
  color: #0d47a1;
  font-weight: 700;
}

.row-detail td {
  padding: 2px 6px;
  color: #374151;
  border-bottom: 1px solid #f5f5f5;
}
.detail-label {
  padding-left: 16px;
  color: #1565c0;
}

.row-grand-total td {
  padding: 8px 6px;
  border-top: 2px solid #1565c0;
  font-weight: 700;
  font-size: 12px;
  color: #0d47a1;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
