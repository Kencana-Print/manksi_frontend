<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bastService } from "@/services/garmen/bastService";
import * as XLSX from "xlsx";
import { IconPrinter, IconFileSpreadsheet } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const menuId = "117";

const getLocalDate = () => new Date().toISOString().substring(0, 10);

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  onProgress: false,
});

const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      // MENGGUNAKAN SERVICE
      const res = await bastService.getBrowseList({
        startDate: filterState.value.startDate,
        endDate: filterState.value.endDate,
        onProgress: filterState.value.onProgress,
      });
      return res.data.data || [];
    },
    immediate: true,
  });

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Status BAST", key: "CetakBAST", width: "100px", align: "center" },
  { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "250px" },
  { title: "Nama Ext", key: "NamaExt", width: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "150px" },
  { title: "Gramasi", key: "Gramasi", width: "130px" },
  { title: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: "150px" },
  { title: "Kain", key: "Kain", width: "180px" },
  { title: "Finishing", key: "Finishing", width: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "Kendala", key: "kendalaProduksi", width: "200px" },
];

const getRowTextColor = (item: any) => {
  const row = item?.raw || item;
  // Delphi logic: OnProgres='N' -> Red, OnProgres='Y' -> Blue
  if (row.OnProgres === "N") return "text-red-darken-2";
  if (row.OnProgres === "Y") return "text-blue-darken-2";
  return "";
};

// ── AKSI ──
const goAdd = () => router.push({ name: "CetakBastFormCreate" });
const goEdit = (item: any) =>
  router.push({ name: "CetakBastFormEdit", params: { nomor: item.Nomor } });

const goDelete = async (item: any) => {
  if (!confirm(`Yakin hapus BAST untuk MAP ${item.Nomor}?`)) return;
  try {
    // MENGGUNAKAN SERVICE
    await bastService.deleteBast(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const cetak = () => {
  if (selected.value.length === 0) return;
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/cetak-bast/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const exportExcel = (isDetail = false) => {
  const data = items.value;
  const worksheet = XLSX.utils.json_to_sheet(data ?? []);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BAST");
  XLSX.writeFile(
    workbook,
    `cetak_bast_${isDetail ? "detail_" : ""}${new Date().getTime()}.xlsx`,
  );
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
</script>

<template>
  <BaseBrowse
    title="Cetak BAST MAP"
    :menu-id="menuId"
    :icon="IconPrinter"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :row-text-color-fn="getRowTextColor"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="exportExcel(false)"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal MAP</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
      </div>

      <v-checkbox
        v-model="filterState.onProgress"
        label="Tampilkan saja BAST MAP On Progress"
        density="compact"
        hide-details
        class="ml-4 cust-cb"
        @change="fetchData"
      ></v-checkbox>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= On Progress</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-blue"></div>
          <span>= Sudah Approval</span>
        </div>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="green-darken-1"
        @click="exportExcel(true)"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.CetakBAST="{ item }">
      <v-chip
        v-if="item.CetakBAST"
        color="success"
        size="x-small"
        label
        class="font-weight-bold"
        >SUDAH</v-chip
      >
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 500;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.bg-red {
  background-color: #d32f2f;
}
.bg-blue {
  background-color: #1976d2;
}

/* Menyesuaikan ukuran font checkbox agar serasi */
.cust-cb :deep(.v-label) {
  font-size: 11px !important;
  font-weight: 600;
  opacity: 1;
  color: #333;
}
.cust-cb :deep(.v-selection-control) {
  min-height: unset;
}
</style>
