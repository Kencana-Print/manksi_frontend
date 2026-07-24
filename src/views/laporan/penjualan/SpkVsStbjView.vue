<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsStbjService } from "@/services/laporan/penjualan/spkVsStbjService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import api from "@/services/api";
import { IconClipboardList, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

// --- STATE FILTER (default: awal bulan s.d. hari ini, divisi 4) ---
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
  divisi: "4",
});

// --- DROPDOWN DIVISI (dari tdivisi, "0" = SEMUA) ---
const divisiOptions = ref<{ value: string; title: string }[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { value: "0", title: "0 - SEMUA DIVISI" },
      ...res.data.data.map((d: any) => ({
        value: String(d.kode ?? d.Kode),
        title: `${d.kode ?? d.Kode} - ${d.nama ?? d.Nama ?? d.divisi ?? d.Divisi}`,
      })),
    ];
  } catch {
    console.error("Gagal memuat divisi");
  }
};

// --- BROWSE SETUP ---
const { items, isLoading, selected, canExport, fetchData } = useBrowse({
  menuId: "304",
  fetchApi: async () => {
    const res = await spkVsStbjService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Divisi", key: "Divisi", width: "130px" },
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Hari", key: "Hari", width: "60px", align: "right" },
  { title: "Tgl Jadi", key: "TanggalJadi", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Jumlah Jadi", key: "JumlahJadi", width: "90px", align: "right" },
  { title: "Kode", key: "Kode", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Alamat", key: "Alamat", minWidth: "220px" },
];

// --- EXPAND LOGIC (DETAIL STBJ) ---
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
      const res = await spkVsStbjService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail STBJ ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- HANDLERS ---
onMounted(() => {
  loadDivisi();
  fetchData();
});
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.divisi, fetchData);

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Divisi", key: "Divisi", width: 16 },
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Hari", key: "Hari", width: 10, align: "right" },
      { header: "Tgl Jadi", key: "TanggalJadi", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Nama", key: "Nama", width: 30 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jumlah Jadi",
        key: "JumlahJadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Kode Cus", key: "Kode", width: 12 },
      { header: "Customer", key: "Customer", width: 26 },
      { header: "Alamat", key: "Alamat", width: 30 },
    ];
    await exportExcelSingle(
      `Laporan_SPK_vs_STBJ_${today}.xlsx`,
      "SPK vs STBJ",
      columns,
      items.value.map((it: any) => ({
        ...it,
        Tanggal: formatTanggal(it.Tanggal),
        TanggalJadi: formatTanggal(it.TanggalJadi),
        Dateline: formatTanggal(it.Dateline),
      })),
      `Laporan SPK vs STBJ  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
        const res = await spkVsStbjService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      const masterCells = {
        Divisi: item.Divisi,
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        Hari: item.Hari === "" || item.Hari === null ? "" : item.Hari,
        TanggalJadi: formatTanggal(item.TanggalJadi),
        Dateline: formatTanggal(item.Dateline),
        Nama: item.Nama,
        Jumlah: Number(item.Jumlah) || 0,
        JumlahJadi: Number(item.JumlahJadi) || 0,
        Kode: item.Kode,
        Customer: item.Customer,
        Alamat: item.Alamat,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!detail || detail.length === 0) {
        // ✅ SPK tanpa STBJ tetap muncul 1 baris, kolom detail kosong
        combinedRows.push({
          ...masterCells,
          NomorStbj: "",
          TglStbj: "",
          JumlahStbj: "",
        });
      } else {
        detail.forEach((dRow: any, idx: number) => {
          combinedRows.push({
            // ✅ Kolom master cuma keisi di baris pertama grup ini,
            // baris berikutnya dikosongin (gak diulang tiap baris)
            ...(idx === 0 ? masterCells : blankMaster),
            NomorStbj: dRow.NomorStbj,
            TglStbj: formatTanggal(dRow.Tanggal),
            JumlahStbj: Number(dRow.Jumlah) || 0,
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Divisi", key: "Divisi", width: 16 },
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Hari", key: "Hari", width: 10, align: "right" },
      { header: "Tgl Jadi", key: "TanggalJadi", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Nama", key: "Nama", width: 30 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jumlah Jadi",
        key: "JumlahJadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Kode Cus", key: "Kode", width: 12 },
      { header: "Customer", key: "Customer", width: 26 },
      { header: "Alamat", key: "Alamat", width: 30 },
      { header: "No. STBJ", key: "NomorStbj", width: 20 },
      { header: "Tgl STBJ", key: "TglStbj", width: 14, align: "center" },
      {
        header: "Jml STBJ",
        key: "JumlahStbj",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Laporan_SPK_vs_STBJ_${today}.xlsx`,
      "SPK vs STBJ",
      columns,
      combinedRows,
      `Laporan SPK vs STBJ  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
    title="Laporan SPK vs STBJ"
    menu-id="304"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filterState.divisi" class="f-select">
          <option
            v-for="opt in divisiOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.TanggalJadi="{ item }">{{
      formatTanggal(item.TanggalJadi)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.JumlahJadi="{ item }">{{
      numFmt(item.JumlahJadi)
    }}</template>
    <template #item.Hari="{ item }">{{
      item.Hari === "" || item.Hari === null ? "-" : item.Hari
    }}</template>

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
          <div class="expand-title mb-2">Detail STBJ - {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Nomor</th>
                <th width="180">Nomor STBJ</th>
                <th width="100">Tanggal</th>
                <th width="100" class="tr">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.Nomor]" :key="i">
                <td>{{ dRow.Nomor }}</td>
                <td class="font-weight-bold text-blue-darken-2">
                  {{ dRow.NomorStbj }}
                </td>
                <td>{{ formatTanggal(dRow.Tanggal) }}</td>
                <td class="tr font-weight-bold">{{ numFmt(dRow.Jumlah) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="4" class="text-center text-grey py-3 font-italic">
                  Belum ada STBJ untuk SPK ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
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
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.f-date:focus,
.f-select:focus {
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
