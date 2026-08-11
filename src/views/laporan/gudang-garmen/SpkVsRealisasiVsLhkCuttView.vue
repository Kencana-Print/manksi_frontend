<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import DetailFilterTable from "@/components/DetailFilterTable.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsRealisasiVsLhkCuttService } from "@/services/laporan/gudang-garmen/spkVsRealisasiVsLhkCuttService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import {
  IconListCheck,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const authStore = useAuthStore();
const toast = useToast();
const menuId = "517";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filters = ref({
  startDate: toLocalDateStr(firstDayOfMonth),
  endDate: toLocalDateStr(today),
  spk: "",
  isMap: false,
  namaBahan: "",
});
const namaSpkTerpilih = ref("");
const showSpkModal = ref(false);
const showBahanModal = ref(false);
const namaBahanTerpilih = ref("");

const onSpkSelected = (item: any) => {
  filters.value.spk = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  fetchData();
};
const clearSpk = () => {
  filters.value.spk = "";
  namaSpkTerpilih.value = "";
  fetchData();
};

const onBahanSelected = (item: any) => {
  filters.value.namaBahan = item.Kode;
  namaBahanTerpilih.value = item.Nama || "";
  fetchData();
};

const clearBahan = () => {
  filters.value.namaBahan = "";
  namaBahanTerpilih.value = "";
  fetchData();
};

const canLihatCus = computed(
  () => Number(authStore.user?.flags?.lihatCus) === 1,
);

const masterHeaders = computed(() => {
  const h: any[] = [
    { title: "Spk", key: "Spk", width: "140px" },
    { title: "Divisi", key: "Divisi", width: "90px" },
    { title: "Workshop", key: "Workshop", width: "90px" },
    { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
    { title: "Nama", key: "Nama", minWidth: "220px" },
    { title: "Ukuran", key: "Ukuran", minWidth: "140px" },
  ];
  if (canLihatCus.value) {
    h.push({ title: "Customer", key: "Customer", minWidth: "160px" });
  }
  h.push(
    { title: "Jenis", key: "Jenis", width: "70px" },
    { title: "Kain", key: "Kain", width: "120px" },
    { title: "Jml Order", key: "JmlOrder", width: "90px", align: "end" },
    { title: "Tot Minta", key: "TotMinta", width: "90px", align: "end" },
    { title: "Tot Retur", key: "TotRetur", width: "90px", align: "end" },
    { title: "Net Minta", key: "NetMinta", width: "90px", align: "end" },
    { title: "Lhk", key: "Lhk", width: "90px", align: "end" },
    { title: "Cmt", key: "Cmt", width: "90px", align: "end" },
    { title: "Tot Lhk", key: "TotLhk", width: "90px", align: "end" },
  );
  return h;
});

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkVsRealisasiVsLhkCuttService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.spk,
      filters.value.isMap,
      filters.value.namaBahan,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.isMap,
  ],
  fetchData,
);

// ── Master-detail (row expand) — dikunci pakai Spk ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});
const visibleDetailRows = ref<Record<string, any[]>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const spk = typeof v === "object" ? v.Spk : v;
    if (!spk || detailData.value[spk]) continue;
    detailLoading.value[spk] = true;
    try {
      const res = await spkVsRealisasiVsLhkCuttService.getDetail(spk);
      detailData.value[spk] = res.data.data || [];
    } catch {
      detailData.value[spk] = [];
    } finally {
      detailLoading.value[spk] = false;
    }
  }
};

const fmtNum = (val: any, d = 2) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const formatBackendDate = (v?: string) => (v ? v.replace(/-/g, "/") : "-");

