<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { revisiMemoSpkService } from "@/services/laporan/marketing/revisiMemoSpkService";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconFileDiff, IconFileSpreadsheet } from "@tabler/icons-vue";

// MENU_ID kosong — akses ikut parent, sama pola Target vs Realisasi
const MENU_ID = "";
const toast = useToast();

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filterState = ref({
  dtAwal: toLocalDateStr(firstDayOfMonth),
  dtAkhir: toLocalDateStr(today),
});

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await revisiMemoSpkService.getBrowse(
      filterState.value.dtAwal,
      filterState.value.dtAkhir,
    );
    return res.data.data || [];
  },
});

watch(
  [() => filterState.value.dtAwal, () => filterState.value.dtAkhir],
  fetchData,
);

const rows = computed(() => items.value ?? []);

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Nama Asli", key: "NamaAsli", minWidth: "220px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Revisi Ke", key: "RevisiNo", width: "80px", align: "center" },
  { title: "Lama Hari", key: "LamaHari", width: "90px", align: "end" },
  { title: "Customer", key: "Customer", minWidth: "220px" },
  { title: "Aktif", key: "Aktif", width: "70px", align: "center" },
  { title: "Referensi", key: "Referensi", width: "150px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Note Revisi", key: "NoteRevisi", minWidth: "180px" },
  { title: "Tipe Revisi", key: "TipeRevisi", width: "90px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
];

const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// ── Export biasa — reuse utility exportExcelSingle standar project ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = rows.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Revisi_Memo_SPK_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "Revisi Memo SPK",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Nama", key: "Nama", width: 32 },
        { header: "Nama Asli", key: "NamaAsli", width: 28 },
        { header: "Divisi", key: "Divisi", width: 12 },
        { header: "Revisi Ke", key: "RevisiNo", width: 10, align: "center" },
        { header: "Lama Hari", key: "LamaHari", width: 10, align: "right" },
        { header: "Customer", key: "Customer", width: 28 },
        { header: "Aktif", key: "Aktif", width: 8, align: "center" },
        { header: "Referensi", key: "Referensi", width: 18 },
        { header: "Keterangan", key: "Keterangan", width: 24 },
        { header: "Note Revisi", key: "NoteRevisi", width: 24 },
        { header: "Tipe Revisi", key: "TipeRevisi", width: 10 },
        { header: "Tipe", key: "Tipe", width: 10 },
      ],
      dataRows.map((r) => ({
        Nomor: r.Nomor ?? "",
        Tanggal: fmtTgl(r.Tanggal),
        Nama: r.Nama ?? "",
        NamaAsli: r.NamaAsli ?? "",
        Divisi: r.Divisi ?? "",
        RevisiNo: r.RevisiNo ?? 0,
        LamaHari: r.LamaHari ?? "",
        Customer: r.Customer ?? "",
        Aktif: r.Aktif ?? "",
        Referensi: r.Referensi ?? "",
        Keterangan: r.Keterangan ?? "",
        NoteRevisi: r.NoteRevisi ?? "",
        TipeRevisi: r.TipeRevisi ?? "",
        Tipe: r.Tipe ?? "",
      })),
      `Laporan Revisi Memo SPK — ${filterState.value.dtAwal} s.d ${filterState.value.dtAkhir}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Revisi Memo SPK"
    :menu-id="MENU_ID"
    :icon="IconFileDiff"
    :headers="headers"
    :items="rows"
    :is-loading="isLoading"
    :can-export="false"
    item-value="Nomor"
    search-placeholder="Cari nomor / nama / customer..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!rows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtTgl(item.Tanggal) }}</template>
    <template #item.RevisiNo="{ item }">{{ item.RevisiNo ?? 0 }}</template>
    <template #item.LamaHari="{ item }">{{ item.LamaHari ?? "-" }}</template>
    <template #item.Aktif="{ item }">
      <span :class="item.Aktif === 'Y' ? 'badge-aktif' : 'badge-close'">
        {{ item.Aktif === "Y" ? "AKTIF" : "CLOSE" }}
      </span>
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.badge-aktif {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-close {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
  background: #ffebee;
  color: #c62828;
}
</style>
