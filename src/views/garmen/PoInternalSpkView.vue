<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { poInternalSpkService } from "@/services/garmen/poInternalSpkService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import api from "@/services/api";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconListDetails,
  IconPrinter,
  IconFileExport,
  IconSearch,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

// --- STATE FILTER (default: awal bulan s.d. hari ini, cabang ALL) ---
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
  cabang: "ALL",
  spkNomor: "",
  komponenKode: "",
});

const namaSpkHint = ref("");
const namaKomponenHint = ref("");

// --- BROWSE SETUP ---
const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId: "124",
    fetchApi: async () => {
      const res = await poInternalSpkService.getBrowse({
        startDate: filterState.value.dtAwal,
        endDate: filterState.value.dtAkhir,
        cabang: filterState.value.cabang,
        spkNomor: filterState.value.spkNomor,
        komponenKode: filterState.value.komponenKode,
      });
      return res.data.data;
    },
    immediate: false,
  });

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "220px" },
  { title: "Jasa", key: "Jasa", width: "120px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Tujuan", key: "Tujuan", width: "120px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "SJ", key: "SJ", width: "80px", align: "right" },
  { title: "BS", key: "BS", width: "70px", align: "right" },
  { title: "Selisih", key: "Selisih", width: "90px", align: "right" },
];

// --- ROW COLOR (replikasi cxGrdMasterCustomDrawCell) ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Closed === "N" && Number(item.SJ) === 0) {
    return { style: "color:#d32f2f!important;font-weight:600" }; // merah
  }
  if (item.Closed === "N" && Number(item.SJ) !== 0) {
    return { style: "color:#1565c0!important;font-weight:600" }; // biru
  }
  return { style: "color:#212121!important" }; // hitam (Closed='Y')
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
      const res = await poInternalSpkService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- FILTER: SPK (blur validate + F1 modal) ---
const showSpkModal = ref(false);
const onSpkSelected = (item: any) => {
  filterState.value.spkNomor = item.Nomor;
  namaSpkHint.value = item.Nama || "";
};
const onSpkKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showSpkModal.value = true;
  }
};
const onSpkBlur = async () => {
  const kode = filterState.value.spkNomor.trim();
  if (!kode) {
    namaSpkHint.value = "";
    return;
  }
  try {
    const res = await api.get("/lookups/spk", {
      params: { q: kode, limit: 5 },
    });
    const items = res.data.data?.items || [];
    const exact = items.find(
      (x: any) => (x.Nomor || "").toUpperCase() === kode.toUpperCase(),
    );
    if (exact) {
      filterState.value.spkNomor = exact.Nomor;
      namaSpkHint.value = exact.Nama;
    } else {
      toast.warning("Nomor SPK tsb tidak ada.");
      namaSpkHint.value = "";
    }
  } catch {
    namaSpkHint.value = "";
  }
};
const clearSpkFilter = () => {
  filterState.value.spkNomor = "";
  namaSpkHint.value = "";
};

// --- FILTER: Komponen (blur fuzzy-resolve + F1 modal, mode="komponen") ---
const showKomponenModal = ref(false);
const onKomponenSelected = (item: any) => {
  filterState.value.komponenKode = item.Kode;
  namaKomponenHint.value = item.Nama || "";
};
const onKomponenKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showKomponenModal.value = true;
  }
};
const onKomponenBlur = async () => {
  const text = filterState.value.komponenKode.trim();
  if (!text) {
    namaKomponenHint.value = "";
    return;
  }
  try {
    const res = await api.get("/lookups/bahan", {
      params: { q: text, mode: "komponen", limit: 1 },
    });
    const items = res.data.data?.items || [];
    if (items.length > 0) {
      filterState.value.komponenKode = items[0].Kode;
      namaKomponenHint.value = items[0].Nama;
    } else {
      toast.warning("Komponen ini belum ada.");
      namaKomponenHint.value = "";
    }
  } catch {
    namaKomponenHint.value = "";
  }
};
const clearKomponenFilter = () => {
  filterState.value.komponenKode = "";
  namaKomponenHint.value = "";
};

// --- HANDLERS ---
onMounted(() => fetchData());
watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.cabang,
    filterState.value.spkNomor,
    filterState.value.komponenKode,
  ],
  fetchData,
);

const onAdd = () => {
  router.push({ name: "PoInternalSpkCreate" });
};

