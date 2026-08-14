<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { lhkSoDtfService } from "@/services/garmen/lhkSoDtfService";
import { lhkSoDtfFormService } from "@/services/garmen/lhkSoDtfFormService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconClipboardList,
  IconPrinter,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();

// ⚠️ Default filter AWAL BULAN s.d. HARI INI — beda dengan SO DTF/DTG
// browse (yang defaultnya hari-ini s.d. hari-ini). Sesuai spesifikasi.
const getLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const today = new Date();
const awalBulan = new Date(today.getFullYear(), today.getMonth(), 1);

const filterState = ref({
  startDate: getLocalDate(awalBulan),
  endDate: getLocalDate(today),
  cab: "ALL",
});

const listCab = ["ALL", "P01", "P02", "P04", "P05"]; // TODO: ganti fetch dinamis kalau ada master workshop

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "123",
  fetchApi: async () => {
    const res = await lhkSoDtfService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cab,
    );
    return (res.data.data.rows || []).map((r: any) => ({
      ...r,
      _rowKey: `${r.SPK}__${r.Cab}__${r.Tanggal}`,
    }));
  },
});

const num = (v: any) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const summaryFormatters = {
  // Label "TOTAL :" ditempatkan pada kolom "NamaOrder" (sebelah kiri kolom Depan)
  NamaOrder: () => "TOTAL :",
  Depan: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Depan) || 0), 0)),
  Belakang: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Belakang) || 0), 0)),
  Lengan: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Lengan) || 0), 0)),
  Variasi: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Variasi) || 0), 0)),
  Saku: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Saku) || 0), 0)),
  PanjangM: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.PanjangM) || 0), 0)),
  Buangan: (items: any[]) =>
    num(items.reduce((sum, item) => sum + (Number(item.Buangan) || 0), 0)),
};

const headers = [
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "SPK", key: "SPK", width: "160px" },
  { title: "Nama Order", key: "NamaOrder", minWidth: "220px" },
  { title: "Depan", key: "Depan", width: "80px", align: "right" },
  { title: "Belakang", key: "Belakang", width: "80px", align: "right" },
  { title: "Lengan", key: "Lengan", width: "80px", align: "right" },
  { title: "Variasi", key: "Variasi", width: "80px", align: "right" },
  { title: "Saku", key: "Saku", width: "70px", align: "right" },
  { title: "Panjang (M)", key: "PanjangM", width: "90px", align: "right" },
  { title: "Buangan", key: "Buangan", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
];

// --- BARU / UBAH — form belum tersedia, tombol tetap muncul sesuai flag akses ---
const onAdd = async () => {
  try {
    const res = await lhkSoDtfFormService.getDefaultCab(filterState.value.cab);
    router.push({
      name: "LhkSoDtfForm",
      query: { cab: res.data.data.cab, tanggal: getLocalDate() },
    });
  } catch {
    toast.error("Gagal menentukan cabang default.");
  }
};

const onEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: "LhkSoDtfForm",
    query: {
      cab: selectedItem.value.Cab,
      tanggal: String(selectedItem.value.Tanggal).substring(0, 10),
    },
  });
};

