<template>
  <PageLayout title="Laporan LHK" :icon="IconChartBar" :loading="loading">
    <template #header-actions>
      <v-btn
        size="small"
        color="secondary"
        variant="tonal"
        class="mr-2"
        prepend-icon="mdi-printer"
        @click="bukaPrint"
      >
        Cetak
      </v-btn>

      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        class="mr-2"
        prepend-icon="mdi-microsoft-excel"
        @click="exportOutputDigitalPrint"
        :disabled="filteredPerMesin.length === 0"
      >
        Export Model Digital Print
      </v-btn>

      <v-btn
        size="small"
        color="success"
        variant="flat"
        prepend-icon="mdi-file-excel"
        @click="exportToExcel"
        :disabled="filteredPerMesin.length === 0"
      >
        Export Excel
      </v-btn>
    </template>

    <div class="pa-4 bg-grey-lighten-4" style="min-height: calc(100vh - 120px)">
      <!-- BAR FILTER -->
      <v-card class="mb-4 border shadow-sm">
        <v-card-text class="d-flex align-center flex-wrap ga-3">
          <DateRangeFilter
            v-model:start-date="filters.start"
            v-model:end-date="filters.end"
          />

          <!-- FILTER KATEGORI -->
          <div style="width: 200px">
            <v-select
              v-model="filters.kategori"
              :items="listKategori"
              item-title="title"
              item-value="value"
              label="Kategori LHK"
              density="compact"
              variant="outlined"
              hide-details
              bg-color="white"
            />
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-magnify"
            :loading="loading"
            @click="loadRekap"
          >
            Proses
          </v-btn>
        </v-card-text>
      </v-card>

      <v-row>
        <!-- TABEL PRODUKTIVITAS MESIN -->
        <v-col cols="12" md="8">
          <v-card variant="outlined" class="bg-white elevation-1">
            <v-card-title
              class="bg-primary text-white text-subtitle-2 d-flex align-center py-2 px-3"
            >
              <v-icon start size="small">mdi-engine</v-icon>
              Produktivitas Per Mesin
            </v-card-title>

            <v-data-table
              v-model:expanded="expanded"
              :headers="headersMesin"
              :items="filteredPerMesin"
              show-expand
              item-value="Mesin"
              density="compact"
              class="custom-table"
              @update:expanded="onExpandedChange"
            >
              <!-- KATEGORI CHIP -->
              <template #[`item.Kategori`]="{ value }">
                <v-chip
                  size="x-small"
                  :color="getKategoriColor(value)"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ value }}
                </v-chip>
              </template>

              <!-- TOTAL METER -->
              <template #[`item.Total_Meter`]="{ value }">
                <b class="text-primary">{{ formatNumber(value, 2) }} m²</b>
              </template>

              <!-- KAPASITAS -->
              <template #[`item.Kapasitas`]="{ item }">
                {{ formatNumber(Number(item.Kapasitas || 0) * selectedDaysCount, 0) }} m²
              </template>

              <!-- PERSENTASE / LOAD -->
              <template #[`item.Persentase`]="{ item }">
                <v-chip
                  size="small"
                  :color="
                    calculatePercent(
                      item.Total_Meter,
                      Number(item.Kapasitas || 0) * selectedDaysCount,
                    ) > 100
                      ? 'error'
                      : 'success'
                  "
                  variant="flat"
                >
                  {{
                    calculatePercent(
                      item.Total_Meter,
                      Number(item.Kapasitas || 0) * selectedDaysCount,
                    )
                  }}%
                </v-chip>
              </template>

              <!-- JUMLAH SPK -->
              <template #[`item.Jml_SPK`]="{ value }">
                {{ formatNumber(value, 0) }}
              </template>

              <!-- DETAIL EXPANDED ROW -->
              <template #expanded-row="{ columns, item }">
                <tr>
                  <td :colspan="columns.length" class="bg-grey-lighten-4 pa-3">
                    <v-card variant="flat" border class="elevation-1">
                      <v-card-title
                        class="text-caption font-weight-bold bg-grey-lighten-2 py-1 px-3"
                      >
                        Rincian SPK - Mesin {{ item.Mesin }} ({{ item.Kategori }})
                      </v-card-title>
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th class="text-left">NO SPK</th>
                            <th class="text-left">NAMA ORDER</th>
                            <th class="text-right">PCS</th>
                            <th class="text-right">METER (M²)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="loadingDetail">
                            <td colspan="4" class="text-center pa-3">
                              <v-progress-circular
                                indeterminate
                                size="18"
                                width="2"
                                color="primary"
                                class="mr-2"
                              />
                              Memuat detail...
                            </td>
                          </tr>
                          <tr
                            v-else-if="
                              !detailSpkPerMesin[item.Mesin] ||
                              detailSpkPerMesin[item.Mesin].length === 0
                            "
                          >
                            <td colspan="4" class="text-center pa-2 text-grey">
                              Tidak ada detail SPK
                            </td>
                          </tr>
                          <tr
                            v-else
                            v-for="spk in detailSpkPerMesin[item.Mesin]"
                            :key="spk.No_SPK"
                          >
                            <td>{{ spk.No_SPK }}</td>
                            <td>{{ spk.Nama_Order }}</td>
                            <td class="text-right">
                              {{ formatNumber(spk.Total_Pcs, 0) }}
                            </td>
                            <td class="text-right font-weight-bold text-primary">
                              {{ formatNumber(spk.Total_Meter, 2) }} m²
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card>
        </v-col>

        <!-- KARTU SUMMARY TOTAL & INFORMASI -->
        <v-col cols="12" md="4">
          <v-card
            color="primary"
            theme="dark"
            class="mb-4 elevation-2 overflow-hidden rounded-lg"
          >
            <v-card-text class="text-center py-6">
              <div class="text-overline opacity-70">GRAND TOTAL PRODUKSI</div>
              <div class="text-h3 font-weight-bold mb-1">
                {{ formatNumber(totalAllMeter, 2) }}
              </div>
              <div class="text-subtitle-2 opacity-80">METER PERSEGI (M²)</div>
              <div class="mt-3 text-caption opacity-90">
                Total SPK: <b>{{ formatNumber(totalAllSpk, 0) }}</b> · Total PCS: <b>{{ formatNumber(totalAllPcs, 0) }}</b>
              </div>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="bg-white">
            <v-card-title class="text-subtitle-2 d-flex align-center py-2 px-3">
              <v-icon start color="info" size="small">mdi-information-outline</v-icon>
              Informasi Laporan
            </v-card-title>
            <v-divider />
            <v-card-text class="text-caption text-grey-darken-1">
              <ul class="ml-4">
                <li>Data gabungan dari LHK MMT, Tekstil, Finishing, Paperprint, dan Sublim.</li>
                <li>Rumus m²: (Panjang x Lebar) x Jumlah Cetak.</li>
                <li>Gunakan filter kategori untuk memfilter data per divisi.</li>
                <li>Klik ikon panah pada baris mesin untuk melihat rincian SPK.</li>
              </ul>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconChartBar } from "@tabler/icons-vue";
