<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { browseMapService } from "@/services/laporan/gudang-garmen/browseMapService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconClipboardList, IconPrinter } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "528";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const { items, isLoading, selected, canExport, selectedItem, fetchData } =
  useBrowse({
    menuId,
    fetchApi: async () => {
      const res = await browseMapService.getBrowse(dtAwal.value, dtAkhir.value);
      return res.data.data;
    },
    immediate: true,
  });

watch([dtAwal, dtAkhir], fetchData);

const headers = [
  { title: "Nomor", key: "Nomor", width: "130px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Divisi", key: "Divisi", width: "70px" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Workshop", key: "Workshop", width: "100px" },
  { title: "Workshop SPK", key: "WorkshopSPK", width: "130px" },
  { title: "Nama", key: "Nama", width: "260px" },
  {
    title: "Berita Acara",
    key: "BeritaAcara",
    width: "100px",
    align: "center",
  },
  { title: "Kendala", key: "Kendala", width: "160px" },
  {
    title: "Tanggal Buat",
    key: "TanggalBuat",
    width: "100px",
    align: "center",
  },
  { title: "Waktu Proses", key: "WaktuProses", width: "100px", align: "right" },
  { title: "Surat Jalan", key: "SuratJalan", width: "130px" },
  { title: "Ukuran", key: "Ukuran", width: "140px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
  { title: "Gramasi", key: "Gramasi", width: "90px" },
  { title: "Kain", key: "Kain", width: "140px" },
  { title: "Finishing", key: "Finishing", width: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "right" },
  { title: "Rencana", key: "Rencana", width: "100px" },
  { title: "Salesman", key: "Salesman", width: "130px" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}-${m}-${y}`;
};
const formatTglJam = (v: string) => {
  if (!v) return "-";
  const [datePart, timePart] = String(v).split(" ");
  if (!datePart) return "-";
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return v;
  const jam = timePart ? timePart.substring(0, 5) : "";
  return jam ? `${d}-${m}-${y} ${jam}` : `${d}-${m}-${y}`;
};

// ── Export ──
const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  await exportExcelSingle(
    `Browse_MAP_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    "Browse MAP",
    [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Tipe", key: "Tipe", width: 10 },
      { header: "Divisi", key: "Divisi", width: 8 },
      { header: "Cab", key: "Cab", width: 8 },
      { header: "Workshop", key: "Workshop", width: 12 },
      { header: "Workshop SPK", key: "WorkshopSPK", width: 16 },
      { header: "Nama", key: "Nama", width: 32 },
      {
        header: "Berita Acara",
        key: "BeritaAcara",
        width: 12,
        align: "center",
      },
      { header: "Kendala", key: "Kendala", width: 20 },
      {
        header: "Tanggal Buat",
        key: "TanggalBuat",
        width: 12,
        align: "center",
      },
      { header: "Waktu Proses", key: "WaktuProses", width: 12, align: "right" },
      { header: "Surat Jalan", key: "SuratJalan", width: 16 },
      { header: "Ukuran", key: "Ukuran", width: 18 },
      { header: "Panjang", key: "Panjang", width: 10, align: "right" },
      { header: "Lebar", key: "Lebar", width: 10, align: "right" },
      { header: "Gramasi", key: "Gramasi", width: 12 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Finishing", key: "Finishing", width: 20 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Rencana", key: "Rencana", width: 14 },
      { header: "Salesman", key: "Salesman", width: 16 },
    ],
    items.value,
    `Browse MAP Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
  );
};

// ── Cetak — tanpa batas, langsung buka halaman print ──
const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/penjualan/map/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Browse MAP"
    :menu-id="menuId"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-export="canExport"
    item-value="Nomor"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl(item.Dateline)
    }}</template>
    <template #item.TanggalBuat="{ item }">{{
      formatTglJam(item.TanggalBuat)
    }}</template>
    <template #item.BeritaAcara="{ item }">
      <span
        :class="item.BeritaAcara === 'Sudah' ? 'badge-sudah' : 'badge-belum'"
        >{{ item.BeritaAcara }}</span
      >
    </template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">{{ numFmt(item.Kirim) }}</template>
    <template #item.Panjang="{ item }">{{ numFmt(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ numFmt(item.Lebar) }}</template>
    <template #item.WaktuProses="{ item }">{{
      item.WaktuProses ?? "-"
    }}</template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.badge-sudah {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.badge-belum {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
