<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { IconTruckDelivery } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  ketercapaianKomitmenKirimService,
  type KetercapaianRow,
} from "@/services/laporan/spanduk/ketercapaianKomitmenKirimService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

interface FilterState {
  dtAwal: string;
  dtAkhir: string;
  cabang: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  cabang: "",
});
const tabel = ref<LaporanTableApi<KetercapaianRow> | null>(null);

// Parameter yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
  cabang: "",
});

const { items, isLoading, canExport, fetchData } = useBrowse<KetercapaianRow>({
  menuId: "963",
  fetchApi: async () => {
    const res = await ketercapaianKomitmenKirimService.getBrowse({
      tglAwal: periodeTampil.value.awal,
      tglAkhir: periodeTampil.value.akhir,
      cabang: periodeTampil.value.cabang || undefined,
    });
    return res.data?.data ?? [];
  },
  immediate: false,
});

const itemsTampil = computed<KetercapaianRow[]>(() => items.value ?? []);

const muatData = async () => {
  const f = filter.value;
  if (!f.dtAwal || !f.dtAkhir) {
    toast.warning("Periode wajib diisi.");
    return;
  }
  if (f.dtAwal > f.dtAkhir) {
    toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
    return;
  }
  periodeTampil.value = { awal: f.dtAwal, akhir: f.dtAkhir, cabang: f.cabang };
  await fetchData();
};

const angka = (
  key: string,
  title: string,
  group: string,
  opsi: Partial<LaporanKolom> = {},
): LaporanKolom => ({
  key,
  title,
  group,
  width: 90,
  tipe: "number",
  total: true,
  align: "right",
  excelWidth: 12,
  ...opsi,
});
const pcs = (key: string, group: string): LaporanKolom =>
  angka(key, "Qty (pcs)", group);
const mtr = (key: string, group: string): LaporanKolom =>
  angka(key, "Qty (mtr)", group, { width: 100, numFmt: "#,##0.00" });
const tgl = (key: string, title: string, group: string): LaporanKolom => ({
  key,
  title,
  group,
  width: 90,
  tipe: "dateSingkat",
  excelWidth: 12,
});

// Header: satu baris per periode komitmen kirim
const columns: LaporanKolom[] = [
  { key: "Nomor", title: "Periode", width: 130, excelWidth: 16 },
  {
    key: "TglAwal",
    title: "Tgl Awal",
    width: 90,
    tipe: "dateSingkat",
    excelWidth: 12,
  },
  {
    key: "TglAkhir",
    title: "Tgl Akhir",
    width: 90,
    tipe: "dateSingkat",
    excelWidth: 12,
  },
  { key: "Cabang", title: "Cabang", width: 70, excelWidth: 9 },
  pcs("Planning_Qty", "Planning Kirim"),
  mtr("Planning_Mtr", "Planning Kirim"),
  pcs("Aktual_Qty", "Aktual Kirim"),
  mtr("Aktual_Mtr", "Aktual Kirim"),
  pcs("Stbj_Qty", "Koli/STBJ"),
  mtr("Stbj_Mtr", "Koli/STBJ"),
];

// Detail: satu baris per SO dalam periode
const detailColumns: LaporanKolom[] = [
  { key: "So_Nomor", title: "No. SO", width: 150, excelWidth: 20 },
  { key: "So_Nama", title: "Nama SO", width: 280, excelWidth: 50 },
  {
    key: "Panjang",
    title: "Panjang",
    group: "Ukuran",
    width: 70,
    tipe: "number",
    align: "right",
    excelWidth: 10,
  },
  {
    key: "Lebar",
    title: "Lebar",
    group: "Ukuran",
    width: 60,
    tipe: "number",
    align: "right",
    excelWidth: 8,
  },
  {
    key: "Qty_Order",
    title: "Qty Order (pcs)",
    width: 135,
    tipe: "number",
    align: "right",
    excelWidth: 15,
  },
  pcs("Permintaan_Qty", "Permintaan Kirim MO"),
  tgl("Permintaan_Tgl", "Tgl Kirim", "Permintaan Kirim MO"),
  pcs("Estimasi_Qty", "Estimasi Kirim Produksi"),
  mtr("Estimasi_Mtr", "Estimasi Kirim Produksi"),
  tgl("Estimasi_Tgl", "Tgl Kirim", "Estimasi Kirim Produksi"),
  pcs("Stbj_Qty", "Koli/STBJ"),
  mtr("Stbj_Mtr", "Koli/STBJ"),
  tgl("Stbj_Tgl", "Tgl STBJ", "Koli/STBJ"),
  pcs("Aktual_Qty", "Aktual Kirim"),
  mtr("Aktual_Mtr", "Aktual Kirim"),
  tgl("Aktual_Tgl", "Tgl Kirim", "Aktual Kirim"),
];

const onExport = () => {
  const p = periodeTampil.value;
  const cabang = p.cabang ? ` | Cabang: ${p.cabang}` : "";
  tabel.value?.exportToExcel({
    fileName: `Ketercapaian_Komitmen_Kirim_${p.awal}_${p.akhir}`,
    sheetName: "ketercapaian",
    judul: "LAPORAN KETERCAPAIAN KOMITMEN KIRIM",
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}${cabang}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Laporan Ketercapaian Komitmen Kirim"
    menu-id="963"
    storage-id="spanduk-ketercapaian-komitmen-kirim"
    :icon="IconTruckDelivery"
    :columns="columns"
    :detail-columns="detailColumns"
    detail-key="Detail"
    :items="itemsTampil"
    row-key="Nomor"
    satuan="Periode"
    search-placeholder="Cari periode / nomor SO / nama SO..."
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="kk-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="kk-inp" />
      <span class="kk-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="kk-inp" />

      <span class="kk-lbl kk-sep">Cabang</span>
      <select v-model="filter.cabang" class="kk-inp kk-cabang">
        <option value="">Semua</option>
        <option value="P02">P02 - Spanduk</option>
        <option value="P05">P05 - MMT</option>
      </select>
    </template>
  </LaporanTable>
</template>

<style scoped>
.kk-lbl {
  font-size: 11px;
  font-weight: 500;
}
.kk-sep {
  margin-left: 8px;
}
.kk-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.kk-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.kk-cabang {
  width: 120px;
}
</style>