import PageLayout from "@/components/PageLayout.vue";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import {
  laporanLhkService,
  type LhkRekapMesinRow,
  type LhkRekapHarianRow,
  type LhkDetailSpkRow,
} from "@/services/laporan/mmt/laporanLhkService";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const toast = useToast();
const loading = ref(false);
const expanded = ref<any[]>([]);
const detailSpkPerMesin = ref<Record<string, LhkDetailSpkRow[]>>({});
const loadingDetail = ref(false);

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filters = reactive({
  start: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  end: ymd(sekarang),
  kategori: "ALL",
});

const listKategori = [
  { title: "Semua Kategori", value: "ALL" },
  { title: "Cetak (MMT)", value: "MMT" },
  { title: "Mesin Tekstil", value: "TEKSTIL" },
  { title: "Finishing", value: "FINISHING" },
  { title: "Paperprint", value: "PAPERPRINT" },
  { title: "Sublim", value: "SUBLIM" },
];

const dataRekap = ref<{
  perMesin: LhkRekapMesinRow[];
  perHari: LhkRekapHarianRow[];
}>({
  perMesin: [],
  perHari: [],
});

const filteredPerMesin = computed(() => {
  if (!dataRekap.value.perMesin) return [];
  if (filters.kategori === "ALL") return dataRekap.value.perMesin;
  return dataRekap.value.perMesin.filter(
    (item) => item.Kategori === filters.kategori,
  );
});