const onEdit = async (item: any) => {
  try {
    const res = await poInternalSpkService.checkModifiable(item.Nomor);
    if (!res.data.data.allowed) {
      return toast.warning(res.data.data.message);
    }
    router.push(
      `/garmen/po-internal-spk/po-internal/form/${encodeURIComponent(item.Nomor)}`,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi data.");
  }
};

const onDelete = async (item: any) => {
  try {
    await poInternalSpkService.delete(item.Nomor);
    toast.success("Sukses");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = (item: any) => {
  window.open(
    `/garmen/po-internal-spk/po-internal/print/${encodeURIComponent(item.Nomor)}`,
    "_blank",
  );
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
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "SPK", key: "SPK", width: 20 },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      { header: "Jasa", key: "Jasa", width: 18 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Tujuan", key: "Tujuan", width: 18 },
      { header: "Keterangan", key: "Keterangan", width: 26 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "SJ", key: "SJ", width: 12, align: "right", numFmt: "#,##0" },
      { header: "BS", key: "BS", width: 12, align: "right", numFmt: "#,##0" },
      {
        header: "Selisih",
        key: "Selisih",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Closed", key: "Closed", width: 10, align: "center" },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      Tanggal: formatTanggal(it.Tanggal),
      Dateline: formatTanggal(it.Dateline),
    }));

    await exportExcelSingle(
      `PO_Internal_SPK_${today}.xlsx`,
      "PO Internal",
      columns,
      rows,
      `PO Internal SPK  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
        const res = await poInternalSpkService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      const masterCells = {
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        SPK: item.SPK,
        NamaSPK: item.NamaSPK,
        Cab: item.Cab,
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
          SJDtl: "",
          BSDtl: "",
          SelisihDtl: "",
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
            SJDtl: Number(dRow.SJ) || 0,
            BSDtl: Number(dRow.BS) || 0,
            SelisihDtl: Number(dRow.Selisih) || 0,
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Nomor PO", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "SPK", key: "SPK", width: 20 },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
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
        header: "SJ",
        key: "SJDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS",
        key: "BSDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Selisih",
        key: "SelisihDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_PO_Internal_SPK_${today}.xlsx`,
      "Detail Komponen",
      columns,
      combinedRows,
      `Detail Komponen PO Internal SPK  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
    title="PO Internal"
    menu-id="124"
    :icon="IconListDetails"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
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
        <span class="f-label">Cabang</span>
        <select v-model="filterState.cabang" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Komponen</span>
        <div class="igrp">
          <input
            v-model="filterState.komponenKode"
            class="f-inp"
            style="width: 90px; background: #fff9c4"
            placeholder="F1/Enter..."
            @keydown="onKomponenKeydown"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @blur="onKomponenBlur"
          />
          <button type="button" class="blkp" @click="showKomponenModal = true">
            <IconSearch :size="12" color="#1565c0" />
          </button>
        </div>
        <span v-if="namaKomponenHint" class="hint-text">{{
          namaKomponenHint
        }}</span>
        <button
          v-if="filterState.komponenKode"
          class="f-clear"
          @click="clearKomponenFilter"
        >
          ✕
        </button>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Filter SPK</span>
        <div class="igrp">
          <input
            v-model="filterState.spkNomor"
            class="f-inp"
            style="width: 140px; background: #fff9c4"
            placeholder="F1/Enter..."
            @keydown="onSpkKeydown"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @blur="onSpkBlur"
          />
          <button type="button" class="blkp" @click="showSpkModal = true">
            <IconSearch :size="12" color="#1565c0" />
          </button>
        </div>
        <span v-if="namaSpkHint" class="hint-text">{{ namaSpkHint }}</span>
        <button
          v-if="filterState.spkNomor"
          class="f-clear"
          @click="clearSpkFilter"
        >
          ✕
        </button>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.SJ="{ item }">{{ numFmt(item.SJ) }}</template>
    <template #item.BS="{ item }">{{ numFmt(item.BS) }}</template>
    <template #item.Selisih="{ item }">{{ numFmt(item.Selisih) }}</template>

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
                <th width="220">Komponen</th>
                <th width="70">Satuan</th>
                <th width="70">Size</th>
                <th width="90" class="tr">Jumlah</th>
                <th width="80" class="tr">SJ</th>
                <th width="70" class="tr">BS</th>
                <th width="90" class="tr">Selisih</th>
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
                <td class="tr">{{ numFmt(dRow.SJ) }}</td>
                <td class="tr">{{ numFmt(dRow.BS) }}</td>
                <td class="tr font-weight-bold">{{ numFmt(dRow.Selisih) }}</td>
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
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint(selected[0])"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
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

  <BahanSearchModal
    v-model="showKomponenModal"
    mode="komponen"
    @selected="onKomponenSelected"
  />
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="all"
    @selected="onSpkSelected"
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
.f-clear {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
}
.hint-text {
  font-size: 10.5px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  overflow: hidden;
  height: 28px;
  background: white;
  flex-shrink: 0;
}
.f-inp {
  border: none;
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.blkp {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #bbdefb;
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
.tc {
  text-align: center;
}
.tr {
  text-align: right !important;
}
</style>
