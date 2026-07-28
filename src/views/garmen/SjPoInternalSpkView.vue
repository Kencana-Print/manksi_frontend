<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { sjPoInternalSpkService } from "@/services/garmen/sjPoInternalSpkService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import api from "@/services/api";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconTruckDelivery,
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
    menuId: "125",
    fetchApi: async () => {
      const res = await sjPoInternalSpkService.getBrowse({
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
  { title: "Nomor SJ", key: "NomorSJ", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Nomor PO", key: "NomorPO", width: "140px" },
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Jasa", key: "Jasa", width: "120px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Tujuan", key: "Tujuan", width: "70px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Cmt", key: "Cmt", width: "55px", align: "center" },
  { title: "Approve", key: "Approve", width: "75px", align: "center" },
  { title: "No Mutasi", key: "NoMutasi", minWidth: "160px" },
];

// --- ROW COLOR (replikasi cxGrdMasterCustomDrawCell) ---
// Merah = belum di-approve (seluruh baris). Biru khusus kolom
// NomorSJ (bukan seluruh baris) kalau Cmt='Y', ditangani lewat
// template #item.NomorSJ di bawah, bukan lewat rowPropsFn.
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Approve === "N") {
    return { style: "color:#d32f2f!important;font-weight:600" };
  }
  return { style: "color:#212121!important" };
};

// --- EXPAND LOGIC (DETAIL KOMPONEN) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.NomorSJ] && !expandedLoading.value[item.NomorSJ],
  );

  for (const item of newlyExpanded) {
    const nomor = item.NomorSJ;
    expandedLoading.value[nomor] = true;
    try {
      const res = await sjPoInternalSpkService.getDetail(nomor);
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
  router.push({ name: "SjPoInternalSpkCreate" });
};

const onEdit = async (item: any) => {
  try {
    const res = await sjPoInternalSpkService.checkModifiable(item.NomorSJ);
    if (!res.data.data.allowed) {
      return toast.warning(res.data.data.message);
    }
    router.push(
      `/garmen/po-internal-spk/sj-po-internal/form/${encodeURIComponent(item.NomorSJ)}`,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi data.");
  }
};

const onDelete = async (item: any) => {
  try {
    await sjPoInternalSpkService.delete(item.NomorSJ);
    toast.success("Sukses");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = (item: any) => {
  window.open(
    `/garmen/po-internal-spk/sj-po-internal/print/${encodeURIComponent(item.NomorSJ)}`,
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
      { header: "Nomor SJ", key: "NomorSJ", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nomor PO", key: "NomorPO", width: 20 },
      { header: "SPK", key: "SPK", width: 20 },
      { header: "Jasa", key: "Jasa", width: 18 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Tujuan", key: "Tujuan", width: 10, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 26 },
      { header: "Cmt", key: "Cmt", width: 8, align: "center" },
      { header: "Approve", key: "Approve", width: 10, align: "center" },
      { header: "No Mutasi", key: "NoMutasi", width: 24 },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      Tanggal: formatTanggal(it.Tanggal),
    }));

    await exportExcelSingle(
      `SJ_PO_Internal_${today}.xlsx`,
      "SJ PO Internal",
      columns,
      rows,
      `Surat Jalan PO Internal  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
      let detail = detailCache.value[item.NomorSJ];
      if (!detail) {
        const res = await sjPoInternalSpkService.getDetail(item.NomorSJ);
        detail = res.data.data;
        detailCache.value[item.NomorSJ] = detail;
      }

      const masterCells = {
        NomorSJ: item.NomorSJ,
        Tanggal: formatTanggal(item.Tanggal),
        NomorPO: item.NomorPO,
        SPK: item.SPK,
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
          BsLiniDtl: "",
          BsSablonDtl: "",
          BsKainDtl: "",
          KoliDtl: "",
          KeteranganDtl: "",
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
            KoliDtl: Number(dRow.Koli) || 0,
            KeteranganDtl: dRow.Keterangan || "",
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Nomor SJ", key: "NomorSJ", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nomor PO", key: "NomorPO", width: 20 },
      { header: "SPK", key: "SPK", width: 20 },
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
        header: "BS Lini",
        key: "BsLiniDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Sablon",
        key: "BsSablonDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain",
        key: "BsKainDtl",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Koli",
        key: "KoliDtl",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "KeteranganDtl", width: 22 },
    ];

    await exportExcelSingle(
      `Export_Detail_SJ_PO_Internal_${today}.xlsx`,
      "Detail Komponen",
      columns,
      combinedRows,
      `Detail Komponen SJ PO Internal  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
    title="Surat Jalan PO Internal"
    menu-id="125"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    item-value="NomorSJ"
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
        <span class="f-label">Periode</span>
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

    <!-- Biru khusus teks NomorSJ kalau Cmt='Y' (bukan seluruh baris) -->
    <template #item.NomorSJ="{ item }">
      <span :style="item.Cmt === 'Y' ? 'color:#1565c0;font-weight:700' : ''">{{
        item.NomorSJ
      }}</span>
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.NomorSJ]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Komponen - {{ item.NomorSJ }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="90">Kode</th>
                <th width="200">Komponen</th>
                <th width="70">Satuan</th>
                <th width="70">Size</th>
                <th width="80" class="tr">Jumlah</th>
                <th width="70" class="tr">BS Lini</th>
                <th width="80" class="tr">BS Sablon</th>
                <th width="70" class="tr">BS Kain</th>
                <th width="60" class="tr">Koli</th>
                <th width="160">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.NomorSJ]" :key="i">
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
                <td class="tr">{{ numFmt(dRow.Koli) }}</td>
                <td>{{ dRow.Keterangan }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.NomorSJ] ||
                  detailCache[item.NomorSJ].length === 0
                "
              >
                <td colspan="10" class="text-center text-grey py-3 font-italic">
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
    filter-mode="spk-ppic"
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
