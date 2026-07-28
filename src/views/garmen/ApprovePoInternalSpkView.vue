<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { approvePoInternalSpkService } from "@/services/garmen/approvePoInternalSpkService";
import ApprovePoInternalSpkModal from "@/components/garmen/ApprovePoInternalSpkModal.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconCircleCheck, IconFileExport } from "@tabler/icons-vue";

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
  onlyNotApproved: false,
});

const showApproveModal = ref(false);
const approveNomor = ref("");

// --- BROWSE SETUP ---
const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId: "126",
    fetchApi: async () => {
      const res = await approvePoInternalSpkService.getBrowse({
        startDate: filterState.value.dtAwal,
        endDate: filterState.value.dtAkhir,
        onlyNotApproved: filterState.value.onlyNotApproved,
      });
      return res.data.data;
    },
    immediate: false,
  });

// --- HEADERS ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "130px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Nomor PO", key: "NomorPO", width: "130px" },
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Jasa", key: "Jasa", width: "110px" },
  { title: "Dari", key: "Dari", width: "60px", align: "center" },
  { title: "Tujuan", key: "Tujuan", width: "60px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Approved", key: "Approved", width: "80px", align: "center" },
];

// --- ROW COLOR (replikasi cxGrdMasterStylesGetContentStyle — merah
// kalau belum di-approve) ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Approved === "N") {
    return { style: "color:#d32f2f!important;font-weight:600" };
  }
  return {};
};

// --- EXPAND LOGIC (DETAIL KOMPONEN) ---
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
      const res = await approvePoInternalSpkService.getDetail(nomor);
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
watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.onlyNotApproved,
  ],
  fetchData,
);

const onApprove = async (item: any) => {
  try {
    const res = await approvePoInternalSpkService.checkApprovable(item.Nomor);
    if (!res.data.data.allowed) {
      return toast.warning(res.data.data.message);
    }
    approveNomor.value = item.Nomor;
    showApproveModal.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi data.");
  }
};

const onApproved = () => {
  fetchData();
};

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nomor PO", key: "NomorPO", width: 20 },
      { header: "SPK", key: "SPK", width: 20 },
      { header: "Jasa", key: "Jasa", width: 18 },
      { header: "Dari", key: "Dari", width: 10, align: "center" },
      { header: "Tujuan", key: "Tujuan", width: 10, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 26 },
      { header: "Approved", key: "Approved", width: 10, align: "center" },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      Tanggal: formatTanggal(it.Tanggal),
    }));

    await exportExcelSingle(
      `Approval_SJ_PO_Internal_${today}.xlsx`,
      "Approval SJ PO Internal",
      columns,
      rows,
      `Approval Surat Jalan PO Internal  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
        const res = await approvePoInternalSpkService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      const masterCells = {
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        NomorPO: item.NomorPO,
        SPK: item.SPK,
        Approved: item.Approved,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!detail || detail.length === 0) {
        combinedRows.push({
          ...masterCells,
          Kode: "",
          Komponen: "",
          Satuan: "",
          Size: "",
          JumlahDtl: "",
          BsLiniDtl: "",
          BsSablonDtl: "",
          BsKainDtl: "",
        });
      } else {
        detail.forEach((dRow: any, idx: number) => {
          combinedRows.push({
            ...(idx === 0 ? masterCells : blankMaster),
            Kode: dRow.Kode,
            Komponen: dRow.Komponen,
            Satuan: dRow.Satuan,
            Size: dRow.Size,
            JumlahDtl: Number(dRow.Jumlah) || 0,
            BsLiniDtl: Number(dRow.BsLini) || 0,
            BsSablonDtl: Number(dRow.BsSablon) || 0,
            BsKainDtl: Number(dRow.BsKain) || 0,
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nomor PO", key: "NomorPO", width: 20 },
      { header: "SPK", key: "SPK", width: 20 },
      { header: "Approved", key: "Approved", width: 10, align: "center" },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Komponen", key: "Komponen", width: 26 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Size", key: "Size", width: 10, align: "center" },
      {
        header: "Jumlah",
        key: "JumlahDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Lini",
        key: "BsLiniDtl",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Sablon",
        key: "BsSablonDtl",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain",
        key: "BsKainDtl",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_Approval_SJ_PO_Internal_${today}.xlsx`,
      "Detail Komponen",
      columns,
      combinedRows,
      `Detail Komponen Approval SJ PO Internal  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
    title="Approval Surat Jalan PO Internal"
    menu-id="126"
    :icon="IconCircleCheck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
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
      <label class="chk-group">
        <input type="checkbox" v-model="filterState.onlyNotApproved" />
        <span>Hanya Belum Approve</span>
      </label>
      <div class="f-divider" />
      <span class="legend-text">
        <span class="legend-dot" style="background: #d32f2f"></span>Belum
        Approve
      </span>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
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
          <div class="expand-title mb-2">
            Detail Komponen - {{ item.Nomor }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="90">Kode</th>
                <th width="200">Komponen</th>
                <th width="60">Satuan</th>
                <th width="70">Size</th>
                <th width="80" class="tr">Jumlah</th>
                <th width="70" class="tr">BS Lini</th>
                <th width="75" class="tr">BS Sablon</th>
                <th width="70" class="tr">BS Kain</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.Nomor]" :key="i">
                <td class="font-weight-bold text-blue-darken-2">
                  {{ dRow.Kode }}
                </td>
                <td>{{ dRow.Komponen }}</td>
                <td class="tc">{{ dRow.Satuan }}</td>
                <td class="tc">{{ dRow.Size }}</td>
                <td class="tr">{{ numFmt(dRow.Jumlah) }}</td>
                <td class="tr">{{ numFmt(dRow.BsLini) }}</td>
                <td class="tr">{{ numFmt(dRow.BsSablon) }}</td>
                <td class="tr">{{ numFmt(dRow.BsKain) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="8" class="text-center text-grey py-3 font-italic">
                  Tidak ada rincian komponen.
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
        color="success"
        :disabled="selected.length === 0 || selected[0]?.Approved === 'Y'"
        @click="onApprove(selected[0])"
      >
        <template #prepend><IconCircleCheck :size="15" /></template>Approve
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

  <ApprovePoInternalSpkModal
    v-model="showApproveModal"
    :nomor="approveNomor"
    @approved="onApproved"
  />
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

.chk-group {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.ml-2 {
  margin-left: 8px;
}

.legend-text {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  color: #757575;
}
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
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
.tc {
  text-align: center;
}
.tr {
  text-align: right !important;
}
</style>
