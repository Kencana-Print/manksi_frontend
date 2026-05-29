<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { penawaranVsMapService } from "@/services/laporan/marketing/penawaranVsMapService";

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

// Fungsi untuk mencegah timezone issue (mencegah tanggal mundur)
const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dtAwal = ref(formatDateLocal(firstDay));
const dtAkhir = ref(formatDateLocal(today));

const filterState = ref({
  startDate: dtAwal.value,
  endDate: dtAkhir.value,
});

// Sinkronisasi dari State Session ke UI
watch(
  filterState,
  (newVal) => {
    if (newVal.startDate) dtAwal.value = newVal.startDate;
    if (newVal.endDate) dtAkhir.value = newVal.endDate;
  },
  { deep: true },
);

const headers = [
  { title: "PERUSAHAAN", key: "pen_perush_kode", width: "100px" },
  { title: "TANGGAL", key: "pen_tanggal", width: "120px" },
  { title: "KODE CUS", key: "pen_cus_kode", width: "100px" },
  { title: "NAMA CUSTOMER", key: "cus_nama", minWidth: "250px" },
  { title: "KODE SAL", key: "pen_sal_kode", width: "100px" },
  { title: "NAMA SALES", key: "sal_nama", width: "150px" },
  { title: "NO PENAWARAN", key: "pen_nomor", width: "150px" },
  { title: "ID PEND", key: "pend_id", width: "80px" },
  { title: "NAMA BARANG", key: "pend_nama_barang", minWidth: "250px" },
  { title: "BAHAN", key: "pend_bahan", width: "180px" },
  { title: "UKURAN", key: "pend_ukuran", width: "100px" },
  { title: "PANJANG", key: "pend_panjang", align: "end", width: "90px" },
  { title: "LEBAR", key: "pend_lebar", align: "end", width: "90px" },
  { title: "SATUAN", key: "pend_satuan", width: "90px" },
  { title: "QTY", key: "pend_qty", align: "end", width: "80px" },
  { title: "HARGA", key: "pend_harga", align: "end", width: "100px" },
  { title: "STATUS", key: "pend_status", width: "100px" },
  { title: "NO MAP", key: "mspk_nomor", width: "150px" },
  { title: "TANGGAL MAP", key: "mspk_tanggal", width: "120px" },
  { title: "NAMA MAP", key: "mspk_nama", minWidth: "200px" },
  { title: "JUMLAH MAP", key: "mspk_jumlah", align: "end", width: "120px" },
  {
    title: "RENCANA ORDER",
    key: "mspk_rencana_order",
    align: "end",
    width: "120px",
  },
  { title: "HARGA MAP", key: "mspk_harga", align: "end", width: "120px" },
];

const fetchApi = async () => {
  const response = await penawaranVsMapService.getBrowse({
    startDate: filterState.value.startDate,
    endDate: filterState.value.endDate,
  });
  return response.data?.data || response.data || [];
};

const { items, isLoading, fetchData, exportToExcel } = useBrowse({
  menuId: "966",
  fetchApi,
  immediate: false,
});

onMounted(() => {
  fetchData();
});

// Sinkronisasi Input ke State Filter
watch([dtAwal, dtAkhir], () => {
  filterState.value.startDate = dtAwal.value;
  filterState.value.endDate = dtAkhir.value;
  fetchData();
});

const formatNumber = (val: any) => {
  if (!val || isNaN(val)) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
</script>

<template>
  <BaseBrowse
    title="Penawaran vs MAP"
    menu-id="966"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="pen_nomor"
    v-model:filter-state="filterState"
    can-export
    @export="exportToExcel('Penawaran_vs_MAP')"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="filter-group">
        <input
          type="date"
          v-model="dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s.d</span>
        <input
          type="date"
          v-model="dtAkhir"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #item.pen_tanggal="{ item }">
      {{ formatDate(item.pen_tanggal) }}
    </template>
    <template #item.mspk_tanggal="{ item }">
      {{ formatDate(item.mspk_tanggal) }}
    </template>
    <template #item.pend_qty="{ item }">
      {{ formatNumber(item.pend_qty) }}
    </template>
    <template #item.pend_harga="{ item }">
      {{ formatNumber(item.pend_harga) }}
    </template>
    <template #item.mspk_rencana_order="{ item }">
      {{ formatNumber(item.mspk_rencana_order) }}
    </template>
    <template #item.mspk_jumlah="{ item }">
      {{ formatNumber(item.mspk_jumlah) }}
    </template>
    <template #item.mspk_harga="{ item }">
      {{ formatNumber(item.mspk_harga) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-sep {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 4px;
}
.date-inp {
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  cursor: pointer;
}
.date-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
