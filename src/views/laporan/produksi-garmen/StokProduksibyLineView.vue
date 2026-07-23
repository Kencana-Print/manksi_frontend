<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { stokProduksibyLineService } from "@/services/laporan/produksi-garmen/stokProduksibyLineService";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconLayoutGrid, IconFileSpreadsheet } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "564";

const lini = ref("FINISHING");
const cab = ref("P04");

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await stokProduksibyLineService.getBrowse(
      lini.value,
      cab.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([lini, cab], fetchData);

const headers = computed(() => {
  const base = [
    { title: "SPK", key: "SPK", width: "130px" },
    { title: "Divisi", key: "Divisi", width: "90px" },
    { title: "Tgl SPK", key: "TglSPK", width: "95px", align: "center" },
    { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
    { title: "Nama SPK", key: "NamaSPK", minWidth: "260px" },
    { title: "Qty SPK", key: "QtySPK", width: "90px", align: "right" },
  ];
  if (lini.value === "FINISHING") {
    return [
      ...base,
      { title: "Jahit", key: "Jahit", width: "90px", align: "right" },
      { title: "Cmt", key: "Cmt", width: "90px", align: "right" },
      { title: "Finishing", key: "Finishing", width: "90px", align: "right" },
      { title: "Stok", key: "Stok", width: "90px", align: "right" },
    ];
  }
  return [
    ...base,
    { title: "Finishing", key: "Finishing", width: "90px", align: "right" },
    { title: "STBJ", key: "Stbj", width: "90px", align: "right" },
    { title: "Stok", key: "Stok", width: "90px", align: "right" },
  ];
});

const numFmt = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Export ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const baseCols: ExcelColumn[] = [
      { header: "SPK", key: "SPK", width: 16 },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Tgl SPK", key: "TglSPK", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Nama SPK", key: "NamaSPK", width: 32 },
      {
        header: "Qty SPK",
        key: "QtySPK",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    const extraCols: ExcelColumn[] =
      lini.value === "FINISHING"
        ? [
            {
              header: "Jahit",
              key: "Jahit",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Cmt",
              key: "Cmt",
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
              header: "Stok",
              key: "Stok",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
          ]
        : [
            {
              header: "Finishing",
              key: "Finishing",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "STBJ",
              key: "Stbj",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
            {
              header: "Stok",
              key: "Stok",
              width: 12,
              align: "right",
              numFmt: "#,##0",
            },
          ];
    await exportExcelSingle(
      `Stok_Produksi_${lini.value}_${cab.value}.xlsx`,
      "Stok Produksi",
      [...baseCols, ...extraCols],
      list,
      `Stok Produksi by Line — ${lini.value} — Cabang ${cab.value}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Stok Produksi by Line"
    :menu-id="menuId"
    :icon="IconLayoutGrid"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="SPK"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Stok Produksi</span>
        <select v-model="lini" class="f-select">
          <option value="FINISHING">FINISHING</option>
          <option value="KOLI">KOLI</option>
        </select>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cab" class="f-select">
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="green"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.TglSPK="{ item }">{{
      formatTanggal(item.TglSPK)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.QtySPK="{ item }">{{ numFmt(item.QtySPK) }}</template>
    <template #item.Jahit="{ item }">{{ numFmt(item.Jahit) }}</template>
    <template #item.Cmt="{ item }">{{ numFmt(item.Cmt) }}</template>
    <template #item.Finishing="{ item }">{{ numFmt(item.Finishing) }}</template>
    <template #item.Stbj="{ item }">{{ numFmt(item.Stbj) }}</template>
    <template #item.Stok="{ item }">
      <span :class="{ 'text-neg': Number(item.Stok) < 0 }">{{
        numFmt(item.Stok)
      }}</span>
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
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.text-neg {
  color: #c62828;
  font-weight: 700;
}
</style>