const detailSubtotal = (spk: string) => {
  const rows = visibleDetailRows.value[spk] ?? detailData.value[spk] ?? [];
  const keyword = filters.value.namaBahan.trim().toLowerCase();
  const matched = keyword
    ? rows.filter(
        (d: any) =>
          (d.NamaBahan || "").toLowerCase().includes(keyword) ||
          (d.KodeBahan || "").toLowerCase().includes(keyword),
      )
    : rows;

  return {
    netMinta: matched.reduce(
      (s: number, d: any) => s + Number(d.NetMinta || 0),
      0,
    ),
    totalLhk: matched.reduce(
      (s: number, d: any) => s + Number(d.BeratLhk || 0),
      0,
    ),
  };
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Spk", key: "Spk", width: 18 },
      { header: "Nama", key: "Nama", width: 26 },
      ...(canLihatCus.value
        ? [{ header: "Customer", key: "Customer", width: 22 }]
        : []),
      { header: "No Minta", key: "NoMinta", width: 16 },
      { header: "Tgl Minta", key: "TglMinta", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 14 },
      { header: "Tujuan", key: "Tujuan", width: 14 },
      { header: "Kode Bahan", key: "KodeBahan", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "Komponen", key: "Komponen", width: 16 },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Jml Minta",
        key: "JmlMinta",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jml Retur",
        key: "JmlRetur",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Net Minta",
        key: "NetMinta",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "No Mutasi", key: "NoMutasi", width: 20 },
      { header: "Tgl Mutasi", key: "TglMutasi", width: 12, align: "center" },
      {
        header: "Potong",
        key: "Potong",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Berat",
        key: "Berat",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Sisa Bahan",
        key: "SisaBahan",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran",
        key: "Babaran",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "No MKB", key: "NoMkb", width: 16 },
      { header: "Tgl MKB", key: "TglMkb", width: 12, align: "center" },
      {
        header: "Qty MKB",
        key: "QtyMkb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran MKB",
        key: "BabaranMkb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Supplier", key: "Supplier", width: 20 },
    ];
    await exportExcelSingle(
      `SPK_vs_Realisasi_vs_LHK_Cutting_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "SPK vs Realisasi vs LHK",
      columns,
      items.value,
      "LAPORAN SPK VS REALISASI PERMINTAAN VS LHK CUTTING",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await spkVsRealisasiVsLhkCuttService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.spk,
      filters.value.isMap,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Spk", key: "Spk", width: 18 },
      { header: "Nama", key: "Nama", width: 26 },
      ...(canLihatCus.value
        ? [{ header: "Customer", key: "Customer", width: 22 }]
        : []),
      { header: "No Minta", key: "NoMinta", width: 16 },
      { header: "Tgl Minta", key: "TglMinta", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 14 },
      { header: "Tujuan", key: "Tujuan", width: 14 },
      { header: "Kode Bahan", key: "KodeBahan", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Jml Minta",
        key: "JmlMinta",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jml Retur",
        key: "JmlRetur",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Net Minta",
        key: "NetMinta",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "No Mutasi", key: "NoMutasi", width: 20 },
      { header: "Tgl Mutasi", key: "TglMutasi", width: 12, align: "center" },
      {
        header: "Potong",
        key: "Potong",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Berat",
        key: "Berat",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Sisa Bahan",
        key: "SisaBahan",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran",
        key: "Babaran",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      ...(canLihatCus.value
        ? [{ header: "Supplier", key: "Supplier", width: 20 }]
        : []),
      { header: "No MKB", key: "NoMkb", width: 16 },
      { header: "Tgl MKB", key: "TglMkb", width: 12, align: "center" },
      {
        header: "Qty MKB",
        key: "QtyMkb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran MKB",
        key: "BabaranMkb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `SPK_vs_Realisasi_vs_LHK_Cutting_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail Bahan",
          columns,
          rows,
          title: "RINCIAN SPK VS REALISASI PERMINTAAN VS LHK CUTTING",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="SPK vs Realisasi Permintaan vs LHK Cutting"
    :menu-id="menuId"
    :icon="IconListCheck"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Spk"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tgl SPK</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Bahan</span>
      <div class="spk-picker">
        <input
          type="text"
          :value="namaBahanTerpilih || filters.namaBahan"
          readonly
          class="f-inp"
          style="width: 160px; cursor: pointer"
          placeholder="Klik untuk pilih..."
          @click="showBahanModal = true"
        />
        <button
          v-if="filters.namaBahan"
          type="button"
          class="btn-clear-spk"
          @click="clearBahan"
        >
          ✕
        </button>
        <button
          type="button"
          class="btn-search-spk"
          @click="showBahanModal = true"
        >
          <IconSearch :size="13" />
        </button>
      </div>

      <label class="f-check">
        <input type="checkbox" v-model="filters.isMap" @change="fetchData" />
        <span>MAP</span>
      </label>

      <div class="f-divider" />

      <span class="f-label">SPK/MAP</span>
      <div class="spk-picker">
        <input
          type="text"
          :value="filters.spk"
          readonly
          class="f-inp"
          style="width: 130px; cursor: pointer"
          placeholder="Klik untuk pilih..."
          @click="showSpkModal = true"
        />
        <button
          v-if="filters.spk"
          type="button"
          class="btn-clear-spk"
          @click="clearSpk"
        >
          ✕
        </button>
        <button
          type="button"
          class="btn-search-spk"
          @click="showSpkModal = true"
        >
          <IconSearch :size="13" />
        </button>
      </div>
      <span v-if="namaSpkTerpilih" class="spk-nama-hint">{{
        namaSpkTerpilih
      }}</span>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="success"
        class="mr-1"
        :loading="isExporting"
        @click="onExportMaster"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
    </template>

    <template #item.JmlOrder="{ item }">{{ fmtNum(item.JmlOrder) }}</template>
    <template #item.TotMinta="{ item }">{{ fmtNum(item.TotMinta) }}</template>
    <template #item.TotRetur="{ item }">{{ fmtNum(item.TotRetur) }}</template>
    <template #item.NetMinta="{ item }">{{ fmtNum(item.NetMinta) }}</template>
    <template #item.Lhk="{ item }">{{ fmtNum(item.Lhk) }}</template>
    <template #item.Cmt="{ item }">{{ fmtNum(item.Cmt) }}</template>
    <template #item.TotLhk="{ item }">{{ fmtNum(item.TotLhk) }}</template>
    <template #item.Dateline="{ item }">
      {{ formatBackendDate(item.Dateline) }}
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Spk]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <template v-else>
          <DetailFilterTable
            :headers="[
              { key: 'NoMinta', title: 'No Minta', width: '120px' },
              { key: 'TglMinta', title: 'Tgl Minta', width: '90px' },
              { key: 'Gudang', title: 'Gudang', width: '100px' },
              { key: 'Tujuan', title: 'Tujuan', width: '100px' },
              { key: 'KodeBahan', title: 'Kode Bahan', width: '100px' },
              { key: 'NamaBahan', title: 'Nama Bahan', width: '180px' },
              { key: 'Komponen', title: 'Komponen', width: '100px' },
              { key: 'Satuan', title: 'Satuan', width: '70px' },
              {
                key: 'JmlMinta',
                title: 'Jml Minta',
                width: '85px',
                align: 'right',
              },
              {
                key: 'JmlRetur',
                title: 'Jml Retur',
                width: '85px',
                align: 'right',
              },
              {
                key: 'NetMinta',
                title: 'Net Minta',
                width: '85px',
                align: 'right',
              },
              { key: 'NoMutasi', title: 'No Mutasi', width: '140px' },
              { key: 'TglMutasi', title: 'Tgl Mutasi', width: '90px' },
              { key: 'Potong', title: 'Potong', width: '90px', align: 'right' },
              { key: 'Berat', title: 'Berat', width: '85px', align: 'right' },
              {
                key: 'SisaBahan',
                title: 'Sisa Bahan',
                width: '85px',
                align: 'right',
              },
              {
                key: 'Babaran',
                title: 'Babaran',
                width: '75px',
                align: 'right',
              },
              { key: 'NoMkb', title: 'No MKB', width: '100px' },
              { key: 'TglMkb', title: 'Tgl MKB', width: '90px' },
              {
                key: 'QtyMkb',
                title: 'Qty MKB',
                width: '85px',
                align: 'right',
              },
              {
                key: 'BabaranMkb',
                title: 'Babaran MKB',
                width: '90px',
                align: 'right',
              },
              ...(canLihatCus
                ? [{ key: 'Supplier', title: 'Supplier', width: '140px' }]
                : []),
            ]"
            :items="detailData[item.Spk] || []"
            @update:filteredItems="(v) => (visibleDetailRows[item.Spk] = v)"
          >
            <template #item.NoMinta="{ item: d }">
              <span class="font-weight-bold text-primary">{{ d.NoMinta }}</span>
            </template>
            <template #item.TglMinta="{ item: d }">{{
              formatTanggal(d.TglMinta)
            }}</template>
            <template #item.Komponen="{ item: d }">{{
              d.Komponen || "-"
            }}</template>
            <template #item.JmlMinta="{ item: d }">{{
              fmtNum(d.JmlMinta)
            }}</template>
            <template #item.JmlRetur="{ item: d }">{{
              fmtNum(d.JmlRetur)
            }}</template>
            <template #item.NetMinta="{ item: d }">{{
              fmtNum(d.NetMinta)
            }}</template>
            <template #item.NoMutasi="{ item: d }">{{
              d.NoMutasi || "-"
            }}</template>
            <template #item.TglMutasi="{ item: d }">{{
              formatTanggal(d.TglMutasi)
            }}</template>
            <template #item.Potong="{ item: d }">{{
              fmtNum(d.Potong)
            }}</template>
            <template #item.Berat="{ item: d }">{{ fmtNum(d.Berat) }}</template>
            <template #item.SisaBahan="{ item: d }">{{
              fmtNum(d.SisaBahan)
            }}</template>
            <template #item.Babaran="{ item: d }">{{
              fmtNum(d.Babaran, 4)
            }}</template>
            <template #item.NoMkb="{ item: d }">{{ d.NoMkb || "-" }}</template>
            <template #item.TglMkb="{ item: d }">{{
              formatTanggal(d.TglMkb)
            }}</template>
            <template #item.QtyMkb="{ item: d }">{{
              fmtNum(d.QtyMkb)
            }}</template>
            <template #item.BabaranMkb="{ item: d }">{{
              fmtNum(d.BabaranMkb)
            }}</template>
            <template #item.Supplier="{ item: d }">{{
              d.Supplier || "-"
            }}</template>
          </DetailFilterTable>

          <!-- Subtotal — sekarang ikut baris yang tampil setelah filter kolom -->
          <div v-if="detailData[item.Spk]?.length" class="dtl-subtotal-bar">
            <span class="font-weight-bold">
              Subtotal{{
                filters.namaBahan ? ` ("${filters.namaBahan}")` : ""
              }}:
            </span>
            <span class="font-weight-bold ml-2">
              Net Minta: {{ fmtNum(detailSubtotal(item.Spk).netMinta) }}
            </span>
            <span class="font-weight-bold ml-4" style="color: #e65100">
              Total LHK: {{ fmtNum(detailSubtotal(item.Spk).totalLhk) }} kg
            </span>
          </div>
        </template>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="all"
    @selected="onSpkSelected"
  />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="all"
    @selected="onBahanSelected"
  />
</template>

<style scoped>
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  margin-right: 6px;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #888;
  margin: 0 6px;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 12px;
  display: inline-block;
}
.f-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}
.f-inp {
  height: 28px;
  border: none;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  border-left: 1px solid #ccc;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 26px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  color: #1565c0;
  width: 24px;
  height: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  margin-left: 6px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  overflow: hidden;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.tr {
  text-align: right;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
.mkb-note {
  margin-top: 6px;
  font-size: 10px;
  color: #9e6b00;
  font-style: italic;
}

.dtl-subtotal td {
  background: #eceff1;
  border-top: 2px solid #90a4ae;
  padding: 6px 10px;
}
.dtl-subtotal-bar {
  display: flex;
  align-items: center;
  background: #eceff1;
  border: 1px solid #cfd8dc;
  border-top: 2px solid #90a4ae;
  border-radius: 0 0 6px 6px;
  padding: 6px 12px;
  font-size: 11px;
  margin-top: -1px;
}
</style>