const selectedDaysCount = computed(() => {
  if (!filters.start || !filters.end) return 1;
  const s = new Date(filters.start).getTime();
  const e = new Date(filters.end).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
});

const headersMesin = computed(() => [
  { title: "MESIN", key: "Mesin", align: "start" as const, sortable: true },
  { title: "KATEGORI", key: "Kategori", align: "center" as const, sortable: true },
  {
    title: `KAPASITAS (${selectedDaysCount.value} hr) (M²)`,
    key: "Kapasitas",
    align: "end" as const,
    sortable: true,
  },
  {
    title: "JUMLAH SPK",
    key: "Jml_SPK",
    align: "end" as const,
    sortable: true,
  },
  {
    title: "TOTAL PCS",
    key: "Total_Pcs",
    align: "end" as const,
    sortable: true,
  },
  {
    title: "TOTAL METER (M²)",
    key: "Total_Meter",
    align: "end" as const,
    sortable: true,
  },
  {
    title: "LOAD (%)",
    key: "Persentase",
    align: "center" as const,
    sortable: true,
  },
]);

const totalAllMeter = computed(() => {
  return filteredPerMesin.value.reduce(
    (sum, item) => sum + Number(item.Total_Meter || 0),
    0,
  );
});

const totalAllSpk = computed(() => {
  return filteredPerMesin.value.reduce(
    (sum, item) => sum + Number(item.Jml_SPK || 0),
    0,
  );
});

const totalAllPcs = computed(() => {
  return filteredPerMesin.value.reduce(
    (sum, item) => sum + Number(item.Total_Pcs || 0),
    0,
  );
});

const formatNumber = (val: any, dec = 0) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(num);
};

const calculatePercent = (val: any, max: any) => {
  const v = Number(val) || 0;
  const m = Number(max) || 0;
  if (m === 0) return 0;
  return Math.round((v / m) * 100);
};

const getKategoriColor = (kat: string) => {
  switch (kat?.toUpperCase()) {
    case "MMT":
      return "primary";
    case "TEKSTIL":
      return "purple";
    case "FINISHING":
      return "teal";
    case "PAPERPRINT":
      return "orange";
    case "SUBLIM":
      return "indigo";
    default:
      return "grey";
  }
};

const onExpandedChange = async (newExpanded: any[]) => {
  if (!newExpanded || newExpanded.length === 0) return;
  const mesin = newExpanded[newExpanded.length - 1];
  if (detailSpkPerMesin.value[mesin]) return;

  loadingDetail.value = true;
  try {
    const res = await laporanLhkService.getDetailMesin({
      startDate: filters.start,
      endDate: filters.end,
      mesin,
    });
    detailSpkPerMesin.value[mesin] = res.data?.data || [];
  } catch {
    toast.error(`Gagal memuat detail SPK untuk mesin ${mesin}`);
  } finally {
    loadingDetail.value = false;
  }
};

const loadRekap = async () => {
  loading.value = true;
  detailSpkPerMesin.value = {};
  expanded.value = [];

  try {
    const res = await laporanLhkService.getRekap({
      startDate: filters.start,
      endDate: filters.end,
    });
    if (res.data?.success && res.data.data) {
      dataRekap.value = {
        perMesin: res.data.data.rekapMesin || [],
        perHari: res.data.data.rekapHarian || [],
      };
    }
  } catch (err: any) {
    toast.error(err.message || "Gagal memuat data rekap LHK");
  } finally {
    loading.value = false;
  }
};

