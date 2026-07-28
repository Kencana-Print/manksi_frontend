<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { inputPlanningSpkService } from "@/services/garmen/inputPlanningSpkService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconCalendarStats, IconFileExport } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

// --- STATE FILTER (default: awal bulan s.d. hari ini) ---
const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
});

// --- BROWSE SETUP ---
const { items, isLoading, selected, canEdit, fetchData } = useBrowse({
  menuId: "80",
  fetchApi: async () => {
    const res = await inputPlanningSpkService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "130px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "70px", align: "center" },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Kepentingan", key: "Kepentingan", width: "100px" },
  { title: "KdCus", key: "KdCus", width: "80px" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "220px" },
  { title: "Jumlah SPK", key: "JumlahSPK", width: "100px", align: "right" },
  { title: "Kain", key: "Kain", minWidth: "160px" },
  { title: "Finishing", key: "Finishing", minWidth: "160px" },
  { title: "Sablon", key: "Sablon", width: "70px", align: "center" },
  { title: "Sublim", key: "Sublim", width: "70px", align: "center" },
  { title: "Bordir", key: "Bordir", width: "70px", align: "center" },
  { title: "RPB", key: "RPB", width: "80px", align: "center" },
  { title: "Belum", key: "Belum", width: "70px", align: "center" },
];

// --- LEGEND WARNA TAHAP (replikasi legend bar Delphi) ---
const legend = [
  { no: 1, label: "Bahan datang", bg: "#f44336", fg: "#fff" },
  { no: 2, label: "Cutting", bg: "#00ff00", fg: "#000" },
  { no: 3, label: "Cetak", bg: "#ffeb3b", fg: "#000" },
  { no: 4, label: "Bordir", bg: "#00ffff", fg: "#000" },
  { no: 5, label: "Jahit", bg: "#f2be71", fg: "#000" },
  { no: 6, label: "Finishing", bg: "#ff00ff", fg: "#000" },
  { no: 7, label: "Kirim", bg: "#c0c0c0", fg: "#000" },
];

// --- WARNA CELL "Nomor" berdasarkan tahap Belum (1-7) ---
// Replikasi persis cxGrdMasterCustomDrawCell: Belum=0 (semua tahap
// terisi) tidak diwarnai sama sekali (default).
const belumStyle = (belum: number) => {
  const found = legend.find((l) => l.no === Number(belum));
  if (!found) return "";
  return `background:${found.bg};color:${found.fg};font-weight:700;padding:2px 6px;border-radius:2px;display:inline-block`;
};

// --- EXPAND LOGIC (DETAIL TAHAP PLANNING) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await inputPlanningSpkService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- HANDLERS ---
onMounted(() => fetchData());
watch(() => [filterState.value.dtAwal, filterState.value.dtAkhir], fetchData);

// --- PLANNING (navigasi ke form input planning per SPK) ---
const onPlanning = (item: any) => {
  if (!item?.Nomor) {
    toast.warning("Pilih salah satu baris SPK terlebih dahulu.");
    return;
  }
  if (!canEdit.value) {
    toast.warning("Anda tidak berhak mengubah data di Modul ini.");
    return;
  }
  router.push(
    `/garmen/planning-per-spk/input-planning/form/${encodeURIComponent(item.Nomor)}`,
  );
};

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 10, align: "center" },
      { header: "Tipe", key: "Tipe", width: 14 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Kepentingan", key: "Kepentingan", width: 16 },
      { header: "KdCus", key: "KdCus", width: 12 },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      {
        header: "Jumlah SPK",
        key: "JumlahSPK",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Kain", key: "Kain", width: 26 },
      { header: "Finishing", key: "Finishing", width: 26 },
      { header: "Sablon", key: "Sablon", width: 10, align: "center" },
      { header: "Sublim", key: "Sublim", width: 10, align: "center" },
      { header: "Bordir", key: "Bordir", width: 10, align: "center" },
      { header: "RPB", key: "RPB", width: 12, align: "center" },
      { header: "Belum", key: "Belum", width: 10, align: "center" },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      Tanggal: formatTanggal(it.Tanggal),
      Dateline: formatTanggal(it.Dateline),
    }));

    await exportExcelSingle(
      `Planning_Per_SPK_${today}.xlsx`,
      "Planning per SPK",
      columns,
      rows,
      `Input Planning per SPK  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

// --- EXPORT DETAIL ---
const exportDetail = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  toast.info("Menyiapkan data detail untuk diexport... Mohon tunggu.");

  try {
    const combinedRows: any[] = [];

    for (const item of items.value) {
      let detail = detailCache.value[item.Nomor];
      if (!detail) {
        const res = await inputPlanningSpkService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      const masterCells = {
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        NamaSPK: item.NamaSPK,
        Cab: item.Cab,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!detail || detail.length === 0) {
        combinedRows.push({
          ...masterCells,
          TglEstimasi: "",
          KedatanganBahan: "",
          Cutting: "",
          Cetak: "",
          Sublim: "",
          Bordir: "",
          Jahit: "",
          Finishing: "",
          Kirim: "",
        });
      } else {
        detail.forEach((dRow: any, idx: number) => {
          combinedRows.push({
            ...(idx === 0 ? masterCells : blankMaster),
            TglEstimasi: formatTanggal(dRow.TglEstimasi),
            KedatanganBahan: Number(dRow.KedatanganBahan) || 0,
            Cutting: Number(dRow.Cutting) || 0,
            Cetak: Number(dRow.Cetak) || 0,
            Sublim: Number(dRow.Sublim) || 0,
            Bordir: Number(dRow.Bordir) || 0,
            Jahit: Number(dRow.Jahit) || 0,
            Finishing: Number(dRow.Finishing) || 0,
            Kirim: Number(dRow.Kirim) || 0,
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Nomor SPK", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      {
        header: "Tgl Estimasi",
        key: "TglEstimasi",
        width: 14,
        align: "center",
      },
      {
        header: "Bahan Datang",
        key: "KedatanganBahan",
        width: 13,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Cutting",
        key: "Cutting",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Cetak",
        key: "Cetak",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Sublim",
        key: "Sublim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Bordir",
        key: "Bordir",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jahit",
        key: "Jahit",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Finishing",
        key: "Finishing",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_Planning_Per_SPK_${today}.xlsx`,
      "Detail Planning",
      columns,
      combinedRows,
      `Detail Planning per SPK  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export detail.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail.");
  }
};

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseBrowse
    title="Input Planning per SPK"
    menu-id="80"
    :icon="IconCalendarStats"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    item-value="Nomor"
    @refresh="fetchData"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl SPK</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="legend-bar">
        <span v-for="l in legend" :key="l.no" class="legend-item">
          <span class="legend-box" :style="`background:${l.bg}`"></span>
          {{ l.no }}.{{ l.label }}
        </span>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <span :style="belumStyle(item.Belum)">{{ item.Nomor }}</span>
    </template>
    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.JumlahSPK="{ item }">{{ numFmt(item.JumlahSPK) }}</template>
    <template #item.RPB="{ item }">
      <span
        :style="
          item.RPB === 'BELUM'
            ? 'background:#ffeb3b;color:#000;font-weight:700;padding:2px 6px;border-radius:2px;display:inline-block'
            : ''
        "
        >{{ item.RPB }}</span
      >
    </template>
    <template #item.Belum="{ item }">
      <span :style="belumStyle(item.Belum) || ''" style="padding: 2px 8px">{{
        item.Belum
      }}</span>
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Planning - {{ item.Nomor }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Tgl Estimasi</th>
                <th width="90" class="tr">Bahan Datang</th>
                <th width="80" class="tr">Cutting</th>
                <th width="80" class="tr">Cetak</th>
                <th width="80" class="tr">Sublim</th>
                <th width="80" class="tr">Bordir</th>
                <th width="80" class="tr">Jahit</th>
                <th width="80" class="tr">Finishing</th>
                <th width="80" class="tr">Kirim</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.Nomor]" :key="i">
                <td>{{ formatTanggal(dRow.TglEstimasi) }}</td>
                <td class="tr">{{ numFmt(dRow.KedatanganBahan) }}</td>
                <td class="tr">{{ numFmt(dRow.Cutting) }}</td>
                <td class="tr">{{ numFmt(dRow.Cetak) }}</td>
                <td class="tr">{{ numFmt(dRow.Sublim) }}</td>
                <td class="tr">{{ numFmt(dRow.Bordir) }}</td>
                <td class="tr">{{ numFmt(dRow.Jahit) }}</td>
                <td class="tr">{{ numFmt(dRow.Finishing) }}</td>
                <td class="tr">{{ numFmt(dRow.Kirim) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="9" class="text-center text-grey py-3 font-italic">
                  Belum ada data planning untuk SPK ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="primary"
        :disabled="selected.length === 0"
        @click="onPlanning(selected[0])"
      >
        <template #prepend><IconCalendarStats :size="15" /></template>Planning
      </v-btn>
      <v-btn
        size="small"
        color="deep-purple-darken-1"
        class="ml-2"
        @click="exportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  color: #444;
  white-space: nowrap;
}
.legend-box {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  display: inline-block;
}

.ml-2 {
  margin-left: 8px;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