// --- HAPUS ---
const onDelete = async (item: any) => {
  try {
    const tanggalMurni = String(item.Tanggal).substring(0, 10);
    await lhkSoDtfService.deleteData(item.SPK, item.Cab, tanggalMurni);
    toast.success("Data LHK berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

// --- CETAK — belum ada print view, placeholder ---
const onPrint = () => {
  if (!selectedItem.value) return;
  toast.info("Fitur cetak LHK SO DTF/DTG belum tersedia — menyusul.");
};

// --- EXPORT (ringkas) ---
const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");

  const columns = [
    { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
    { header: "Cab", key: "Cab", width: 10, align: "center" },
    { header: "SPK", key: "SPK", width: 20 },
    { header: "Nama Order", key: "NamaOrder", width: 32 },
    {
      header: "Depan",
      key: "Depan",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Belakang",
      key: "Belakang",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Lengan",
      key: "Lengan",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Variasi",
      key: "Variasi",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "Saku", key: "Saku", width: 10, align: "right", numFmt: "#,##0" },
    {
      header: "Panjang (M)",
      key: "PanjangM",
      width: 12,
      align: "right",
      numFmt: "#,##0.0",
    },
    {
      header: "Buangan",
      key: "Buangan",
      width: 10,
      align: "right",
      numFmt: "#,##0.0",
    },
  ];

  await exportExcelSingle(
    `LHK_SO_DTF_${filterState.value.startDate}_${filterState.value.endDate}.xlsx`,
    "LHK SO DTF",
    columns,
    items.value,
    `LHK SO DTF/DTG Periode ${filterState.value.startDate} s/d ${filterState.value.endDate}`,
  );
};

// --- EXPORT DETAIL ---
// ⚠️ ASUMSI: karena Delphi tidak punya handler eksplisit untuk tombol
// ini (kemungkinan generic dari base class TfrmCxBrowse yang belum
// di-share), diasumsikan "Export Detail" = export dengan kolom
// Keterangan penuh (tanpa dipotong) dan tambahan Total Titik/kalkulasi
// per baris. Mohon koreksi kalau maksud aslinya beda.
const onExportDetail = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");

  const columns = [
    { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
    { header: "Cab", key: "Cab", width: 10, align: "center" },
    { header: "SPK", key: "SPK", width: 20 },
    { header: "Nama Order", key: "NamaOrder", width: 32 },
    {
      header: "Depan",
      key: "Depan",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Belakang",
      key: "Belakang",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Lengan",
      key: "Lengan",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Variasi",
      key: "Variasi",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "Saku", key: "Saku", width: 10, align: "right", numFmt: "#,##0" },
    {
      header: "Panjang (M)",
      key: "PanjangM",
      width: 12,
      align: "right",
      numFmt: "#,##0.0",
    },
    {
      header: "Buangan",
      key: "Buangan",
      width: 10,
      align: "right",
      numFmt: "#,##0.0",
    },
    { header: "Keterangan", key: "Keterangan", width: 40 },
  ];

  await exportExcelSingle(
    `LHK_SO_DTF_Detail_${filterState.value.startDate}_${filterState.value.endDate}.xlsx`,
    "LHK SO DTF Detail",
    columns,
    items.value,
    `LHK SO DTF/DTG (Detail) Periode ${filterState.value.startDate} s/d ${filterState.value.endDate}`,
  );
};
</script>

<template>
  <BaseBrowse
    title="LHK SO DTF/DTG"
    menu-id="123"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="_rowKey"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    @add="onAdd"
    @edit="onEdit"
    :summary-columns="[
      'Depan',
      'Belakang',
      'Lengan',
      'Variasi',
      'Saku',
      'PanjangM',
      'Buangan',
    ]"
    :summary-formatters="summaryFormatters"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Cab</span>
        <select v-model="filterState.cab" class="f-select" @change="fetchData">
          <option v-for="c in listCab" :key="c" :value="c">
            {{ c === "ALL" ? "SEMUA CABANG" : c }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Depan="{ item }">{{ num(item.Depan) }}</template>
    <template #item.Belakang="{ item }">{{ num(item.Belakang) }}</template>
    <template #item.Lengan="{ item }">{{ num(item.Lengan) }}</template>
    <template #item.Variasi="{ item }">{{ num(item.Variasi) }}</template>
    <template #item.Saku="{ item }">{{ num(item.Saku) }}</template>
    <template #item.PanjangM="{ item }">{{ num(item.PanjangM) }}</template>
    <template #item.Buangan="{ item }">{{ num(item.Buangan) }}</template>

    <template #extra-actions="{ selected: sel }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="sel.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn size="small" color="teal-darken-2" @click="onExportDetail">
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
  outline: none;
  background: white;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
</style>