const bukaPrint = () => {
  const p = new URLSearchParams({
    startDate: filters.start,
    endDate: filters.end,
    ...(filters.kategori && filters.kategori !== "ALL" ? { kategori: filters.kategori } : {}),
  });
  window.open(`/laporan/produksi-mmt/lap-lhk/print?${p.toString()}`, "_blank");
};

const exportToExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Produksi");

  const num = (value: any) => {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  worksheet.columns = [
    { header: "Kategori", key: "Kategori", width: 15 },
    { header: "Mesin", key: "Mesin", width: 15 },
    {
      header: `Kapasitas (${selectedDaysCount.value} hr)`,
      key: "KapasitasDinamis",
      width: 20,
    },
    { header: "Jml SPK", key: "Jml_SPK", width: 12 },
    { header: "Total PCS", key: "Total_Pcs", width: 15 },
    { header: "Total Meter (M²)", key: "Total_Meter", width: 20 },
    { header: "Load (%)", key: "Load", width: 15 },
  ];

  filteredPerMesin.value.forEach((item) => {
    const kapTotal = num(item.Kapasitas) * num(selectedDaysCount.value);
    const persenValue = kapTotal > 0 ? num(item.Total_Meter) / kapTotal : 0;

    const row = worksheet.addRow({
      Kategori: item.Kategori,
      Mesin: item.Mesin,
      KapasitasDinamis: kapTotal,
      Jml_SPK: num(item.Jml_SPK),
      Total_Pcs: num(item.Total_Pcs),
      Total_Meter: num(item.Total_Meter),
      Load: persenValue,
    });

    row.getCell("KapasitasDinamis").numFmt = "#,##0.00";
    row.getCell("Total_Meter").numFmt = "#,##0.00";
    row.getCell("Load").numFmt = "0.0%";

    row.getCell("KapasitasDinamis").alignment = { horizontal: "right" };
    row.getCell("Jml_SPK").alignment = { horizontal: "right" };
    row.getCell("Total_Pcs").alignment = { horizontal: "right" };
    row.getCell("Total_Meter").alignment = { horizontal: "right" };
    row.getCell("Load").alignment = { horizontal: "right" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Rekap_LHK_${filters.kategori}_${filters.start}_to_${filters.end}.xlsx`,
  );
};

const exportOutputDigitalPrint = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("OUTPUT DIGITAL PRINT");

  const num = (value: any) => {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  worksheet.addRow(["OUT PUT DIGITAL PRINT"]).font = { bold: true, size: 14 };
  worksheet.addRow(["BOYOLALI"]).font = { bold: true };
  worksheet.addRow([
    "BULAN :",
    filters.start,
  ]).font = { bold: true };
  worksheet.addRow([
    "DIVISI :",
    filters.kategori === "ALL"
      ? "DIVISI DIGITAL PRINT (GABUNGAN)"
      : `DIVISI ${filters.kategori}`,
  ]).font = { bold: true };
  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    "NO",
    "NAMA MESIN",
    "KATEGORI",
    "KAPASITAS",
    "TOTAL SPK",
    "TOTAL PCS",
    "REALISASI (M²)",
    "LOAD (%)",
  ]);
  headerRow.font = { bold: true };

  filteredPerMesin.value.forEach((item, index) => {
    const kapTotal = num(item.Kapasitas) * num(selectedDaysCount.value);
    const persen = kapTotal > 0 ? (num(item.Total_Meter) / kapTotal) * 100 : 0;

    worksheet.addRow([
      index + 1,
      item.Mesin,
      item.Kategori,
      kapTotal,
      num(item.Jml_SPK),
      num(item.Total_Pcs),
      num(item.Total_Meter),
      `${persen.toFixed(1)}%`,
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Output_Digital_Print_${filters.start}_to_${filters.end}.xlsx`,
  );
};

onMounted(() => {
  loadRekap();
});
</script>

<style scoped>
.custom-table :deep(th) {
  font-weight: 700 !important;
  font-size: 11px !important;
  background-color: #f8fafc !important;
}
.custom-table :deep(td) {
  font-size: 12px !important;
}
</style>
