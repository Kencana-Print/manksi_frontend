<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { stokBarangJadiService } from "@/services/laporan/gudang-garmen/stokBarangJadiService";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import {
  IconBoxSeam,
  IconFileSpreadsheet,
  IconSearch,
  IconPrinter,
} from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const menuId = "506";

const filters = ref({
  gudang: "",
  namaGudang: "",
});

const masterHeaders = [
  { title: "Kode", key: "Kode", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", width: "90px" },
  { title: "Kain", key: "Kain", width: "130px" },
  { title: "Finishing", key: "Finishing", width: "110px" },
  { title: "Stok", key: "Stok", width: "100px", align: "end" },
  { title: "Gudang", key: "Gudang", width: "180px" },
  { title: "Kode Cus", key: "Kodecus", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Alamat", key: "Alamat", minWidth: "220px" },
];

const { items, isLoading, canExport, selected, isSingleSelected, fetchData } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      const res = await stokBarangJadiService.getBrowse(filters.value.gudang);
      return res.data.data;
    },
    immediate: true,
  });

watch(() => filters.value.gudang, fetchData);

// ── Lookup Gudang ──
const showGudangModal = ref(false);
const onGudangSelected = (item: any) => {
  filters.value.gudang = item.Kode;
  filters.value.namaGudang = item.Nama;
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

// ── Export ──
const isExporting = ref(false);
const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await stokBarangJadiService.getExportData(filters.value.gudang);
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Gudang", key: "Gudang", width: 20 },
      { header: "Kode", key: "Kode", width: 18 },
      { header: "Nama", key: "Nama", width: 34 },
      { header: "Ukuran", key: "Ukuran", width: 12 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Finishing", key: "Finishing", width: 16 },
      {
        header: "Stok",
        key: "Stok",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Kode Cus", key: "Kodecus", width: 12 },
      { header: "Customer", key: "Customer", width: 30 },
      { header: "Alamat", key: "Alamat", width: 40 },
    ];
    await exportExcelSingle(
      `Stok_Barang_Jadi_${filters.value.gudang || "All"}.xlsx`,
      "Stok Barang Jadi",
      columns,
      rows,
      "LAPORAN STOK BARANG JADI",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Cetak SPK — reuse SpkPrintView yang sudah ada ──
const onCetakSpk = () => {
  if (!isSingleSelected.value) return;
  const url = router.resolve({
    name: "PpicSpkPrint",
    params: { nomor: selected.value[0].Kode },
  }).href;
  window.open(url, "_blank");
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Stok Barang Jadi"
    :menu-id="menuId"
    :icon="IconBoxSeam"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    v-model:selected="selected"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Gudang</span>
      <div class="gudang-picker">
        <input
          type="text"
          :value="filters.gudang"
          readonly
          class="f-inp"
          style="width: 90px; cursor: pointer"
          placeholder="Kode"
          @click="showGudangModal = true"
        />
        <input
          type="text"
          :value="filters.namaGudang"
          readonly
          class="f-inp f-ro"
          placeholder="Kosong = All"
          style="width: 220px"
        />
        <button
          type="button"
          class="btn-lkp"
          title="Cari Gudang"
          @click="showGudangModal = true"
        >
          <IconSearch :size="13" color="#1565c0" />
        </button>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="secondary"
        class="mr-1"
        :disabled="!isSingleSelected"
        @click="onCetakSpk"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak SPK
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Stok="{ item }">
      <span :class="{ 'text-error font-weight-bold': Number(item.Stok) < 0 }">
        {{ fmtNum(item.Stok) }}
      </span>
    </template>
  </BaseBrowse>

  <GudangJadiSearchModal
    v-model="showGudangModal"
    @selected="onGudangSelected"
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
.f-inp {
  height: 28px;
  border: none;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-ro {
  background: #f5f5f5;
  color: #555;
}
.gudang-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.gudang-picker .f-inp + .f-inp {
  border-left: 1px solid #eee;
}
.btn-lkp {
  width: 26px;
  min-width: 26px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
}
</style>
